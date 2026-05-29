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
    if (existsSync(p)) return readFileSync(p, "utf-8");
  }

  // Inline fallback — minimal kernel so plugin never silently fails
  return `⟦§MUNCH v1.0⟧
id: munch | state: always_active | mode: autonomous
scope: code + design + security + analysis + architecture
Augmented cognitive agent — anti-regression, adaptive intelligence, BTL loop, OWASP security scan, polyglot code quality. Full SKILL.md not found; place skill/munch/SKILL.md adjacent to plugin.`;
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
      }).catch(() => {
        // Non-fatal — older SDK versions may not support addMessage
      });
    },

    // Re-inject after compaction so the kernel survives context resets
    "session.compacted": async () => {
      await client.session.addMessage?.({
        role: "user",
        content: `[munch skill re-injected after compaction]\n\n${skill}`,
        metadata: { noReply: true },
      }).catch(() => {});
    },
  };
};

export default MunchPlugin;
