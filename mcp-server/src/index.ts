#!/usr/bin/env node
/**
 * munch MCP Server v1.0
 * Exposes the munch skill as MCP tools so any MCP-compatible host
 * (Claude Code, Claude.ai, OpenCode, KiloCode, Codex, Antigravity, etc.)
 * can load and query the skill programmatically.
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { SSEServerTransport } from "@modelcontextprotocol/sdk/server/sse.js";
import { createServer } from "http";
import { parse as parseUrl } from "url";
import { z } from "zod";
import { readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

// ──────────────────────────────────────────────
// Skill loader — walks candidate paths
// ──────────────────────────────────────────────
function resolveSkill(): string {
  const candidates = [
    join(__dirname, "../../skill/munch/SKILL.md"),
    join(__dirname, "../skill/munch/SKILL.md"),
    join(process.env.HOME ?? "", ".claude/skills/munch/SKILL.md"),
    join(process.env.HOME ?? "", ".agents/skills/munch/SKILL.md"),
    join(process.env.HOME ?? "", ".kilocode/skills/munch/SKILL.md"),
    join(process.env.HOME ?? "", ".gemini/skills/munch/SKILL.md"),
    join(process.env.HOME ?? "", ".opencode/skills/munch/SKILL.md"),
    // Allow override via env
    process.env.MUNCH_SKILL_PATH ?? "",
  ].filter(Boolean);

  for (const p of candidates) {
    if (existsSync(p)) {
      return readFileSync(p, "utf-8");
    }
  }

  return "SKILL.md not found. Set MUNCH_SKILL_PATH env var or place skill/munch/SKILL.md next to the server.";
}

// ──────────────────────────────────────────────
// Snapshot store (in-memory, session-scoped)
// ──────────────────────────────────────────────
interface Snapshot {
  timestamp: string;
  label: string;
  data: string;
}

const snapshots: Map<string, Snapshot> = new Map();

// ──────────────────────────────────────────────
// MCP Server definition
// ──────────────────────────────────────────────
const server = new McpServer({
  name: "munch",
  version: "1.0.0",
});

// ── Tool: load_skill ──────────────────────────
server.registerTool(
  "load_skill",
  {
    description:
      "Load the full munch SKILL.md content into the agent context. " +
      "Call this at the start of any session where you want munch's " +
      "augmented cognitive capabilities (anti-regression, BTL loop, " +
      "security kernel, polyglot idioms, adaptive user model).",
    inputSchema: {
      section: z
        .string()
        .optional()
        .describe(
          "Optional: load only a named section, e.g. 'COGNITION', 'BTL', " +
          "'SECURITY_KERNEL', 'FRONTEND', 'POLYGLOT'. Omit for full skill."
        ),
    },
  },
  async ({ section }) => {
    const full = resolveSkill();
    if (!section) {
      return { content: [{ type: "text", text: full }] };
    }

    const tag = `⟦§${section.toUpperCase()}⟧`;
    const start = full.indexOf(tag);
    if (start === -1) {
      return {
        content: [
          {
            type: "text",
            text: `Section "${section}" not found. Available sections:\n` +
              [...full.matchAll(/⟦§(\w+)⟧/g)].map((m) => m[1]).join(", "),
          },
        ],
      };
    }

    // Extract section until next ⟦§ tag or end of file
    const rest = full.slice(start);
    const nextTag = rest.slice(1).search(/⟦§/);
    const sectionText = nextTag === -1 ? rest : rest.slice(0, nextTag + 1);

    return { content: [{ type: "text", text: sectionText.trim() }] };
  }
);

// ── Tool: list_sections ───────────────────────
server.registerTool(
  "list_sections",
  {
    description: "List all top-level sections available in the munch skill.",
    inputSchema: {},
  },
  async () => {
    const full = resolveSkill();
    const matches = [...full.matchAll(/⟦§(\w+)⟧/g)].map((m) => m[1]);
    return {
      content: [
        {
          type: "text",
          text: matches.length
            ? `munch v1.0 sections:\n${matches.map((s) => `  • ${s}`).join("\n")}`
            : "No sections found — check SKILL.md path.",
        },
      ],
    };
  }
);

// ── Tool: save_snapshot ───────────────────────
server.registerTool(
  "save_snapshot",
  {
    description:
      "Persist a session memory snapshot so it can be restored later. " +
      "Triggers on 'save state' or 'export memory' from the user.",
    inputSchema: {
      label: z.string().describe("Short label for this snapshot, e.g. 'project-alpha-day2'"),
      data: z.string().describe("The YAML snapshot blob produced by §MEMORY export schema"),
    },
  },
  async ({ label, data }) => {
    const id = `${label}-${Date.now()}`;
    snapshots.set(id, { timestamp: new Date().toISOString(), label, data });
    return {
      content: [
        {
          type: "text",
          text: `Snapshot saved. id: ${id}\nTimestamp: ${snapshots.get(id)!.timestamp}`,
        },
      ],
    };
  }
);

// ── Tool: restore_snapshot ────────────────────
server.registerTool(
  "restore_snapshot",
  {
    description: "Restore a previously saved memory snapshot by id.",
    inputSchema: {
      id: z.string().describe("Snapshot id returned by save_snapshot"),
    },
  },
  async ({ id }) => {
    const snap = snapshots.get(id);
    if (!snap) {
      const available = [...snapshots.keys()].join(", ") || "(none)";
      return {
        content: [
          { type: "text", text: `Snapshot "${id}" not found. Available: ${available}` },
        ],
      };
    }
    return {
      content: [
        {
          type: "text",
          text:
            `Memory restored. Snapshot: ${snap.label} (${snap.timestamp})\n\n` +
            snap.data,
        },
      ],
    };
  }
);

// ── Tool: list_snapshots ──────────────────────
server.registerTool(
  "list_snapshots",
  {
    description: "List all in-memory snapshots saved this session.",
    inputSchema: {},
  },
  async () => {
    if (snapshots.size === 0) {
      return { content: [{ type: "text", text: "No snapshots saved this session." }] };
    }
    const lines = [...snapshots.entries()].map(
      ([id, s]) => `  ${id}  |  ${s.label}  |  ${s.timestamp}`
    );
    return {
      content: [
        {
          type: "text",
          text: `Saved snapshots:\n${"─".repeat(60)}\n${lines.join("\n")}`,
        },
      ],
    };
  }
);

// ── Tool: ping ────────────────────────────────
server.registerTool(
  "ping",
  {
    description: "Health check — returns munch server status and version.",
    inputSchema: {},
  },
  async () => ({
    content: [{ type: "text", text: "⟦§MUNCH v1.0⟧ — ACTIVE | MCP server running" }],
  })
);

// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
async function main(): Promise<void> {
  const isSseMode = process.argv.includes("--sse") || process.env.MUNCH_SSE === "true" || process.env.PORT !== undefined;
  const port = parseInt(process.env.PORT || "8080", 10);

  if (isSseMode) {
    const transports = new Map<string, SSEServerTransport>();

    const httpServer = createServer(async (req, res) => {
      // CORS headers
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Content-Type, x-session-id");

      if (req.method === "OPTIONS") {
        res.writeHead(200);
        res.end();
        return;
      }

      const parsedUrl = parseUrl(req.url || "", true);
      const pathname = parsedUrl.pathname;

      if (req.method === "GET" && pathname === "/sse") {
        const transport = new SSEServerTransport("/messages", res);
        transports.set(transport.sessionId, transport);
        
        await server.connect(transport);
        console.error(`⟦§MUNCH⟧ SSE Client connected. Session: ${transport.sessionId}`);

        req.on("close", () => {
          transports.delete(transport.sessionId);
          console.error(`⟦§MUNCH⟧ SSE Client disconnected. Session: ${transport.sessionId}`);
        });
        return;
      }

      if (req.method === "POST" && pathname === "/messages") {
        const sessionId = parsedUrl.query.sessionId as string;
        const transport = transports.get(sessionId);
        if (!transport) {
          res.writeHead(404, { "Content-Type": "text/plain" });
          res.end("Session not found or expired");
          return;
        }
        await transport.handlePostMessage(req, res);
        return;
      }

      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not Found");
    });

    httpServer.listen(port, () => {
      console.error(`⟦§MUNCH⟧ MCP SSE server v1.0 running on port ${port}`);
    });
  } else {
    const transport = new StdioServerTransport();
    await server.connect(transport);
    console.error("⟦§MUNCH⟧ MCP server v1.0 running on stdio");
  }
}

main().catch((err) => {
  console.error("⟦§MUNCH⟧ Fatal:", err);
  process.exit(1);
});
