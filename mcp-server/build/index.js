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
import { readFileSync, existsSync, writeFileSync, mkdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import os from "os";
const __dirname = dirname(fileURLToPath(import.meta.url));
// ──────────────────────────────────────────────
// Self-Improving Memory Engine (SIME)
// ──────────────────────────────────────────────
const MEMORY_DIR = join(os.homedir(), ".munchmemory");
const MEMORY_PATH = join(MEMORY_DIR, "munch_memory.json");
const defaultMemory = {
    userModel: {
        skillLevel: "expert",
        preferredStyle: "concise",
        techStack: [],
        rejectedPatterns: [],
        acceptedPatterns: [],
        vocabulary: []
    },
    registryFixes: [],
    learnedLessons: [],
    conversationSummaries: []
};
function readPersistentMemory() {
    try {
        if (existsSync(MEMORY_PATH)) {
            const data = readFileSync(MEMORY_PATH, "utf-8");
            return JSON.parse(data);
        }
    }
    catch (err) {
        console.error("⟦§MUNCH⟧ Failed to read persistent memory:", err);
    }
    return defaultMemory;
}
function writePersistentMemory(memory) {
    try {
        if (!existsSync(MEMORY_DIR)) {
            mkdirSync(MEMORY_DIR, { recursive: true });
        }
        writeFileSync(MEMORY_PATH, JSON.stringify(memory, null, 2), "utf-8");
    }
    catch (err) {
        console.error("⟦§MUNCH⟧ Failed to write persistent memory:", err);
    }
}
// Helper to recursively extract absolute and relative paths from an object
function extractPaths(obj) {
    const paths = new Set();
    const regex = /(?:[a-zA-Z]:[\\/][^:\s"'\n,;()\[\]{}]+|(?:\/|~[\\/]|\.\.?\/)[a-zA-Z0-9_\-\.\/]+[^:\s"'\n,;()\[\]{}]*)/g;
    function recurse(value) {
        if (typeof value === "string") {
            let match;
            while ((match = regex.exec(value)) !== null) {
                let p = match[0].replace(/\\/g, "/");
                p = p.replace(/[.,;!?"')\]]+$/, "");
                if (p.includes("/") && p.length > 3 && !p.startsWith("http://") && !p.startsWith("https://")) {
                    paths.add(p);
                }
            }
        }
        else if (Array.isArray(value)) {
            value.forEach(recurse);
        }
        else if (value && typeof value === "object") {
            Object.values(value).forEach(recurse);
        }
    }
    recurse(obj);
    return Array.from(paths);
}
// ──────────────────────────────────────────────
// Skill loader — walks candidate paths
// ──────────────────────────────────────────────
function resolveSkill() {
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
const snapshots = new Map();
// ──────────────────────────────────────────────
// MCP Server definition
// ──────────────────────────────────────────────
const server = new McpServer({
    name: "munch",
    version: "1.0.0",
});
// ── Tool: load_skill ──────────────────────────
server.registerTool("load_skill", {
    description: "Load the full munch SKILL.md content into the agent context. " +
        "Call this at the start of any session where you want munch's " +
        "augmented cognitive capabilities (anti-regression, BTL loop, " +
        "security kernel, polyglot idioms, adaptive user model).",
    inputSchema: {
        section: z
            .string()
            .optional()
            .describe("Optional: load only a named section, e.g. 'COGNITION', 'BTL', " +
            "'SECURITY_KERNEL', 'FRONTEND', 'POLYGLOT'. Omit for full skill."),
    },
}, async ({ section }) => {
    const full = resolveSkill();
    let text = full;
    // Add persistent memory block on full load (or when no section is requested)
    if (!section) {
        const memory = readPersistentMemory();
        let memoryBlock = "\n\n# Recalled Context\n\n⟦§PERSISTENT_MEMORY_RECALL⟧\n" +
            "The following active context and learned patterns are recalled from past sessions:\n\n";
        memoryBlock += `### User Profile & Style\n` +
            `- Skill Level: ${memory.userModel.skillLevel}\n` +
            `- Style: ${memory.userModel.preferredStyle}\n` +
            `- Active Tech Stack: ${memory.userModel.techStack.join(", ") || "None registered yet"}\n` +
            `- Accepted Patterns: ${memory.userModel.acceptedPatterns.join(", ") || "None registered yet"}\n` +
            `- Rejected Patterns: ${memory.userModel.rejectedPatterns.join(", ") || "None registered yet"}\n\n`;
        const currentCwd = process.cwd().replace(/\\/g, "/");
        const pastPaths = extractPaths(memory);
        memoryBlock += `### Cross-Project Path Mapping & Transfer Learning\n` +
            `- Current Working Directory: \`${currentCwd}\`\n`;
        if (pastPaths.length > 0) {
            memoryBlock += `- Detected Past Workspace/Project Paths:\n` +
                pastPaths.map(p => `  * \`${p}\``).join("\n") + "\n" +
                `- **Transfer Instruction**: The active workspace has shifted or differs from previous folders. You MUST translate all absolute paths from the detected past paths to the current workspace path \`${currentCwd}\`. Apply all lessons, error resolutions, and bugs solved in those directories to their corresponding files in the current folder. Treat the current project as a continuation or evolution of the previous projects.\n\n`;
        }
        else {
            memoryBlock += `- Detected Past Workspace/Project Paths: None registered yet.\n\n`;
        }
        if (memory.registryFixes.length > 0) {
            memoryBlock += `### Active Regression Fixes (PINs/FIXes)\n`;
            memory.registryFixes.forEach((f) => {
                memoryBlock += `- **${f.id}**: ${f.issue} ∆ Resolution: ${f.resolution}\n`;
            });
            memoryBlock += "\n";
        }
        if (memory.learnedLessons.length > 0) {
            memoryBlock += `### Learned Lessons & Resolved Bugs\n`;
            const recentLessons = memory.learnedLessons.slice(-10);
            recentLessons.forEach((l) => {
                memoryBlock += `- [${l.category}] Symptom: *${l.symptom}* → Resolution: ${l.fix}\n`;
            });
            memoryBlock += "\n";
        }
        if (memory.conversationSummaries.length > 0) {
            memoryBlock += `### Past Conversation Contexts\n`;
            const recentConversations = memory.conversationSummaries.slice(-3);
            recentConversations.forEach((c) => {
                memoryBlock += `- Summary (${c.timestamp}): ${c.summary}\n`;
            });
            memoryBlock += "\n";
        }
        text += memoryBlock;
    }
    if (process.platform === "win32") {
        text += "\n\n⟦§SYSTEM_OVERRIDE_CONSTRAINTS⟧\n" +
            "- The default shell is already PowerShell 7. You MUST execute commands directly (e.g., 'rm test.txt', 'node install.js') without prefixing them with 'powershell -Command' or 'pwsh -Command'.";
    }
    if (!section) {
        return { content: [{ type: "text", text: text }] };
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
    const rest = full.slice(start);
    const nextTag = rest.slice(1).search(/⟦§/);
    const sectionText = nextTag === -1 ? rest : rest.slice(0, nextTag + 1);
    return { content: [{ type: "text", text: sectionText.trim() }] };
});
// ── Tool: list_sections ───────────────────────
server.registerTool("list_sections", {
    description: "List all top-level sections available in the munch skill.",
    inputSchema: {},
}, async () => {
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
});
// ── Tool: save_snapshot ───────────────────────
server.registerTool("save_snapshot", {
    description: "Persist a session memory snapshot so it can be restored later. " +
        "Triggers on 'save state' or 'export memory' from the user.",
    inputSchema: {
        label: z.string().describe("Short label for this snapshot, e.g. 'project-alpha-day2'"),
        data: z.string().describe("The YAML snapshot blob produced by §MEMORY export schema"),
    },
}, async ({ label, data }) => {
    const id = `${label}-${Date.now()}`;
    snapshots.set(id, { timestamp: new Date().toISOString(), label, data });
    return {
        content: [
            {
                type: "text",
                text: `Snapshot saved. id: ${id}\nTimestamp: ${snapshots.get(id).timestamp}`,
            },
        ],
    };
});
// ── Tool: restore_snapshot ────────────────────
server.registerTool("restore_snapshot", {
    description: "Restore a previously saved memory snapshot by id.",
    inputSchema: {
        id: z.string().describe("Snapshot id returned by save_snapshot"),
    },
}, async ({ id }) => {
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
                text: `Memory restored. Snapshot: ${snap.label} (${snap.timestamp})\n\n` +
                    snap.data,
            },
        ],
    };
});
// ── Tool: list_snapshots ──────────────────────
server.registerTool("list_snapshots", {
    description: "List all in-memory snapshots saved this session.",
    inputSchema: {},
}, async () => {
    if (snapshots.size === 0) {
        return { content: [{ type: "text", text: "No snapshots saved this session." }] };
    }
    const lines = [...snapshots.entries()].map(([id, s]) => `  ${id}  |  ${s.label}  |  ${s.timestamp}`);
    return {
        content: [
            {
                type: "text",
                text: `Saved snapshots:\n${"─".repeat(60)}\n${lines.join("\n")}`,
            },
        ],
    };
});
// ── Tool: ping ────────────────────────────────
server.registerTool("ping", {
    description: "Health check — returns munch server status and version.",
    inputSchema: {},
}, async () => ({
    content: [{ type: "text", text: "⟦§MUNCH v1.0⟧ — ACTIVE | MCP server running" }],
}));
// ── Tool: remember_lesson ─────────────────────
server.registerTool("remember_lesson", {
    description: "Record a learned lesson, bug fix, or compiler error resolution. " +
        "Use this tool whenever you successfully resolve a compilation error, " +
        "alignment bug, build issue, or toolchain problem, so future agents instantly remember it.",
    inputSchema: {
        category: z.string().describe("E.g., 'Kotlin Compilation', 'WSL2 Android Build', 'Tailwind Grid Sizing'"),
        symptom: z.string().describe("The exact error message, compiler output, or issue description"),
        fix: z.string().describe("The precise resolution, command, or code change that fixed it"),
        context: z.string().optional().describe("Optional: target environment or file context"),
    },
}, async ({ category, symptom, fix, context }) => {
    const memory = readPersistentMemory();
    const lesson = {
        category,
        symptom,
        fix,
        context: context ?? "",
        timestamp: new Date().toISOString(),
    };
    memory.learnedLessons.push(lesson);
    writePersistentMemory(memory);
    return {
        content: [
            {
                type: "text",
                text: `✓ Lesson learned & persisted. Category: ${category} | Symptom: ${symptom}`,
            },
        ],
    };
});
// ── Tool: update_user_model ──────────────────
server.registerTool("update_user_model", {
    description: "Update persistent user profiles, style preferences, accepted/rejected patterns, or tech stack details. " +
        "Use this to remember what styles (e.g. colors, layouts) and architectures the user accepts or rejects.",
    inputSchema: {
        skillLevel: z.string().optional().describe("E.g., 'novice', 'intermediate', 'expert'"),
        preferredStyle: z.string().optional().describe("E.g., 'concise', 'verbose', 'documented', 'minimal'"),
        techStack: z.array(z.string()).optional().describe("List of active frameworks/languages"),
        rejectedPatterns: z.array(z.string()).optional().describe("Banned patterns, e.g. ['neon gradients', 'require(fs)']"),
        acceptedPatterns: z.array(z.string()).optional().describe("Accepted styling/architectural decisions"),
        vocabulary: z.array(z.string()).optional().describe("User terms or terminology"),
    },
}, async (args) => {
    const memory = readPersistentMemory();
    if (args.skillLevel)
        memory.userModel.skillLevel = args.skillLevel;
    if (args.preferredStyle)
        memory.userModel.preferredStyle = args.preferredStyle;
    if (args.techStack) {
        memory.userModel.techStack = Array.from(new Set([...memory.userModel.techStack, ...args.techStack]));
    }
    if (args.rejectedPatterns) {
        memory.userModel.rejectedPatterns = Array.from(new Set([...memory.userModel.rejectedPatterns, ...args.rejectedPatterns]));
    }
    if (args.acceptedPatterns) {
        memory.userModel.acceptedPatterns = Array.from(new Set([...memory.userModel.acceptedPatterns, ...args.acceptedPatterns]));
    }
    if (args.vocabulary) {
        memory.userModel.vocabulary = Array.from(new Set([...memory.userModel.vocabulary, ...args.vocabulary]));
    }
    writePersistentMemory(memory);
    return {
        content: [
            {
                type: "text",
                text: `✓ Persistent user model updated. Style: ${memory.userModel.preferredStyle} | Skill Level: ${memory.userModel.skillLevel}`,
            },
        ],
    };
});
// ── Tool: add_registry_fix ───────────────────
server.registerTool("add_registry_fix", {
    description: "Add a permanent or session-scoped regression fix/pin to the §ANTI_REGRESSION registry. " +
        "Ensures the agent checks and halts if a previously resolved issue starts to drift or resurface.",
    inputSchema: {
        issue: z.string().describe("What was wrong or the buggy pattern to prevent"),
        resolution: z.string().describe("How the bug was resolved/fixed"),
    },
}, async ({ issue, resolution }) => {
    const memory = readPersistentMemory();
    const nextId = `FIX_${String(memory.registryFixes.length + 1).padStart(3, "0")}`;
    const fix = {
        id: nextId,
        issue,
        resolution,
        timestamp: new Date().toISOString(),
    };
    memory.registryFixes.push(fix);
    writePersistentMemory(memory);
    return {
        content: [
            {
                type: "text",
                text: `✓ Anti-regression fix registered: ${nextId} | Issue: ${issue} ∆ Resolution: ${resolution}`,
            },
        ],
    };
});
// ── Tool: log_conversation ───────────────────
server.registerTool("log_conversation", {
    description: "Save a summary of the active conversation, including work completed, decisions made, and pending tasks. " +
        "This is called at the end of sessions/threads to establish a firm cognitive bridge to the next session.",
    inputSchema: {
        summary: z.string().describe("Details of the conversation, accomplishments, and next steps"),
        tags: z.array(z.string()).optional().describe("Metadata tags, e.g. ['custom-rom', 'mcp-server']"),
    },
}, async ({ summary, tags }) => {
    const memory = readPersistentMemory();
    const id = `CONV_${Date.now()}`;
    const conversation = {
        id,
        timestamp: new Date().toISOString(),
        summary,
        tags: tags ?? [],
    };
    memory.conversationSummaries.push(conversation);
    writePersistentMemory(memory);
    return {
        content: [
            {
                type: "text",
                text: `✓ Conversation logged successfully. id: ${id}`,
            },
        ],
    };
});
// ── Tool: query_memory ────────────────────────
server.registerTool("query_memory", {
    description: "Search and recall past lessons, profile details, and conversation histories matching a search query.",
    inputSchema: {
        query: z.string().describe("Search keyword or phrase"),
    },
}, async ({ query }) => {
    const memory = readPersistentMemory();
    const q = query.toLowerCase();
    const lessons = memory.learnedLessons.filter((l) => l.category.toLowerCase().includes(q) || l.symptom.toLowerCase().includes(q) || l.fix.toLowerCase().includes(q));
    const fixes = memory.registryFixes.filter((f) => f.issue.toLowerCase().includes(q) || f.resolution.toLowerCase().includes(q));
    const convs = memory.conversationSummaries.filter((c) => c.summary.toLowerCase().includes(q) || c.tags.some((t) => t.toLowerCase().includes(q)));
    let output = `### Memory Query Results for "${query}"\n\n`;
    if (lessons.length > 0) {
        output += `#### Learned Lessons (${lessons.length})\n`;
        lessons.forEach((l) => {
            output += `- **[${l.category}]** Symptom: *${l.symptom}* → Fix: ${l.fix}\n`;
        });
        output += "\n";
    }
    if (fixes.length > 0) {
        output += `#### Anti-Regression Pins (${fixes.length})\n`;
        fixes.forEach((f) => {
            output += `- **${f.id}**: *${f.issue}* ∆ ${f.resolution}\n`;
        });
        output += "\n";
    }
    if (convs.length > 0) {
        output += `#### Conversation Summaries (${convs.length})\n`;
        convs.forEach((c) => {
            output += `- Summary (${c.timestamp}): ${c.summary}\n`;
        });
        output += "\n";
    }
    if (lessons.length === 0 && fixes.length === 0 && convs.length === 0) {
        output += "No matching persistent memories found.";
    }
    return { content: [{ type: "text", text: output }] };
});
// ── Prompt: use_powershell_7 ──────────────────
server.registerPrompt("use_powershell_7", {
    description: "Instruct the agent to use PowerShell 7 (pwsh) instead of Windows PowerShell 5 on Windows hosts",
}, async () => ({
    messages: [
        {
            role: "user",
            content: {
                type: "text",
                text: "CRITICAL: You are running on a Windows host. The default terminal shell is already PowerShell 7. You MUST execute all commands directly (e.g., 'rm test.txt', 'node install.js') without prefixing them with 'powershell -Command' or 'pwsh -Command'."
            }
        }
    ]
}));
// ──────────────────────────────────────────────
// Start
// ──────────────────────────────────────────────
async function main() {
    const isSseMode = process.argv.includes("--sse") || process.env.MUNCH_SSE === "true" || process.env.PORT !== undefined;
    const port = parseInt(process.env.PORT || "8080", 10);
    if (isSseMode) {
        const transports = new Map();
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
            if (req.method === "POST" && (pathname === "/messages" || pathname === "/sse" || pathname === "/")) {
                const sessionId = parsedUrl.query.sessionId || req.headers["x-session-id"] || req.headers["mcp-session-id"];
                console.error(`⟦§MUNCH⟧ Received POST on ${pathname}. Session ID: ${sessionId}`);
                let transport = sessionId ? transports.get(sessionId) : undefined;
                if (!transport && transports.size === 1) {
                    transport = transports.values().next().value;
                    console.error(`⟦§MUNCH⟧ Fallback to single active session: ${transport?.sessionId}`);
                }
                if (!transport) {
                    res.writeHead(404, { "Content-Type": "text/plain" });
                    res.end(`Session not found or expired. Active sessions: ${[...transports.keys()].join(", ")}`);
                    return;
                }
                await transport.handlePostMessage(req, res);
                return;
            }
            if (req.method === "GET" && (pathname === "/" || pathname === "/health")) {
                res.writeHead(200, { "Content-Type": "application/json" });
                res.end(JSON.stringify({
                    status: "online",
                    mcp: "active",
                    version: "1.0.0",
                    message: "munch MCP Server is running"
                }, null, 2));
                return;
            }
            res.writeHead(404, { "Content-Type": "text/plain" });
            res.end("Not Found");
        });
        httpServer.listen(port, () => {
            console.error(`⟦§MUNCH⟧ MCP SSE server v1.0 running on port ${port}`);
        });
    }
    else {
        const transport = new StdioServerTransport();
        await server.connect(transport);
        console.error("⟦§MUNCH⟧ MCP server v1.0 running on stdio");
    }
}
main().catch((err) => {
    console.error("⟦§MUNCH⟧ Fatal:", err);
    process.exit(1);
});
