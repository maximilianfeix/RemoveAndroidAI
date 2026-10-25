import type { Shell } from "../src/core/types.js";

export interface FakePackage {
  enabled: boolean;
  codeBytes: number;
  dataBytes: number;
  /** pm refuses to change this one, like some protected system packages do. */
  protected?: boolean;
}

/** A phone in memory that answers the shell commands RemoveAndroidAI sends, the way Android 14–16 prints them. */
export class FakeDevice implements Shell {
  readonly log: string[] = [];
  constructor(
    readonly props: Record<string, string>,
    readonly packages: Record<string, FakePackage>,
    public freeBytes: number,
  ) {}

  async run(command: string): Promise<string> {
    this.log.push(command);
    const [cmd, ...args] = command.split(/\s+/);
    const pkgArg = args.at(-1) ?? "";
    const pkg = this.packages[pkgArg];
    if (cmd === "getprop") return `${this.props[args[0]] ?? ""}\n`;
    if (command === "pm list packages --user 0")
      return Object.keys(this.packages).map((p) => `package:${p}`).join("\n") + "\n";
    if (command === "pm list packages -d --user 0")
      return Object.entries(this.packages).filter(([, p]) => !p.enabled).map(([n]) => `package:${n}\n`).join("");
    if (command === "df -k /data") {
      const avail = Math.floor(this.freeBytes / 1024);
      return `Filesystem       1K-blocks     Used Available Use% Mounted on\n/dev/block/dm-48 115249236 61234567 ${avail}  54% /data\n`;
    }
    if (command === "dumpsys diskstats") {
      const names = Object.keys(this.packages);
      return [
        "Latency: 1ms [512B Data Write]",
        `Package Names: ${JSON.stringify(names)}`,
        `App Sizes: [${names.map((n) => this.packages[n].codeBytes).join(",")}]`,
        `App Data Sizes: [${names.map((n) => this.packages[n].dataBytes).join(",")}]`,
        `Cache Sizes: [${names.map(() => 0).join(",")}]`,
      ].join("\n");
    }
    if (cmd === "pm" && ["disable-user", "enable", "clear"].includes(args[0])) {
      if (!pkg) return `Error: Unknown package: ${pkgArg}\n`;
      if (pkg.protected)
        return `Exception occurred while executing '${args[0]}':\njava.lang.SecurityException: Shell cannot change component state for ${pkgArg} to 3\n`;
      if (args[0] === "disable-user") {
        pkg.enabled = false;
        return `Package ${pkgArg} new state: disabled-user\n`;
      }
      if (args[0] === "enable") {
        pkg.enabled = true;
        return `Package ${pkgArg} new state: enabled\n`;
      }
      this.freeBytes += pkg.dataBytes;
      pkg.dataBytes = 0;
      return "Success\n";
    }
    return `/system/bin/sh: ${cmd}: not found\n`;
  }
}

export const GB = 1_000_000_000;

export function pixel(): FakeDevice {
  return new FakeDevice(
    {
      "ro.product.manufacturer": "Google",
      "ro.product.brand": "google",
      "ro.product.model": "Pixel 9",
      "ro.build.version.release": "16",
      "ro.build.version.sdk": "36",
    },
    {
      "com.example.ai.safe": { enabled: true, codeBytes: 0.1 * GB, dataBytes: 6.9 * GB },
      "com.example.ai.caution": { enabled: true, codeBytes: 0.2 * GB, dataBytes: 0.3 * GB },
      "com.example.ai.never": { enabled: true, codeBytes: 0.1 * GB, dataBytes: 0 },
      "com.example.ai.locked": { enabled: true, codeBytes: 0.1 * GB, dataBytes: 1 * GB, protected: true },
      "com.example.ai.off": { enabled: false, codeBytes: 0.1 * GB, dataBytes: 0 },
      "com.android.settings": { enabled: true, codeBytes: 0.1 * GB, dataBytes: 0 },
    },
    40 * GB,
  );
}
