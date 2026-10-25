import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";
import catalogJson from "../../data/packages.json";
import { readFreeBytes } from "../core/device.js";
import { apply, defaultSelection, formatBytes, newJournal, scan, undo } from "../core/engine.js";
import type { FoundPackage, Journal, PackageEntry, Shell, StepResult } from "../core/types.js";

const VERSION = "0.1.0";
const catalog = catalogJson as PackageEntry[];
const journalDir = join(homedir(), ".removeandroidai");

const color = process.stdout.isTTY && !process.env.NO_COLOR;
const paint = (code: string) => (s: string) => (color ? `\x1b[${code}m${s}\x1b[0m` : s);
const bold = paint("1");
const dim = paint("2");
const green = paint("32");
const yellow = paint("33");
const red = paint("31");

const HELP = `RemoveAndroidAI ${VERSION}
Turn off on-device AI on an Android phone over USB and get the storage back.
Every change is journaled and can be undone.

Usage:
  removeandroidai                 Show what would be turned off (changes nothing)
  removeandroidai --apply         Turn it off (asks first)
  removeandroidai --undo          Turn everything back on from the last run

Options:
  --include-caution   Also turn off packages that break other features (listed in the scan)
  --serial <id>       Pick a phone when more than one is connected
  --yes               Don't ask before --apply
  --json              Print the scan as JSON
  -h, --help          Show this help
  -v, --version       Show the version

Needs adb (Android platform-tools) and USB debugging on the phone.
No adb? Use the browser version: https://maximilianfeix.github.io/RemoveAndroidAI/`;

function run(file: string, args: string[]): Promise<{ stdout: string; stderr: string; code: number }> {
  return new Promise((resolve) => {
    execFile(file, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err ? (typeof err.code === "number" ? err.code : -1) : 0;
      resolve({ stdout: String(stdout), stderr: String(stderr) || (err && !stdout ? err.message : ""), code });
    });
  });
}

function findAdb(): string {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const exe = process.platform === "win32" ? "adb.exe" : "adb";
  if (sdk && existsSync(join(sdk, "platform-tools", exe))) return join(sdk, "platform-tools", exe);
  return exe;
}

function fail(message: string): never {
  console.error(red(`error: ${message}`));
  process.exit(1);
}

async function pickSerial(adb: string, wanted: string | undefined): Promise<string> {
  const res = await run(adb, ["devices"]);
  if (res.code !== 0 && /ENOENT|not found/i.test(res.stderr))
    fail(
      "adb not found. Install Android platform-tools (macOS: brew install android-platform-tools, Windows: winget install Google.PlatformTools)\n" +
        "       or use the browser version: https://maximilianfeix.github.io/RemoveAndroidAI/",
    );
  const lines = res.stdout.split(/\r?\n/).slice(1).map((l) => l.trim().split(/\s+/)).filter((p) => p.length >= 2);
  const unauthorized = lines.filter((p) => p[1] === "unauthorized");
  const ready = lines.filter((p) => p[1] === "device").map((p) => p[0]);
  if (wanted) {
    if (!ready.includes(wanted)) fail(`phone ${wanted} is not connected or not authorized`);
    return wanted;
  }
  if (ready.length === 1) return ready[0];
  if (ready.length > 1) fail(`more than one phone connected (${ready.join(", ")}); pick one with --serial`);
  if (unauthorized.length) fail('the phone did not allow this computer yet. Unlock it and tap "Allow" on the USB debugging prompt.');
  fail("no phone found. Connect it by USB and turn on USB debugging (Settings > About phone > tap Build number 7 times, then Developer options > USB debugging).");
}

function adbShell(adb: string, serial: string): Shell {
  return {
    async run(command) {
      const r = await run(adb, ["-s", serial, "shell", command]);
      return r.stdout + r.stderr;
    },
  };
}

function tierLabel(f: FoundPackage): string {
  if (f.state === "disabled") return dim("already off");
  if (f.entry.tier === "safe") return green("safe");
  if (f.entry.tier === "caution") return yellow("caution");
  return red("never");
}

function printScan(found: FoundPackage[], selected: Set<string>) {
  if (found.length === 0) {
    console.log(green("No known AI packages are installed on this phone. Nothing to do."));
    return;
  }
  for (const f of found) {
    const mark = selected.has(f.entry.package) ? bold("●") : dim("○");
    const size = f.sizeBytes > 0 ? formatBytes(f.sizeBytes).padStart(8) : dim("       ?");
    console.log(`${mark} ${size}  ${bold(f.entry.label)}  ${dim(f.entry.package)}  [${tierLabel(f)}]`);
    if (f.entry.breaks && f.state === "enabled") console.log(`             ${dim("also stops: " + f.entry.breaks)}`);
  }
  console.log(dim("\n● will be turned off   ○ left alone   sizes from Android's daily storage stats"));
}

