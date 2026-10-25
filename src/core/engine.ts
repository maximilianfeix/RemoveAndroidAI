import { assertPackageName, readDeviceInfo, readFreeBytes, readPackageSizes, readPackageStates } from "./device.js";
import type { DeviceInfo, FoundPackage, Journal, PackageEntry, Shell, StepResult, Vendor } from "./types.js";

const VENDOR_HINTS: Record<Vendor, RegExp> = {
  google: /.*/,
  samsung: /samsung/i,
  xiaomi: /xiaomi|redmi|poco/i,
  motorola: /motorola|moto/i,
  oplus: /oneplus|oppo|realme/i,
};

/** Google packages ship on every vendor; the others only on their own phones. */
export function vendorMatches(vendor: Vendor, device: DeviceInfo): boolean {
  return VENDOR_HINTS[vendor].test(`${device.manufacturer} ${device.brand}`);
}

export interface Scan {
  device: DeviceInfo;
  freeBytes: number;
  found: FoundPackage[];
}

export async function scan(shell: Shell, serial: string, catalog: PackageEntry[]): Promise<Scan> {
  const device = await readDeviceInfo(shell, serial);
  const states = await readPackageStates(shell);
  const sizes = await readPackageSizes(shell);
  const freeBytes = await readFreeBytes(shell);
  const found: FoundPackage[] = [];
  for (const entry of catalog) {
    if (!vendorMatches(entry.vendor, device)) continue;
    const state = states.get(entry.package);
    if (!state) continue;
    found.push({ entry, state, sizeBytes: sizes.get(entry.package) ?? -1 });
  }
  return { device, freeBytes, found };
}

export interface SelectOptions {
  includeCaution: boolean;
}

/** What a plain run turns off: enabled packages of tier "safe", plus "caution" when asked. Never "never". */
export function defaultSelection(found: FoundPackage[], opts: SelectOptions): FoundPackage[] {
  return found.filter(
    (f) => f.state === "enabled" && (f.entry.tier === "safe" || (opts.includeCaution && f.entry.tier === "caution")),
  );
}

export function newJournal(device: DeviceInfo): Journal {
  return { tool: "RemoveAndroidAI", version: 1, device, records: [] };
}

const succeeded = {
  disable: (out: string) => /new state:\s*disabled/i.test(out),
  enable: (out: string) => /new state:\s*(enabled|default)/i.test(out),
  clear: (out: string) => /^\s*Success\s*$/m.test(out),
};

/**
 * Turns off each target with `pm disable-user` and, for entries marked clearData,
 * deletes its downloaded data with `pm clear`. Every change is written to the journal
 * before the next one starts, so a crash halfway still leaves an accurate undo record.
 */
export async function apply(
  shell: Shell,
  journal: Journal,
  targets: FoundPackage[],
  onStep?: (r: StepResult) => void,
): Promise<StepResult[]> {
  const results: StepResult[] = [];
  const report = (r: StepResult) => {
    results.push(r);
    onStep?.(r);
  };
  for (const target of targets) {
    if (target.entry.tier === "never") throw new Error(`${target.entry.package} is marked "never" and can't be turned off`);
    const pkg = assertPackageName(target.entry.package);
    const out = await shell.run(`pm disable-user --user 0 ${pkg}`);
    const disabled = succeeded.disable(out);
    report({ package: pkg, ok: disabled, action: "disable", output: out.trim() });
    if (!disabled) continue;
    const record = { package: pkg, before: target.state, disabled: true, cleared: false, at: new Date().toISOString() };
    journal.records.push(record);
    if (target.entry.clearData) {
      const clearOut = await shell.run(`pm clear --user 0 ${pkg}`);
      record.cleared = succeeded.clear(clearOut);
      report({ package: pkg, ok: record.cleared, action: "clear", output: clearOut.trim() });
    }
  }
  return results;
}

/**
 * Turns every package in the journal back on. Data deleted with `pm clear` is not
 * restored; the app downloads its models again when it needs them.
 */
export async function undo(shell: Shell, journal: Journal, onStep?: (r: StepResult) => void): Promise<StepResult[]> {
  const results: StepResult[] = [];
  const seen = new Set<string>();
  for (const record of [...journal.records].reverse()) {
    if (!record.disabled || record.before !== "enabled" || seen.has(record.package)) continue;
    seen.add(record.package);
    const pkg = assertPackageName(record.package);
    const out = await shell.run(`pm enable --user 0 ${pkg}`);
    const r: StepResult = { package: pkg, ok: succeeded.enable(out), action: "enable", output: out.trim() };
    results.push(r);
    onStep?.(r);
  }
  return results;
}

export function formatBytes(bytes: number): string {
  if (bytes < 0) return "unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1000 && i < units.length - 1) {
    v /= 1000;
    i++;
  }
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}
