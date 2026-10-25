export type Tier = "safe" | "caution" | "never";

/** "oplus" covers OnePlus, Oppo and Realme, which share ColorOS packages. */
export type Vendor = "google" | "samsung" | "xiaomi" | "motorola" | "oplus";

/** One entry of data/packages.json. Every entry carries at least one source URL. */
export interface PackageEntry {
  vendor: Vendor;
  package: string;
  label: string;
  what: string;
  tier: Tier;
  /** Universal Android Debloater (next generation) removal level, or "absent" when it doesn't list the package. */
  uad: "Recommended" | "Advanced" | "Expert" | "Unsafe" | "absent";
  /** What else stops working when this package is off. Empty for "safe". */
  breaks: string;
  /** Turn off with `pm clear` as well, so the downloaded models are deleted. */
  clearData: boolean;
  sources: string[];
}

/** Runs one shell command on the phone and returns stdout+stderr as text. */
export interface Shell {
  run(command: string): Promise<string>;
}

export interface DeviceInfo {
  serial: string;
  manufacturer: string;
  brand: string;
  model: string;
  release: string;
  sdk: number;
}

export type PackageState = "enabled" | "disabled" | "not-installed";

export interface FoundPackage {
  entry: PackageEntry;
  state: PackageState;
  /** Bytes from `dumpsys diskstats` (code + data + cache). -1 when unknown. */
  sizeBytes: number;
}

export interface JournalRecord {
  package: string;
  /** State before RemoveAndroidAI touched it. Undo returns to this state. */
  before: PackageState;
  disabled: boolean;
  cleared: boolean;
  at: string;
}

export interface Journal {
  tool: "RemoveAndroidAI";
  version: 1;
  device: DeviceInfo;
  records: JournalRecord[];
}

export interface StepResult {
  package: string;
  ok: boolean;
  action: "disable" | "clear" | "enable";
  output: string;
}