function stepLine(r: StepResult) {
  const verb = { disable: "turned off", clear: "deleted downloaded data", enable: "turned back on" }[r.action];
  if (r.ok) console.log(`${green("✓")} ${r.package}: ${verb}`);
  else console.log(`${red("✗")} ${r.package}: ${r.action} failed: ${r.output.split("\n").find((l) => l.trim()) ?? "no output"}`);
}

function saveJournal(j: Journal): string {
  mkdirSync(journalDir, { recursive: true });
  const file = join(journalDir, `${j.device.serial.replace(/[^\w.-]/g, "_")}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
  return file;
}

function latestJournal(serial: string): string | undefined {
  if (!existsSync(journalDir)) return undefined;
  const prefix = `${serial.replace(/[^\w.-]/g, "_")}-`;
  return readdirSync(journalDir)
    .filter((f) => f.startsWith(prefix) && f.endsWith(".json"))
    .sort((a, b) => Number(a.slice(prefix.length, -5)) - Number(b.slice(prefix.length, -5)))
    .map((f) => join(journalDir, f))
    .at(-1);
}

async function confirm(question: string): Promise<boolean> {
  if (!process.stdin.isTTY) return false;
  const rl = createInterface({ input: process.stdin, output: process.stdout });
  const answer = await rl.question(question);
  rl.close();
  return /^y(es)?$/i.test(answer.trim());
}

async function main() {
  const { values } = parseArgs({
    options: {
      apply: { type: "boolean" },
      undo: { type: "boolean" },
      "include-caution": { type: "boolean" },
      serial: { type: "string" },
      yes: { type: "boolean" },
      json: { type: "boolean" },
      help: { type: "boolean", short: "h" },
      version: { type: "boolean", short: "v" },
    },
  });
  if (values.help) return console.log(HELP);
  if (values.version) return console.log(VERSION);
  if (values.apply && values.undo) fail("use either --apply or --undo, not both");

  const adb = findAdb();
  const serial = await pickSerial(adb, values.serial);
  const shell = adbShell(adb, serial);

  if (values.undo) {
    const file = latestJournal(serial);
    if (!file) fail(`no RemoveAndroidAI run found for ${serial} in ${journalDir}`);
    const journal = JSON.parse(readFileSync(file, "utf8")) as Journal;
    console.log(`Undoing ${file}`);
    const results = await undo(shell, journal, stepLine);
    if (journal.records.some((r) => r.cleared))
      console.log(dim("Deleted model data isn't restored; the apps download it again when they need it."));
    process.exit(results.every((r) => r.ok) ? 0 : 1);
  }

  const s = await scan(shell, serial, catalog);
  const selection = defaultSelection(s.found, { includeCaution: !!values["include-caution"] });
  if (values.json) return console.log(JSON.stringify({ ...s, selected: selection.map((f) => f.entry.package) }, null, 2));

  const d = s.device;
  console.log(`${bold(`${d.manufacturer} ${d.model}`)}  Android ${d.release} (SDK ${d.sdk})  free: ${formatBytes(s.freeBytes)}\n`);
  printScan(s.found, new Set(selection.map((f) => f.entry.package)));
  if (selection.length === 0) {
    if (s.found.some((f) => f.state === "enabled" && f.entry.tier === "caution"))
      console.log(`\nNothing is pre-selected. Add ${bold("--include-caution")} to turn off the caution ones too.`);
    return;
  }

  if (!values.apply) {
    console.log(`\nNothing changed. Run again with ${bold("--apply")} to turn these off.`);
    return;
  }
  if (!values.yes && !(await confirm(`\nTurn off ${selection.length} package(s)? Every step can be undone with --undo. [y/N] `)))
    fail("cancelled, nothing changed");

  const journal = newJournal(d);
  let results: StepResult[] = [];
  try {
    results = await apply(shell, journal, selection, stepLine);
  } finally {
    if (journal.records.length) console.log(dim(`Undo record: ${saveJournal(journal)}`));
  }
  const after = await readFreeBytes(shell);
  if (s.freeBytes >= 0 && after >= 0) {
    const gained = after - s.freeBytes;
    console.log(`\nFree space: ${formatBytes(s.freeBytes)} → ${bold(formatBytes(after))} (${gained >= 0 ? "+" : ""}${formatBytes(Math.abs(gained))})`);
  }
  console.log(`Changed your mind? ${bold("npx github:maximilianfeix/RemoveAndroidAI --undo")}`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}

main().catch((err: unknown) => fail(err instanceof Error ? err.message : String(err)));
