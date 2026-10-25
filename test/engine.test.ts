import { describe, expect, it } from "vitest";
import { assertPackageName, parseDfFree, parseDiskstats } from "../src/core/device.js";
import { apply, defaultSelection, formatBytes, newJournal, scan, undo, vendorMatches } from "../src/core/engine.js";
import type { PackageEntry } from "../src/core/types.js";
import { FakeDevice, GB, pixel } from "./fake-device.js";

const entry = (pkg: string, tier: PackageEntry["tier"], extra: Partial<PackageEntry> = {}): PackageEntry => ({
  vendor: "google",
  package: pkg,
  label: pkg,
  what: "test",
  tier,
  uad: "Recommended",
  breaks: "",
  clearData: true,
  sources: ["https://example.com"],
  ...extra,
});

const catalog: PackageEntry[] = [
  entry("com.example.ai.safe", "safe"),
  entry("com.example.ai.caution", "caution", { breaks: "Live Caption" }),
  entry("com.example.ai.never", "never"),
  entry("com.example.ai.locked", "safe"),
  entry("com.example.ai.off", "safe"),
  entry("com.example.ai.absent", "safe"),
  entry("com.example.samsung.ai", "safe", { vendor: "samsung" }),
];

describe("parsers", () => {
  it("reads free space from toybox df", () => {
    expect(parseDfFree("Filesystem 1K-blocks Used Available Use% Mounted on\n/dev/block/dm-1 100 40 60 40% /data\n")).toBe(
      60 * 1024,
    );
    expect(parseDfFree("df: /data: Permission denied")).toBe(-1);
  });

  it("sums code, data and cache per package from diskstats", () => {
    const out = 'Package Names: ["a.b","c.d"]\nApp Sizes: [1,2]\nApp Data Sizes: [10,20]\nCache Sizes: [100,-1]\n';
    expect(parseDiskstats(out)).toEqual(new Map([["a.b", 111], ["c.d", 22]]));
    expect(parseDiskstats("garbage").size).toBe(0);
  });

  it("refuses package names that could inject shell", () => {
    expect(assertPackageName("com.google.android.aicore")).toBe("com.google.android.aicore");
    for (const bad of ["com.x;reboot", "com.x && rm -rf /", "x", "../etc", "com.x\nreboot", "com.$(id)"])
      expect(() => assertPackageName(bad)).toThrow();
  });

  it("formats bytes the way a phone's storage page does", () => {
    expect(formatBytes(7_100_000_000)).toBe("7.1 GB");
    expect(formatBytes(512)).toBe("512 B");
    expect(formatBytes(-1)).toBe("unknown");
  });
});

describe("scan and select", () => {
  it("finds only installed packages for this vendor", async () => {
    const s = await scan(pixel(), "EMU0001", catalog);
    expect(s.device.model).toBe("Pixel 9");
    expect(s.device.sdk).toBe(36);
    expect(s.freeBytes).toBeGreaterThan(39 * GB);
    expect(s.found.map((f) => f.entry.package)).toEqual([
      "com.example.ai.safe",
      "com.example.ai.caution",
      "com.example.ai.never",
      "com.example.ai.locked",
      "com.example.ai.off",
    ]);
    expect(s.found[0].sizeBytes).toBe(7 * GB);
  });

  it("selects safe by default, caution only on request, never and already-off never", async () => {
    const s = await scan(pixel(), "EMU0001", catalog);
    const pick = (includeCaution: boolean) => defaultSelection(s.found, { includeCaution }).map((f) => f.entry.package);
    expect(pick(false)).toEqual(["com.example.ai.safe", "com.example.ai.locked"]);
    expect(pick(true)).toEqual(["com.example.ai.safe", "com.example.ai.caution", "com.example.ai.locked"]);
  });

  it("matches vendor packages by manufacturer or brand", () => {
    const d = { serial: "", manufacturer: "samsung", brand: "samsung", model: "", release: "", sdk: 35 };
    expect(vendorMatches("samsung", d)).toBe(true);
    expect(vendorMatches("google", d)).toBe(true);
    expect(vendorMatches("xiaomi", { ...d, manufacturer: "Xiaomi", brand: "Redmi" })).toBe(true);
    expect(vendorMatches("xiaomi", d)).toBe(false);
  });
});

describe("apply and undo", () => {
  it("disables, clears, frees space and journals each change", async () => {
    const phone = pixel();
    const s = await scan(phone, "EMU0001", catalog);
    const journal = newJournal(s.device);
    const results = await apply(phone, journal, defaultSelection(s.found, { includeCaution: false }));

    expect(phone.packages["com.example.ai.safe"].enabled).toBe(false);
    expect(phone.freeBytes).toBe(40 * GB + 6.9 * GB);
    // The protected package fails cleanly and is not journaled.
    expect(results.find((r) => r.package === "com.example.ai.locked")).toMatchObject({ ok: false, action: "disable" });
    expect(journal.records).toHaveLength(1);
    expect(journal.records[0]).toMatchObject({ package: "com.example.ai.safe", before: "enabled", disabled: true, cleared: true });
    expect(phone.packages["com.android.settings"].enabled).toBe(true);
  });

  it("does not run pm clear for entries without clearData", async () => {
    const phone = pixel();
    const s = await scan(phone, "EMU0001", [entry("com.example.ai.safe", "safe", { clearData: false })]);
    await apply(phone, newJournal(s.device), s.found);
    expect(phone.log.filter((c) => c.startsWith("pm clear"))).toEqual([]);
    expect(phone.packages["com.example.ai.safe"].dataBytes).toBe(6.9 * GB);
  });

  it("refuses never-tier packages even when passed in directly", async () => {
    const phone = pixel();
    const s = await scan(phone, "EMU0001", catalog);
    const never = s.found.filter((f) => f.entry.tier === "never");
    await expect(apply(phone, newJournal(s.device), never)).rejects.toThrow(/never/);
    expect(phone.packages["com.example.ai.never"].enabled).toBe(true);
  });

  it("undo turns back on exactly what was turned off, and leaves user-disabled apps alone", async () => {
    const phone = pixel();
    const s = await scan(phone, "EMU0001", catalog);
    const journal = newJournal(s.device);
    await apply(phone, journal, defaultSelection(s.found, { includeCaution: true }));
    const results = await undo(phone, journal);
    expect(results.every((r) => r.ok)).toBe(true);
    expect(phone.packages["com.example.ai.safe"].enabled).toBe(true);
    expect(phone.packages["com.example.ai.caution"].enabled).toBe(true);
    expect(phone.packages["com.example.ai.off"].enabled).toBe(false);
  });

  it("a second undo is harmless", async () => {
    const phone = pixel();
    const s = await scan(phone, "EMU0001", catalog);
    const journal = newJournal(s.device);
    await apply(phone, journal, defaultSelection(s.found, { includeCaution: false }));
    await undo(phone, journal);
    const again = await undo(phone, journal);
    expect(again.every((r) => r.ok)).toBe(true);
  });

  it("stops treating unknown output as success", async () => {
    const phone = new FakeDevice({}, {}, 0);
    phone.run = async () => "something unexpected";
    const journal = newJournal({ serial: "x", manufacturer: "Google", brand: "google", model: "", release: "", sdk: 36 });
    const r = await apply(phone, journal, [{ entry: entry("com.example.ai.safe", "safe"), state: "enabled", sizeBytes: 0 }]);
    expect(r[0].ok).toBe(false);
    expect(journal.records).toHaveLength(0);
  });
});
