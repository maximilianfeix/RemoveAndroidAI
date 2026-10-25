import { Adb, AdbDaemonTransport } from "@yume-chan/adb";
import AdbWebCredentialStore from "@yume-chan/adb-credential-web";
import { AdbDaemonWebUsbDeviceManager } from "@yume-chan/adb-daemon-webusb";
import catalogJson from "../data/packages.json";
import { readFreeBytes } from "../src/core/device.js";
import { apply, defaultSelection, formatBytes, newJournal, scan, undo, type Scan } from "../src/core/engine.js";
import type { FoundPackage, Journal, PackageEntry, Shell, StepResult } from "../src/core/types.js";

const catalog = catalogJson as PackageEntry[];
const $ = <T extends HTMLElement>(sel: string) => document.querySelector<T>(sel)!;

const esc = (s: string) =>
  s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);

let adb: Adb | undefined;
let shell: Shell | undefined;
let current: Scan | undefined;

const journalKey = (serial: string) => `removeandroidai:journal:${serial}`;

function loadJournal(serial: string): Journal | undefined {
  try {
    const raw = localStorage.getItem(journalKey(serial));
    return raw ? (JSON.parse(raw) as Journal) : undefined;
  } catch {
    return undefined;
  }
}

function storeJournal(j: Journal) {
  try {
    localStorage.setItem(journalKey(j.device.serial), JSON.stringify(j));
  } catch {
    // Private windows can refuse storage; the download link below still works.
  }
}

function show(id: string) {
  for (const el of document.querySelectorAll<HTMLElement>("[data-step]")) el.hidden = el.dataset.step !== id;
}

function setStatus(text: string, kind: "info" | "error" = "info") {
  const el = $("#status");
  el.textContent = text;
  el.className = `status ${kind}`;
  el.hidden = !text;
}

function explainError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err);
  if (/claim|busy|in use|Unable to claim/i.test(msg))
    return "Another program is using the phone's USB connection, usually adb. Close Android Studio, run \"adb kill-server\", then try again.";
  if (/No device selected|NotFoundError/i.test(msg)) return "No phone was selected. Click Connect and pick your phone in the list.";
  if (/auth|reject|denied/i.test(msg))
    return 'The phone didn\'t allow this computer. Unlock the phone, tap "Allow" on the USB debugging prompt and try again.';
  return msg;
}

async function connect() {
  if (!("usb" in navigator)) return;
  setStatus("");
  const manager = new AdbDaemonWebUsbDeviceManager(navigator.usb);
  try {
    const device = await manager.requestDevice();
    if (!device) return setStatus("No phone was selected. Click Connect and pick your phone in the list.", "error");
    setStatus('Unlock your phone and tap "Allow" on the USB debugging prompt…');
    const connection = await device.connect();
    const transport = await AdbDaemonTransport.authenticate({
      serial: device.serial,
      connection,
      credentialStore: new AdbWebCredentialStore("RemoveAndroidAI"),
    });
    adb = new Adb(transport);
    const a = adb;
    shell = { run: (cmd) => a.subprocess.noneProtocol.spawnWaitText(cmd) };
    setStatus("Looking for AI packages…");
    current = await scan(shell, device.serial, catalog);
    setStatus("");
    renderScan(current);
    show("scan");
  } catch (err) {
    setStatus(explainError(err), "error");
  }
}

function badge(f: FoundPackage): string {
  if (f.state === "disabled") return `<span class="badge off">already off</span>`;
  return `<span class="badge ${f.entry.tier}">${f.entry.tier}</span>`;
}

function row(f: FoundPackage, checked: boolean): string {
  const e = f.entry;
  const disabled = f.state !== "enabled" || e.tier === "never";
  const size = f.sizeBytes > 0 ? formatBytes(f.sizeBytes) : "";
  const sources = e.sources.map((s, i) => `<a href="${esc(s)}" target="_blank" rel="noopener">[${i + 1}]</a>`).join(" ");
  return `<li class="pkg ${e.tier}${disabled ? " locked" : ""}">
    <label>
      <input type="checkbox" value="${esc(e.package)}" ${checked ? "checked" : ""} ${disabled ? "disabled" : ""}>
      <span class="pkg-main">
        <span class="pkg-title">${esc(e.label)} ${badge(f)} ${size ? `<span class="size">${size}</span>` : ""}</span>
        <span class="pkg-what">${esc(e.what)}</span>
        <span class="pkg-breaks">${e.tier === "never" ? "Never turned off: " : "Stops: "}${esc(e.breaks)}</span>
        <span class="pkg-meta"><code>${esc(e.package)}</code> · UAD-ng: ${esc(e.uad)} · sources ${sources}</span>
      </span>
    </label>
  </li>`;
}

