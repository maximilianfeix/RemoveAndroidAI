// Regenerates the package table in README.md from data/packages.json.
// `node scripts/readme-table.mjs --check` exits 1 when the README is out of date.
import { readFileSync, writeFileSync } from "node:fs";

const catalog = JSON.parse(readFileSync("data/packages.json", "utf8"));
const vendors = { google: "Google (any phone)", samsung: "Samsung", xiaomi: "Xiaomi / Redmi / POCO", motorola: "Motorola", oplus: "OnePlus / Oppo / Realme" };
const cell = (s) => s.replaceAll("|", "\\|").replaceAll("\n", " ");

let table = "";
for (const [vendor, title] of Object.entries(vendors)) {
  const rows = catalog.filter((p) => p.vendor === vendor);
  if (!rows.length) continue;
  table += `\n#### ${title}\n\n| Package | What | Tier | Stops | Sources |\n|---|---|---|---|---|\n`;
  for (const p of rows) {
    const src = p.sources.map((s, i) => `[${i + 1}](${s})`).join(" ");
    table += `| \`${p.package}\`<br>${cell(p.label)} | ${cell(p.what)} | **${p.tier}** (UAD-ng: ${p.uad}) | ${cell(p.breaks)} | ${src} |\n`;
  }
}

const readme = readFileSync("README.md", "utf8");
const start = "<!-- packages:start -->";
const end = "<!-- packages:end -->";
const i = readme.indexOf(start);
const j = readme.indexOf(end);
if (i < 0 || j < i) throw new Error("README.md is missing the packages markers");
const next = `${readme.slice(0, i + start.length)}\n${table}\n${readme.slice(j)}`;

if (process.argv.includes("--check")) {
  if (next !== readme) {
    console.error("README.md package table is out of date: run node scripts/readme-table.mjs");
    process.exit(1);
  }
} else {
  writeFileSync("README.md", next);
}
