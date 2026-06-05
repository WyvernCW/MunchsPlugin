/**
 * munch — OpenCode Plugin v1.0
 * Injects the munch skill into sessions automatically.
 * Drop into .opencode/plugins/ or ~/.config/opencode/plugins/
 */

import type { Plugin } from "@opencode-ai/plugin";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function loadSkill(): string {
  const candidates = [
    join(__dirname, "../skill/munch/SKILL.md"),
    join(__dirname, "SKILL.md"),
    join(process.env.HOME ?? "~", ".claude/skills/munch/SKILL.md"),
    join(process.env.HOME ?? "~", ".agents/skills/munch/SKILL.md"),
  ];

  for (const p of candidates) {
    if (existsSync(p)) {
      const full = readFileSync(p, "utf-8");
      if (process.env.MUNCH_OPENCODE_FULL_SKILL === "true") return full;
      const sections = ["BOOTLOADER", "DISPATCH", "ANTI_REGRESSION", "EXECUTION", "CONSTRAINTS"];
      const compact = sections
        .map((name) => extractSection(full, name))
        .filter(Boolean)
        .join("\n\n");
      return `⟦§MUNCH COMPACT KERNEL⟧\n${compact}\n\nUse reference_index.md and load only task-relevant supporting references.`;
    }
  }

  // Inline fallback — minimal kernel so plugin never silently fails
  return `⟦§MUNCH v1.0⟧
id: munch | state: always_active | mode: autonomous
scope: code + design + security + analysis + architecture
Augmented cognitive agent — anti-regression, adaptive intelligence, BTL loop, OWASP security scan, polyglot code quality. Full SKILL.md not found; place skill/munch/SKILL.md adjacent to plugin.`;
}

function extractSection(full: string, name: string): string {
  const marker = `⟦§${name}⟧`;
  const start = full.indexOf(marker);
  if (start === -1) return "";
  const next = full.indexOf("\n⟦§", start + marker.length);
  return full.slice(start, next === -1 ? full.length : next).trim();
}

export const MunchPlugin: Plugin = async ({ client }) => {
  const skill = loadSkill();

  return {
    // Inject munch kernel on every new session
    "session.created": async () => {
      await client.session.addMessage?.({
        role: "user",
        content: `[munch skill loaded]\n\n${skill}`,
        metadata: { noReply: true },
      }).catch((error) => {
        console.error("[munch] Failed to inject compact skill:", error);
      });
    },

    // Re-inject after compaction so the kernel survives context resets
    "session.compacted": async () => {
      await client.session.addMessage?.({
        role: "user",
        content: `[munch skill re-injected after compaction]\n\n${skill}`,
        metadata: { noReply: true },
      }).catch((error) => {
        console.error("[munch] Failed to re-inject compact skill:", error);
      });
    },
  };
};

export default MunchPlugin;