function renderScan(s: Scan) {
  const d = s.device;
  $("#device").textContent = `${d.manufacturer} ${d.model} · Android ${d.release} · ${formatBytes(s.freeBytes)} free`;
  const selected = new Set(defaultSelection(s.found, { includeCaution: false }).map((f) => f.entry.package));
  const list = $("#packages");
  list.innerHTML = s.found.length
    ? s.found.map((f) => row(f, selected.has(f.entry.package))).join("")
    : `<li class="empty">No known AI packages are installed on this phone. Nothing to do.</li>`;
  const prior = loadJournal(d.serial);
  $("#undo-saved").hidden = !prior?.records.length;
  updateApplyButton();
}

function chosen(): FoundPackage[] {
  if (!current) return [];
  const names = new Set(
    [...document.querySelectorAll<HTMLInputElement>("#packages input:checked")].map((i) => i.value),
  );
  return current.found.filter((f) => names.has(f.entry.package));
}

function updateApplyButton() {
  const n = chosen().length;
  const btn = $<HTMLButtonElement>("#apply");
  btn.disabled = n === 0;
  btn.textContent = n ? `Turn off ${n} selected` : "Select something to turn off";
}

function logStep(r: StepResult) {
  const verb = { disable: "turned off", clear: "deleted downloaded data", enable: "turned back on" }[r.action];
  const li = document.createElement("li");
  li.className = r.ok ? "ok" : "fail";
  li.textContent = r.ok ? `✓ ${r.package}: ${verb}` : `✗ ${r.package}: ${r.action} failed (${r.output.split("\n")[0] || "no output"})`;
  $("#log").append(li);
}

function offerDownload(j: Journal) {
  const a = $<HTMLAnchorElement>("#download-undo");
  a.href = URL.createObjectURL(new Blob([JSON.stringify(j, null, 2)], { type: "application/json" }));
  a.download = `removeandroidai-undo-${j.device.serial}.json`;
  a.hidden = false;
}

async function runApply() {
  if (!shell || !current) return;
  const targets = chosen();
  const caution = targets.filter((t) => t.entry.tier === "caution");
  if (caution.length && !window.confirm(`${caution.length} selected item(s) also stop non-AI features. Continue?`)) return;
  $("#log").innerHTML = "";
  show("result");
  $("#result-title").textContent = "Turning off…";
  const journal = newJournal(current.device);
  let results: StepResult[] = [];
  try {
    results = await apply(shell, journal, targets, (r) => {
      logStep(r);
      storeJournal(journal);
    });
  } catch (err) {
    setStatus(explainError(err), "error");
  }
  storeJournal(journal);
  if (journal.records.length) offerDownload(journal);
  const after = await readFreeBytes(shell);
  const gained = after >= 0 && current.freeBytes >= 0 ? after - current.freeBytes : -1;
  $("#result-title").textContent = results.every((r) => r.ok) ? "Done." : "Done, with some steps skipped.";
  $("#result-space").innerHTML =
    gained >= 0
      ? `Free space <b>${formatBytes(current.freeBytes)}</b> → <b>${formatBytes(after)}</b> <span class="gain">+${formatBytes(gained)}</span>`
      : "Couldn't read free space on this phone.";
}

async function runUndo(journal: Journal) {
  if (!shell) return;
  $("#log").innerHTML = "";
  show("result");
  $("#result-title").textContent = "Turning back on…";
  $("#result-space").textContent = "";
  const results = await undo(shell, journal, logStep);
  $("#result-title").textContent = results.every((r) => r.ok) ? "Everything is back on." : "Undo finished, some steps failed.";
  if (journal.records.some((r) => r.cleared))
    $("#result-space").textContent = "Deleted model data comes back when the apps download it again.";
}

function init() {
  if (!("usb" in navigator)) {
    $("#no-webusb").hidden = false;
    $<HTMLButtonElement>("#connect").disabled = true;
  }
  $("#connect").addEventListener("click", () => void connect());
  $("#packages").addEventListener("change", updateApplyButton);
  $("#apply").addEventListener("click", () => void runApply());
  $("#undo-saved").addEventListener("click", () => {
    const j = current && loadJournal(current.device.serial);
    if (j) void runUndo(j);
  });
  $("#undo-file").addEventListener("change", async (ev) => {
    const file = (ev.target as HTMLInputElement).files?.[0];
    if (!file) return;
    try {
      const j = JSON.parse(await file.text()) as Journal;
      if (j.tool !== "RemoveAndroidAI" || !Array.isArray(j.records)) throw new Error("not a RemoveAndroidAI undo file");
      void runUndo(j);
    } catch (err) {
      setStatus(explainError(err), "error");
    }
  });
  $("#rescan").addEventListener("click", async () => {
    if (!shell || !current) return;
    current = await scan(shell, current.device.serial, catalog);
    renderScan(current);
    show("scan");
  });
  show("start");
}

init();
