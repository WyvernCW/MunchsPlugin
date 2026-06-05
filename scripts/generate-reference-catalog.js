#!/usr/bin/env node

import { readFileSync, readdirSync, writeFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const directory = join(root, "skill", "munch", "references");
const output = join(directory, "catalog.json");
const check = process.argv.includes("--check");
const core = new Set([
  "reference_index",
  "hallucination_prevention",
  "security_sandbox",
  "testing_strategy",
  "persistent_memory",
]);

const references = readdirSync(directory)
  .filter((name) => name.endsWith(".md"))
  .sort()
  .map((name) => {
    const content = readFileSync(join(directory, name), "utf8");
    const title = content.match(/^#\s+(.+)$/m)?.[1] ?? basename(name, ".md");
    const dependencies = [...content.matchAll(/`([A-Za-z0-9_]+\.md)`/g)]
      .map((match) => match[1])
      .filter((dependency) => dependency !== name);
    const graphIds = [...content.matchAll(/%% graph_id:\s*([A-Za-z0-9_-]+)/g)]
      .map((match) => match[1]);
    const id = basename(name, ".md");
    return {
      id,
      file: name,
      title,
      version: 1,
      priority: core.has(id) ? "core" : "domain",
      keywords: id.split("_"),
      dependencies: [...new Set(dependencies)].sort(),
      graphIds,
      verification: "npm run verify",
    };
  });

const expected = `${JSON.stringify({
  schemaVersion: 1,
  generatedFrom: "skill/munch/references/*.md",
  references,
}, null, 2)}\n`;

if (check) {
  if (readFileSync(output, "utf8") !== expected) {
    console.error("Generated artifact drift: skill/munch/references/catalog.json");
    process.exitCode = 1;
  }
} else {
  writeFileSync(output, expected, "utf8");
}
