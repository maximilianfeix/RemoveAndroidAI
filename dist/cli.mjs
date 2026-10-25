#!/usr/bin/env node

// src/cli/index.ts
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { createInterface } from "node:readline/promises";
import { parseArgs } from "node:util";

// data/packages.json
var packages_default = [
  {
    vendor: "google",
    package: "com.google.android.aicore",
    label: "Android AICore (Gemini Nano)",
    what: "Runs Gemini Nano on the phone. Its downloaded model takes about 1 GB on Samsung and up to 7 GB on Pixel, 11-12 GB while a model update is in progress.",
    tier: "safe",
    uad: "Advanced",
    breaks: "AI features only: Pixel Screenshots, Magic Compose rephrasing, Recorder summaries, Pixel Journal suggestions, apps using on-device Gemini Nano. The Gemini app keeps working.",
    clearData: true,
    sources: [
      "https://play.google.com/store/apps/details?id=com.google.android.aicore",
      "https://support.google.com/android/answer/17065362",
      "https://www.techadvisor.com/article/3094321/how-to-free-up-to-7gb-on-your-pixel-phone.html",
      "https://www.androidauthority.com/disable-aicore-samsung-3635371/",
      "https://sysapps.bayton.org/packages/com.google.android.aicore"
    ]
  },
  {
    vendor: "google",
    package: "com.google.android.apps.bard",
    label: "Google Gemini",
    what: "The Gemini assistant app.",
    tier: "safe",
    uad: "Recommended",
    breaks: "The Gemini app and Gemini as assistant.",
    clearData: true,
    sources: [
      "https://play.google.com/store/apps/details?id=com.google.android.apps.bard",
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "google",
    package: "com.google.android.apps.googleassistant",
    label: "Google Assistant",
    what: "Assistant app entry point.",
    tier: "safe",
    uad: "Recommended",
    breaks: "The Assistant shortcut.",
    clearData: false,
    sources: [
      "https://play.google.com/store/apps/details?id=com.google.android.apps.googleassistant",
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "google",
    package: "com.android.hotwordenrollment.okgoogle",
    label: '"OK Google" hotword',
    what: "Always-listening hotword detection.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Voice hotword.",
    clearData: false,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "google",
    package: "com.android.hotwordenrollment.xgoogle",
    label: '"Hey Google" hotword',
    what: "Always-listening hotword detection.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Voice hotword.",
    clearData: false,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "google",
    package: "com.google.android.apps.aiwallpapers",
    label: "AI Wallpapers",
    what: "Generative wallpapers.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Creating AI wallpapers.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "google",
    package: "com.google.android.apps.pixel.creativeassistant",
    label: "Pixel Studio",
    what: "AI image generation.",
    tier: "safe",
    uad: "Advanced",
    breaks: "Pixel Studio.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "google",
    package: "com.google.android.apps.pixel.agent",
    label: "Pixel Screenshots",
    what: "AI screenshot search app (Pixel 9 and later).",
    tier: "caution",
    uad: "absent",
    breaks: "Pixel Screenshots. Not in UAD-ng's list; other side effects are unverified.",
    clearData: true,
    sources: [
      "https://sysapps.bayton.org/packages/com.google.android.apps.pixel.agent",
      "https://support.google.com/pixelphone/answer/15312581"
    ]
  },
  {
    vendor: "google",
    package: "com.google.android.as",
    label: "Android System Intelligence",
    what: "On-device machine learning for many system features, not only AI.",
    tier: "caution",
    uad: "Recommended",
    breaks: "Live Caption, smart text selection, app predictions in the launcher, notification smart actions, Screen Attention, smart replies, keyboard suggestions.",
    clearData: false,
    sources: [
      "https://play.google.com/store/apps/details?id=com.google.android.as",
      "https://milaq.net/android-bloatware",
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "google",
    package: "com.google.android.as.oss",
    label: "Private Compute Services",
    what: "Privacy bridge that Android System Intelligence and AICore use to reach the network.",
    tier: "caution",
    uad: "Recommended",
    breaks: "Live Caption, Now Playing music recognition, smart replies.",
    clearData: false,
    sources: [
      "https://play.google.com/store/apps/details?id=com.google.android.as.oss",
      "https://github.com/google/private-compute-services"
    ]
  },
  {
    vendor: "google",
    package: "com.android.settings.intelligence",
    label: "Settings Suggestions (not AI)",
    what: "Settings search. Listed so it is never turned off by mistake.",
    tier: "never",
    uad: "Expert",
    breaks: "Settings crashes when you search.",
    clearData: false,
    sources: [
      "https://gitlab.com/W1nst0n/universal-android-debloater/-/issues/51"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.bixby.agent",
    label: "Bixby Voice",
    what: "Bixby assistant.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Bixby.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json",
      "https://github.com/khlam/debloat-samsung-android/blob/master/commands.txt"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.bixby.wakeup",
    label: "Bixby voice wake-up",
    what: "Bixby hotword.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Bixby wake word.",
    clearData: false,
    sources: [
      "https://github.com/khlam/debloat-samsung-android/blob/master/commands.txt"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.visionintelligence",
    label: "Bixby Vision",
    what: "Camera object recognition.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Bixby Vision.",
    clearData: true,
    sources: [
      "https://github.com/khlam/debloat-samsung-android/blob/master/commands.txt"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.bixbyvision.framework",
    label: "Bixby Vision Framework",
    what: "Bixby Vision backend.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Bixby Vision.",
    clearData: true,
    sources: [
      "https://github.com/khlam/debloat-samsung-android/blob/master/commands.txt"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.app.sketchbook",
    label: "Drawing Assist",
    what: "AI drawing extension.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Drawing Assist.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.app.interpreter",
    label: "Interpreter",
    what: "Live translation app.",
    tier: "safe",
    uad: "Advanced",
    breaks: "Interpreter and live translation.",
    clearData: true,
    sources: [
      "https://github.com/itxjobe/samsungdebloat/blob/main/04-optional-removals.txt",
      "https://github.com/Willie169/Samsung-Android-Debloat-List"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.aicore",
    label: "Samsung AI Core",
    what: "Galaxy AI engine.",
    tier: "caution",
    uad: "absent",
    breaks: "Reportedly Photo Assist, Note Assist and Writing Assist. One user removed it without problems, another list says keep it. Unverified.",
    clearData: true,
    sources: [
      "https://sysapps.bayton.org/packages/com.samsung.android.aicore",
      "https://github.com/itxjobe/samsungdebloat/blob/main/06-oneui8-specific.txt",
      "https://github.com/Willie169/Samsung-Android-Debloat-List/blob/main/raw.txt"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.offline.languagemodel",
    label: "Samsung Language Core",
    what: "Offline language model, up to about 3 GB.",
    tier: "caution",
    uad: "absent",
    breaks: "Offline Galaxy AI language features; Samsung Keyboard may use it. Exact scope unverified.",
    clearData: true,
    sources: [
      "https://sysapps.bayton.org/packages/com.samsung.android.offline.languagemodel"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.vision.model",
    label: "Samsung Vision Model",
    what: "Vision model files for Galaxy AI, up to about 1.6 GB.",
    tier: "caution",
    uad: "absent",
    breaks: "Vision AI features. Unverified.",
    clearData: true,
    sources: [
      "https://sysapps.bayton.org/packages/com.samsung.android.vision.model",
      "https://github.com/itxjobe/samsungdebloat/blob/main/08-z-fold8.txt"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.intellivoiceservice",
    label: "Samsung Intelligence Voice Services",
    what: "Bridge to Galaxy AI speech and language services.",
    tier: "caution",
    uad: "absent",
    breaks: "Live Translate and speech recognition.",
    clearData: true,
    sources: [
      "https://sysapps.bayton.org/packages/com.samsung.android.intellivoiceservice",
      "https://github.com/itxjobe/samsungdebloat/blob/main/package-reference.md"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.visual.cloudcore",
    label: "Samsung Visual Cloud Core",
    what: "Sends generative image edits to the cloud.",
    tier: "caution",
    uad: "absent",
    breaks: "Cloud generative photo edits. Unverified.",
    clearData: true,
    sources: [
      "https://github.com/Willie169/Samsung-Android-Debloat-List/blob/main/raw.txt"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.photoremasterservice",
    label: "Photo Remaster",
    what: "AI photo enhancement.",
    tier: "caution",
    uad: "Advanced",
    breaks: "Gallery Photo Remaster.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.smartsuggestions",
    label: "Smart suggestions / Now Brief",
    what: "Now Brief, content capture and autofill suggestions.",
    tier: "caution",
    uad: "Recommended",
    breaks: "Now Brief and autofill suggestions.",
    clearData: false,
    sources: [
      "https://github.com/itxjobe/samsungdebloat/blob/main/CHANGELOG.md"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.scs",
    label: "Samsung Core Services",
    what: "Search and text/image extraction engine.",
    tier: "caution",
    uad: "Advanced",
    breaks: "Search and text extraction in Camera, Gallery, Messages, Contacts, Settings and Finder.",
    clearData: false,
    sources: [
      "https://sysapps.bayton.org/packages/com.samsung.android.scs"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.callassistant",
    label: "Call Assistant",
    what: "Call screening and call AI.",
    tier: "never",
    uad: "Expert",
    breaks: "UAD-ng: can break things on One UI 6.1 and later.",
    clearData: false,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "samsung",
    package: "com.samsung.android.honeyboard",
    label: "Samsung Keyboard (hosts Writing Assist)",
    what: "The system keyboard.",
    tier: "never",
    uad: "Expert",
    breaks: "You can get stuck at the lock screen without another keyboard that works before unlock.",
    clearData: false,
    sources: [
      "https://developer.android.com/training/articles/direct-boot",
      "https://github.com/itxjobe/samsungdebloat/blob/main/package-reference.md"
    ]
  },
  {
    vendor: "xiaomi",
    package: "com.miui.voiceassist",
    label: "Mi AI (XiaoAi)",
    what: "Voice assistant.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Mi AI.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "xiaomi",
    package: "com.xiaomi.mibrain.speech",
    label: "Mi AI speech engine",
    what: "Speech engine for Mi AI.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Mi AI voice.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "xiaomi",
    package: "com.xiaomi.aiasst.service",
    label: "AI call assistant",
    what: "AI features in calls.",
    tier: "safe",
    uad: "Recommended",
    breaks: "AI call settings.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "xiaomi",
    package: "com.xiaomi.aicr",
    label: "HyperAI Engine",
    what: "HyperOS AI engine.",
    tier: "caution",
    uad: "Advanced",
    breaks: "May break setting wallpapers (UAD-ng issue #1110).",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/issues/1110",
      "https://sysapps.bayton.org/packages/com.xiaomi.aicr"
    ]
  },
  {
    vendor: "xiaomi",
    package: "com.xiaomi.aiservice",
    label: "Xiaomi AI inference engine",
    what: "On-device models for OCR and translation, downloaded silently.",
    tier: "caution",
    uad: "Advanced",
    breaks: "HyperOS AI features such as OCR and translation.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "xiaomi",
    package: "com.xiaomi.cameramind",
    label: "Camera AI core",
    what: "AI features of the stock camera.",
    tier: "caution",
    uad: "Advanced",
    breaks: "Stock camera AI features; the camera app depends on it.",
    clearData: false,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "motorola",
    package: "com.motorola.aiservices",
    label: "Moto AI Services",
    what: "Supplies AI models to Motorola apps.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Moto AI model features.",
    clearData: true,
    sources: [
      "https://play.google.com/store/apps/details?id=com.motorola.aiservices"
    ]
  },
  {
    vendor: "motorola",
    package: "com.motorola.uxcore",
    label: "Moto AI",
    what: "Moto AI hub app.",
    tier: "caution",
    uad: "absent",
    breaks: "Moto AI features. Side effects unverified.",
    clearData: true,
    sources: [
      "https://play.google.com/store/apps/details?id=com.motorola.uxcore",
      "https://www.androidcentral.com/apps-software/motorola-moto-ai"
    ]
  },
  {
    vendor: "motorola",
    package: "com.motorola.aicore",
    label: "Moto AI Core",
    what: "Supplies AI models to Motorola apps.",
    tier: "caution",
    uad: "absent",
    breaks: "Unverified.",
    clearData: true,
    sources: [
      "https://play.google.com/store/apps/details?id=com.motorola.aicore"
    ]
  },
  {
    vendor: "oplus",
    package: "com.oplus.aiwriter",
    label: "AI Writer",
    what: "AI text generation pop-up.",
    tier: "safe",
    uad: "Recommended",
    breaks: "AI Writer.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "oplus",
    package: "com.heytap.speechassist",
    label: "Breeno Voice",
    what: "Voice assistant.",
    tier: "safe",
    uad: "Recommended",
    breaks: "Breeno.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "oplus",
    package: "com.oplus.aiunit",
    label: "AIUnit",
    what: "ColorOS AI system service.",
    tier: "caution",
    uad: "Advanced",
    breaks: "Smart Cutout, AI Editor and gallery AI.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "oplus",
    package: "com.oplus.aimemory",
    label: "Mind Space",
    what: "AI save and summarize.",
    tier: "caution",
    uad: "Advanced",
    breaks: "Mind Space.",
    clearData: true,
    sources: [
      "https://github.com/Universal-Debloater-Alliance/universal-android-debloater-next-generation/blob/main/resources/assets/uad_lists.json"
    ]
  },
  {
    vendor: "oplus",
    package: "com.aiunit.aon",
    label: "AON Service",
    what: "Sensor features, not only AI.",
    tier: "never",
    uad: "Expert",
    breaks: "Smart rotation, smart always-on display, privacy protection.",
    clearData: false,
    sources: [
      "https://community.oppo.com/thread/1446120575440257025"
    ]
  }
];

// src/core/device.ts
var PACKAGE_NAME = /^[a-zA-Z][a-zA-Z0-9_]*(\.[a-zA-Z][a-zA-Z0-9_]*)+$/;
function assertPackageName(name) {
  if (!PACKAGE_NAME.test(name)) throw new Error(`refusing unsafe package name: ${JSON.stringify(name)}`);
  return name;
}
async function readDeviceInfo(shell, serial) {
  const prop = async (key) => (await shell.run(`getprop ${key}`)).trim();
  return {
    serial,
    manufacturer: await prop("ro.product.manufacturer"),
    brand: await prop("ro.product.brand"),
    model: await prop("ro.product.model"),
    release: await prop("ro.build.version.release"),
    sdk: Number.parseInt(await prop("ro.build.version.sdk"), 10) || -1
  };
}
function parsePackageList(output) {
  const names = /* @__PURE__ */ new Set();
  for (const line of output.split(/\r?\n/)) {
    const m = /^package:(\S+)/.exec(line.trim());
    if (m) names.add(m[1]);
  }
  return names;
}
async function readPackageStates(shell) {
  const installed = parsePackageList(await shell.run("pm list packages --user 0"));
  const disabled = parsePackageList(await shell.run("pm list packages -d --user 0"));
  const states = /* @__PURE__ */ new Map();
  for (const name of installed) states.set(name, disabled.has(name) ? "disabled" : "enabled");
  return states;
}
function parseDfFree(output) {
  const lines = output.trim().split(/\r?\n/).filter((l) => l.trim() !== "");
  const last = lines.at(-1)?.trim().split(/\s+/) ?? [];
  if (last.length < 6) return -1;
  const avail = Number.parseInt(last[3], 10);
  return Number.isFinite(avail) ? avail * 1024 : -1;
}
async function readFreeBytes(shell) {
  return parseDfFree(await shell.run("df -k /data"));
}
function parseArray(output, label) {
  const m = new RegExp(`^${label}: (\\[.*\\])\\s*$`, "m").exec(output);
  if (!m) return void 0;
  try {
    const value = JSON.parse(m[1]);
    return Array.isArray(value) ? value : void 0;
  } catch {
    return void 0;
  }
}
function parseDiskstats(output) {
  const sizes = /* @__PURE__ */ new Map();
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
async function readPackageSizes(shell) {
  return parseDiskstats(await shell.run("dumpsys diskstats"));
}

// src/core/engine.ts
var VENDOR_HINTS = {
  google: /.*/,
  samsung: /samsung/i,
  xiaomi: /xiaomi|redmi|poco/i,
  motorola: /motorola|moto/i,
  oplus: /oneplus|oppo|realme/i
};
function vendorMatches(vendor, device) {
  return VENDOR_HINTS[vendor].test(`${device.manufacturer} ${device.brand}`);
}
async function scan(shell, serial, catalog2) {
  const device = await readDeviceInfo(shell, serial);
  const states = await readPackageStates(shell);
  const sizes = await readPackageSizes(shell);
  const freeBytes = await readFreeBytes(shell);
  const found = [];
  for (const entry of catalog2) {
    if (!vendorMatches(entry.vendor, device)) continue;
    const state = states.get(entry.package);
    if (!state) continue;
    found.push({ entry, state, sizeBytes: sizes.get(entry.package) ?? -1 });
  }
  return { device, freeBytes, found };
}
function defaultSelection(found, opts) {
  return found.filter(
    (f) => f.state === "enabled" && (f.entry.tier === "safe" || opts.includeCaution && f.entry.tier === "caution")
  );
}
function newJournal(device) {
  return { tool: "RemoveAndroidAI", version: 1, device, records: [] };
}
var succeeded = {
  disable: (out) => /new state:\s*disabled/i.test(out),
  enable: (out) => /new state:\s*(enabled|default)/i.test(out),
  clear: (out) => /^\s*Success\s*$/m.test(out)
};
async function apply(shell, journal, targets, onStep) {
  const results = [];
  const report = (r) => {
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
    const record = { package: pkg, before: target.state, disabled: true, cleared: false, at: (/* @__PURE__ */ new Date()).toISOString() };
    journal.records.push(record);
    if (target.entry.clearData) {
      const clearOut = await shell.run(`pm clear --user 0 ${pkg}`);
      record.cleared = succeeded.clear(clearOut);
      report({ package: pkg, ok: record.cleared, action: "clear", output: clearOut.trim() });
    }
  }
  return results;
}
async function undo(shell, journal, onStep) {
  const results = [];
  const seen = /* @__PURE__ */ new Set();
  for (const record of [...journal.records].reverse()) {
    if (!record.disabled || record.before !== "enabled" || seen.has(record.package)) continue;
    seen.add(record.package);
    const pkg = assertPackageName(record.package);
    const out = await shell.run(`pm enable --user 0 ${pkg}`);
    const r = { package: pkg, ok: succeeded.enable(out), action: "enable", output: out.trim() };
    results.push(r);
    onStep?.(r);
  }
  return results;
}
function formatBytes(bytes) {
  if (bytes < 0) return "unknown";
  const units = ["B", "KB", "MB", "GB", "TB"];
  let v = bytes;
  let i = 0;
  while (v >= 1e3 && i < units.length - 1) {
    v /= 1e3;
    i++;
  }
  return `${v >= 100 || i === 0 ? v.toFixed(0) : v.toFixed(1)} ${units[i]}`;
}

// src/cli/index.ts
var VERSION = "0.2.0";
var catalog = packages_default;
var journalDir = join(homedir(), ".removeandroidai");
var color = process.stdout.isTTY && !process.env.NO_COLOR;
var paint = (code) => (s) => color ? `\x1B[${code}m${s}\x1B[0m` : s;
var bold = paint("1");
var dim = paint("2");
var green = paint("32");
var yellow = paint("33");
var red = paint("31");
var HELP = `RemoveAndroidAI ${VERSION}
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
function run(file, args) {
  return new Promise((resolve) => {
    execFile(file, args, { maxBuffer: 64 * 1024 * 1024 }, (err, stdout, stderr) => {
      const code = err ? typeof err.code === "number" ? err.code : -1 : 0;
      resolve({ stdout: String(stdout), stderr: String(stderr) || (err && !stdout ? err.message : ""), code });
    });
  });
}
function findAdb() {
  const sdk = process.env.ANDROID_HOME ?? process.env.ANDROID_SDK_ROOT;
  const exe = process.platform === "win32" ? "adb.exe" : "adb";
  if (sdk && existsSync(join(sdk, "platform-tools", exe))) return join(sdk, "platform-tools", exe);
  return exe;
}
function fail(message) {
  console.error(red(`error: ${message}`));
  process.exit(1);
}
async function pickSerial(adb, wanted) {
  const res = await run(adb, ["devices"]);
  if (res.code !== 0 && /ENOENT|not found/i.test(res.stderr))
    fail(
      "adb not found. Install Android platform-tools (macOS: brew install android-platform-tools, Windows: winget install Google.PlatformTools)\n       or use the browser version: https://maximilianfeix.github.io/RemoveAndroidAI/"
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
function adbShell(adb, serial) {
  return {
    async run(command) {
      const r = await run(adb, ["-s", serial, "shell", command]);
      return r.stdout + r.stderr;
    }
  };
}
function tierLabel(f) {
  if (f.state === "disabled") return dim("already off");
  if (f.entry.tier === "safe") return green("safe");
  if (f.entry.tier === "caution") return yellow("caution");
  return red("never");
}
function printScan(found, selected) {
  if (found.length === 0) {
    console.log(green("No known AI packages are installed on this phone. Nothing to do."));
    return;
  }
  for (const f of found) {
    const mark = selected.has(f.entry.package) ? bold("\u25CF") : dim("\u25CB");
    const size = f.sizeBytes > 0 ? formatBytes(f.sizeBytes).padStart(8) : dim("       ?");
    console.log(`${mark} ${size}  ${bold(f.entry.label)}  ${dim(f.entry.package)}  [${tierLabel(f)}]`);
    if (f.entry.breaks && f.state === "enabled") console.log(`             ${dim("also stops: " + f.entry.breaks)}`);
  }
  console.log(dim("\n\u25CF will be turned off   \u25CB left alone   sizes from Android's daily storage stats"));
}
function stepLine(r) {
  const verb = { disable: "turned off", clear: "deleted downloaded data", enable: "turned back on" }[r.action];
  if (r.ok) console.log(`${green("\u2713")} ${r.package}: ${verb}`);
  else console.log(`${red("\u2717")} ${r.package}: ${r.action} failed: ${r.output.split("\n").find((l) => l.trim()) ?? "no output"}`);
}
function saveJournal(j) {
  mkdirSync(journalDir, { recursive: true });
  const file = join(journalDir, `${j.device.serial.replace(/[^\w.-]/g, "_")}-${Date.now()}.json`);
  writeFileSync(file, JSON.stringify(j, null, 2) + "\n");
  return file;
}
function latestJournal(serial) {
  if (!existsSync(journalDir)) return void 0;
  const prefix = `${serial.replace(/[^\w.-]/g, "_")}-`;
  return readdirSync(journalDir).filter((f) => f.startsWith(prefix) && f.endsWith(".json")).sort((a, b) => Number(a.slice(prefix.length, -5)) - Number(b.slice(prefix.length, -5))).map((f) => join(journalDir, f)).at(-1);
}
async function confirm(question) {
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
      version: { type: "boolean", short: "v" }
    }
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
    const journal2 = JSON.parse(readFileSync(file, "utf8"));
    console.log(`Undoing ${file}`);
    const results2 = await undo(shell, journal2, stepLine);
    if (journal2.records.some((r) => r.cleared))
      console.log(dim("Deleted model data isn't restored; the apps download it again when they need it."));
    process.exit(results2.every((r) => r.ok) ? 0 : 1);
  }
  const s = await scan(shell, serial, catalog);
  const selection = defaultSelection(s.found, { includeCaution: !!values["include-caution"] });
  if (values.json) return console.log(JSON.stringify({ ...s, selected: selection.map((f) => f.entry.package) }, null, 2));
  const d = s.device;
  console.log(`${bold(`${d.manufacturer} ${d.model}`)}  Android ${d.release} (SDK ${d.sdk})  free: ${formatBytes(s.freeBytes)}
`);
  printScan(s.found, new Set(selection.map((f) => f.entry.package)));
  if (selection.length === 0) {
    if (s.found.some((f) => f.state === "enabled" && f.entry.tier === "caution"))
      console.log(`
Nothing is pre-selected. Add ${bold("--include-caution")} to turn off the caution ones too.`);
    return;
  }
  if (!values.apply) {
    console.log(`
Nothing changed. Run again with ${bold("--apply")} to turn these off.`);
    return;
  }
  if (!values.yes && !await confirm(`
Turn off ${selection.length} package(s)? Every step can be undone with --undo. [y/N] `))
    fail("cancelled, nothing changed");
  const journal = newJournal(d);
  let results = [];
  try {
    results = await apply(shell, journal, selection, stepLine);
  } finally {
    if (journal.records.length) console.log(dim(`Undo record: ${saveJournal(journal)}`));
  }
  const after = await readFreeBytes(shell);
  if (s.freeBytes >= 0 && after >= 0) {
    const gained = after - s.freeBytes;
    console.log(`
Free space: ${formatBytes(s.freeBytes)} \u2192 ${bold(formatBytes(after))} (${gained >= 0 ? "+" : ""}${formatBytes(Math.abs(gained))})`);
  }
  console.log(`Changed your mind? ${bold("npx github:maximilianfeix/RemoveAndroidAI --undo")}`);
  process.exit(results.every((r) => r.ok) ? 0 : 1);
}
main().catch((err) => fail(err instanceof Error ? err.message : String(err)));
