import type { DeviceInfo, PackageState, Shell } from "./types.js";

const PACKAGE_NAME = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;

/** Package names are interpolated into shell commands, so only plain names pass. */
export function assertPackageName(name: string): string {
  if (!PACKAGE_NAME.test(name)) throw new Error(`refusing unsafe package name: ${JSON.stringify(name)}`);
  return name;
}

export async function readDeviceInfo(shell: Shell, serial: string): Promise<DeviceInfo> {
  const prop = async (key: string) => (await shell.run(`getprop ${key}`)).trim();
  return {
    serial,
    manufacturer: await prop("ro.product.manufacturer"),
    brand: await prop("ro.product.brand"),
    model: await prop("ro.product.model"),
    release: await prop("ro.build.version.release"),
    sdk: Number.parseInt(await prop("ro.build.version.sdk"), 10) || -1,
  };
}

export function parsePackageList(output: string): Set<string> {
  const names = new Set<string>();
  for (const line of output.split(/\r?\n/)) {
    const m = /^package:(\S+)/.exec(line.trim());
    if (m) names.add(m[1]);
  }
  return names;
}

/** State of every package for user 0: installed and enabled, disabled, or not installed for the user. */
export async function readPackageStates(shell: Shell): Promise<Map<string, PackageState>> {
  const installed = parsePackageList(await shell.run("pm list packages --user 0"));
  const disabled = parsePackageList(await shell.run("pm list packages -d --user 0"));
  const states = new Map<string, PackageState>();
  for (const name of installed) states.set(name, disabled.has(name) ? "disabled" : "enabled");
  return states;
}

/** Free bytes on /data from `df -k /data`. -1 when the output can't be read. */
export function parseDfFree(output: string): number {
  const lines = output.trim().split(/\r?\n/).filter((l) => l.trim() !== "");
  const last = lines.at(-1)?.trim().split(/\s+/) ?? [];
  // Filesystem 1K-blocks Used Available Use% Mounted-on
  if (last.length < 6) return -1;
  const avail = Number.parseInt(last[3], 10);
  return Number.isFinite(avail) ? avail * 1024 : -1;
}

export async function readFreeBytes(shell: Shell): Promise<number> {
  return parseDfFree(await shell.run("df -k /data"));
}

function parseArray(output: string, label: string): unknown[] | undefined {
  const m = new RegExp(`^${label}: (\\[.*\\])\\s*$`, "m").exec(output);
  if (!m) return undefined;
  try {
    const value: unknown = JSON.parse(m[1]);
    return Array.isArray(value) ? value : undefined;
  } catch {
    return undefined;
  }
}

/**
 * Per-package bytes (code + data + cache) from `dumpsys diskstats`.
 * Android refreshes these numbers about once a day, so they are an estimate of
 * what a package holds, not a live measurement.
 */
export function parseDiskstats(output: string): Map<string, number> {
  const sizes = new Map<string, number>();
  const names = parseArray(output, "Package Names");
  if (!names) return sizes;
  const parts = ["App Sizes", "App Data Sizes", "Cache Sizes"].map((l) => parseArray(output, l));
  names.forEach((name, i) => {
    if (typeof name !== "string") return;
    let total = 0;
    for (const part of parts) {
      const v = part?.[i];
      if (typeof v === "number" && v > 0) total += v;
    }
    sizes.set(name, total);
  });
  return sizes;
}

export async function readPackageSizes(shell: Shell): Promise<Map<string, number>> {
  return parseDiskstats(await shell.run("dumpsys diskstats"));
}
