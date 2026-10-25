import { describe, expect, it } from "vitest";
import catalogJson from "../data/packages.json";
import { assertPackageName } from "../src/core/device.js";
import type { PackageEntry } from "../src/core/types.js";

const catalog = catalogJson as PackageEntry[];

describe("data/packages.json", () => {
  it("has unique, shell-safe package names", () => {
    const names = catalog.map((p) => p.package);
    expect(new Set(names).size).toBe(names.length);
    for (const n of names) expect(assertPackageName(n)).toBe(n);
  });

  it("gives every entry a source, a reason and a known tier, vendor and UAD level", () => {
    for (const p of catalog) {
      expect(p.sources.length, p.package).toBeGreaterThan(0);
      for (const s of p.sources) expect(s, p.package).toMatch(/^https:\/\//);
      expect(["safe", "caution", "never"]).toContain(p.tier);
      expect(["google", "samsung", "xiaomi", "motorola", "oplus"]).toContain(p.vendor);
      expect(["Recommended", "Advanced", "Expert", "Unsafe", "absent"]).toContain(p.uad);
      expect(p.label && p.what && p.breaks, p.package).toBeTruthy();
    }
  });

  it("never marks a package safe that UAD-ng calls Expert/Unsafe or doesn't know", () => {
    for (const p of catalog.filter((p) => p.tier === "safe")) expect(["Recommended", "Advanced"], p.package).toContain(p.uad);
  });

  it("keeps known dangerous packages in the never tier", () => {
    const tier = (n: string) => catalog.find((p) => p.package === n)?.tier;
    expect(tier("com.samsung.android.honeyboard")).toBe("never");
    expect(tier("com.android.settings.intelligence")).toBe("never");
    expect(tier("com.samsung.android.callassistant")).toBe("never");
  });

  it("never lists core system packages", () => {
    const forbidden = ["android", "com.android.systemui", "com.android.settings", "com.android.phone", "com.google.android.gms", "com.android.vending", "com.google.android.gsf"];
    for (const f of forbidden) expect(catalog.some((p) => p.package === f), f).toBe(false);
  });
});
