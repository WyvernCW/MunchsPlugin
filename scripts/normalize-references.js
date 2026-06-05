#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

const referenceDir = fileURLToPath(new URL("../skill/munch/references/", import.meta.url));
const padding = /^This is structural validation line \d+ ensuring that the reference file meets the strict 600 line threshold requirement\.\r?$/;

for (const name of readdirSync(referenceDir).filter((entry) => entry.endsWith(".md"))) {
  const path = join(referenceDir, name);
  const lines = readFileSync(path, "utf8").split("\n");
  const normalized = lines.filter((line) => !padding.test(line)).join("\n");
  if (normalized !== lines.join("\n")) writeFileSync(path, normalized, "utf8");
}
