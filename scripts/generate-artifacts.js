#!/usr/bin/env node

import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const check = process.argv.includes("--check");
const canonicalHostDoc = readFileSync(join(root, "AGENT.md"), "utf8");
const packageJson = JSON.parse(readFileSync(join(root, "package.json"), "utf8"));

const outputs = new Map([
  ["AGENTS.md", canonicalHostDoc],
  ["CLAUDE.md", canonicalHostDoc],
  ["GEMINI.md", canonicalHostDoc],
]);

for (const manifest of ["plugin.json", ".codex-plugin/plugin.json"]) {
  const path = join(root, manifest);
  const parsed = JSON.parse(readFileSync(path, "utf8"));
  parsed.version = packageJson.version;
  outputs.set(manifest, `${JSON.stringify(parsed, null, 2)}\n`);
}

let drift = false;
for (const [relative, expected] of outputs) {
  const path = join(root, relative);
  const actual = readFileSync(path, "utf8");
  if (actual === expected) continue;
  drift = true;
  if (!check) writeFileSync(path, expected, "utf8");
  else console.error(`Generated artifact drift: ${relative}`);
}

if (check && drift) process.exitCode = 1;
