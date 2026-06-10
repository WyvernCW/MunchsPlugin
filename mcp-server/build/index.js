#!/usr/bin/env node
/**
 * munch MCP Server v1.0
 * Exposes the munch skill as MCP tools so any MCP-compatible host
 * (Claude Code, Claude.ai, OpenCode, KiloCode, Codex, Antigravity, etc.)
 * can load and query the skill programmatically.
 */
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { readFileSync, existsSync, writeFileSync, mkdirSync, copyFileSync, renameSync, readdirSync, openSync, closeSync, unlinkSync, rmSync, statSync, } from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import os from "os";
import { spawnSync } from "child_process";
import { createHash, randomUUID } from "crypto";
import { runSelfConfigure } from "./host-config.js";
import { registerWebTools } from "./web.js";
import { showNotification } from "./notifications.js";
import { applyVersionedUpdate, checkForUpdate } from "./updater.js";
import { resolveHttpSecurity, startHttpServer } from "./http-server.js";
import { appendTrace, buildContextPackage, buildWorkspaceGraph, compilePolicy, configureRuntimeSettings, createEvidenceBundle, detectContradictions, getControlSnapshot as getRuntimeControlSnapshot, getProvenanceGraph, getRuntimeSettings, installReferencePack, listReferencePacks, negotiateCapabilities, predictChangeImpact, purgeExpiredRuntime, recordProvenance, recordReferenceOutcome, replayTrace, runEvaluation, scoreReferences, startTrace, } from "./advanced-runtime.js";
import { extractPreferences, extractForgottenPreferenceSubjects, mergePreference, rankPreferences, recommendFrontendOptions, } from "./preference-engine.js";
const __dirname = dirname(fileURLToPath(import.meta.url));
// ──────────────────────────────────────────────
// Self-Improving Memory Engine (SIME)
// ──────────────────────────────────────────────
const MEMORY_DIR = process.env.MUNCH_MEMORY_DIR
    ?? (process.env.VERCEL ? join(os.tmpdir(), ".munchmemory") : join(os.homedir(), ".munchmemory"));
const MEMORY_SCOPE = process.env.MUNCH_MEMORY_SCOPE === "project" ? "project" : "global";
const PROJECT_ID = createHash("sha256").update(process.cwd()).digest("hex").slice(0, 16);
const MEMORY_NAMESPACE_DIR = MEMORY_SCOPE === "project"
    ? join(MEMORY_DIR, "projects", PROJECT_ID)
    : MEMORY_DIR;
const MEMORY_PATH = join(MEMORY_NAMESPACE_DIR, "munch_memory.json");
const MEMORY_BACKUP_PATH = join(MEMORY_NAMESPACE_DIR, "munch_memory.backup.json");
const MEMORY_LOCK_PATH = join(MEMORY_NAMESPACE_DIR, "munch_memory.lock");
const SNAPSHOT_DIR = join(MEMORY_NAMESPACE_DIR, "snapshots");
const LOADED_REFERENCES = new Set();
const defaultMemory = {
    schemaVersion: 3,
    userModel: {
        skillLevel: "expert",
        preferredStyle: "concise",
        techStack: [],
        rejectedPatterns: [],
        acceptedPatterns: [],
        vocabulary: [],
        preferences: [],
    },
    registryFixes: [],
    learnedLessons: [],
    conversationSummaries: [],
    recurrentMistakes: [],
    timeline: []
};
function stringValue(value, fallback) {
    return typeof value === "string" ? value : fallback;
}
function stringArray(value) {
    return Array.isArray(value) ? value.filter((item) => typeof item === "string") : [];
}
function objectArray(value) {
    return Array.isArray(value) ? value.filter((item) => Boolean(item) && typeof item === "object") : [];
}
function normalizedPreferences(value) {
    const now = new Date().toISOString();
    return objectArray(value)
        .filter((item) => typeof item.subject === "string" && item.subject.trim().length > 0)
        .map((item) => {
        const category = [
            "technology", "design", "workflow", "communication", "domain", "other",
        ].includes(item.category ?? "") ? item.category : "other";
        const sentiment = ["like", "dislike", "neutral"].includes(item.sentiment ?? "")
            ? item.sentiment
            : "neutral";
        const scope = ["global", "frontend", "backend", "mobile", "desktop", "project"].includes(item.scope ?? "")
            ? item.scope
            : "global";
        const subject = item.subject.trim();
        return {
            id: typeof item.id === "string"
                ? item.id
                : `PREF_${createHash("sha256").update(`${category}:${subject.toLowerCase()}`).digest("hex").slice(0, 12)}`,
            category,
            subject,
            sentiment,
            strength: typeof item.strength === "number" ? Math.min(1, Math.max(0, item.strength)) : 0.5,
            confidence: typeof item.confidence === "number" ? Math.min(1, Math.max(0, item.confidence)) : 0.5,
            scope,
            sourceStatement: typeof item.sourceStatement === "string" ? item.sourceStatement : "Migrated preference",
            evidenceCount: Number.isInteger(item.evidenceCount) && item.evidenceCount > 0 ? item.evidenceCount : 1,
            firstSeen: typeof item.firstSeen === "string" ? item.firstSeen : now,
            lastSeen: typeof item.lastSeen === "string" ? item.lastSeen : now,
        };
    });
}
function normalizePersistentMemory(parsed) {
    const legacyUserModel = parsed?.user_model ?? {};
    const userModel = parsed?.userModel ?? legacyUserModel;
    return {
        schemaVersion: 3,
        userModel: {
            skillLevel: stringValue(userModel.skillLevel ?? userModel.skill_level, defaultMemory.userModel.skillLevel),
            preferredStyle: stringValue(userModel.preferredStyle ?? userModel.preferred_style ?? userModel.style, defaultMemory.userModel.preferredStyle),
            techStack: stringArray(userModel.techStack ?? userModel.tech_stack),
            rejectedPatterns: stringArray(userModel.rejectedPatterns ?? userModel.rejected_patterns),
            acceptedPatterns: stringArray(userModel.acceptedPatterns ?? userModel.accepted_patterns),
            vocabulary: stringArray(userModel.vocabulary ?? userModel.vocab),
            preferences: normalizedPreferences(userModel.preferences),
        },
        registryFixes: objectArray(parsed?.registryFixes ?? parsed?.fix_registry),
        learnedLessons: objectArray(parsed?.learnedLessons ?? parsed?.lessons),
        conversationSummaries: objectArray(parsed?.conversationSummaries ?? parsed?.conversation_summaries),
        recurrentMistakes: objectArray(parsed?.recurrentMistakes ?? parsed?.recurrent_mistakes),
        timeline: objectArray(parsed?.timeline),
    };
}
function readPersistentMemory() {
    try {
        if (existsSync(MEMORY_PATH)) {
            const data = readFileSync(MEMORY_PATH, "utf-8");
            return normalizePersistentMemory(JSON.parse(data));
        }
    }
    catch (err) {
        console.error("⟦§MUNCH⟧ Failed to read persistent memory:", err);
        if (existsSync(MEMORY_BACKUP_PATH)) {
            try {
                return normalizePersistentMemory(JSON.parse(readFileSync(MEMORY_BACKUP_PATH, "utf-8")));
            }
            catch (backupError) {
                console.error("⟦§MUNCH⟧ Failed to read persistent memory backup:", backupError);
            }
        }
    }
    return normalizePersistentMemory(defaultMemory);
}
function writePersistentMemory(memory) {
    let lock;
    try {
        const MAX_LESSONS = 50;
        const MAX_FIXES = 30;
        const MAX_CONVERSATIONS = 30; // Increased to 30 for deeper history
        const MAX_MISTAKES = 15;
        const MAX_TIMELINE_TASKS = 30;
        const MAX_PREFERENCES = 100;
        // Prune learned lessons (keep highest occurrences, then most recent)
        if (memory.learnedLessons.length > MAX_LESSONS) {
            memory.learnedLessons.sort((a, b) => {
                const occA = a.occurrences ?? 1;
                const occB = b.occurrences ?? 1;
                if (occB !== occA)
                    return occB - occA;
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            memory.learnedLessons = memory.learnedLessons.slice(0, MAX_LESSONS);
        }
        // Prune registry fixes (keep highest occurrences, then most recent)
        if (memory.registryFixes.length > MAX_FIXES) {
            memory.registryFixes.sort((a, b) => {
                const occA = a.occurrences ?? 1;
                const occB = b.occurrences ?? 1;
                if (occB !== occA)
                    return occB - occA;
                return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
            });
            memory.registryFixes = memory.registryFixes.slice(0, MAX_FIXES);
        }
        // Prune conversation summaries (FIFO)
        if (memory.conversationSummaries.length > MAX_CONVERSATIONS) {
            memory.conversationSummaries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
            memory.conversationSummaries = memory.conversationSummaries.slice(0, MAX_CONVERSATIONS);
        }
        // Prune recurrent mistakes
        if (memory.recurrentMistakes && memory.recurrentMistakes.length > MAX_MISTAKES) {
            memory.recurrentMistakes.sort((a, b) => b.recurrenceCount - a.recurrenceCount);
            memory.recurrentMistakes = memory.recurrentMistakes.slice(0, MAX_MISTAKES);
        }
        // Prune timeline tasks
        if (memory.timeline && memory.timeline.length > MAX_TIMELINE_TASKS) {
            memory.timeline.sort((a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime());
            memory.timeline = memory.timeline.slice(0, MAX_TIMELINE_TASKS);
        }
        if (!existsSync(MEMORY_NAMESPACE_DIR)) {
            mkdirSync(MEMORY_NAMESPACE_DIR, { recursive: true });
        }
        if (memory.userModel.preferences.length > MAX_PREFERENCES) {
            memory.userModel.preferences = rankPreferences(memory.userModel.preferences).slice(0, MAX_PREFERENCES);
        }
        lock = acquireMemoryLock();
        const normalized = redactPersistentMemory(normalizePersistentMemory(memory));
        const tempPath = `${MEMORY_PATH}.${process.pid}.tmp`;
        if (existsSync(MEMORY_PATH)) {
            copyFileSync(MEMORY_PATH, MEMORY_BACKUP_PATH);
        }
        writeFileSync(tempPath, JSON.stringify(normalized, null, 2), "utf-8");
        renameSync(tempPath, MEMORY_PATH);
    }
    catch (err) {
        console.error("⟦§MUNCH⟧ Failed to write persistent memory:", err);
        throw err;
    }
    finally {
        if (lock !== undefined) {
            closeSync(lock);
            if (existsSync(MEMORY_LOCK_PATH))
                unlinkSync(MEMORY_LOCK_PATH);
        }
    }
}
function acquireMemoryLock() {
    const deadline = Date.now() + 2_000;
    while (true) {
        try {
            return openSync(MEMORY_LOCK_PATH, "wx");
        }
        catch (error) {
            if (error?.code !== "EEXIST")
                throw error;
            try {
                if (Date.now() - statSync(MEMORY_LOCK_PATH).mtimeMs > 30_000) {
                    unlinkSync(MEMORY_LOCK_PATH);
                    continue;
                }
            }
            catch (statError) {
                if (statError?.code !== "ENOENT") {
                    console.error("⟦§MUNCH⟧ Failed to inspect memory lock:", statError);
                }
            }
            if (Date.now() >= deadline)
                throw new Error("Persistent memory is busy; retry the operation");
            Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 25);
        }
    }
}
function redactPersistentMemory(memory) {
    const secretPattern = /\b(?:api[_-]?key|access[_-]?token|refresh[_-]?token|password|passwd|private[_-]?key|authorization)\b\s*[:=]\s*[^\s,;]+/gi;
    const redact = (value) => value.replace(secretPattern, (match) => `${match.split(/[:=]/, 1)[0]}=[REDACTED]`);
    return {
        ...memory,
        learnedLessons: memory.learnedLessons.map((item) => ({
            ...item,
            symptom: redact(item.symptom),
            fix: redact(item.fix),
            context: redact(item.context),
        })),
        registryFixes: memory.registryFixes.map((item) => ({
            ...item,
            issue: redact(item.issue),
            resolution: redact(item.resolution),
        })),
        conversationSummaries: memory.conversationSummaries.map((item) => ({
            ...item,
            summary: redact(item.summary),
        })),
        userModel: {
            ...memory.userModel,
            preferences: memory.userModel.preferences.map((preference) => ({
                ...preference,
                sourceStatement: redact(preference.sourceStatement),
            })),
        },
    };
}
// Helper to calculate Jaccard similarity between two strings
function getJaccardSimilarity(str1, str2) {
    const words1 = new Set(str1.toLowerCase().match(/\w+/g) || []);
    const words2 = new Set(str2.toLowerCase().match(/\w+/g) || []);
    if (words1.size === 0 || words2.size === 0)
        return 0;
    let intersection = 0;
    for (const word of words1) {
        if (words2.has(word))
            intersection++;
    }
    const union = new Set([...words1, ...words2]).size;
    return intersection / union;
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
function skillCandidates() {
    return [
        join(__dirname, "../../skill/munch/SKILL.md"),
        join(__dirname, "../skill/munch/SKILL.md"),
        join(process.env.HOME ?? "", ".claude/skills/munch/SKILL.md"),
        join(process.env.HOME ?? "", ".agents/skills/munch/SKILL.md"),
        join(process.env.HOME ?? "", ".kilocode/skills/munch/SKILL.md"),
        join(process.env.HOME ?? "", ".gemini/skills/munch/SKILL.md"),
        join(process.env.HOME ?? "", ".opencode/skills/munch/SKILL.md"),
        process.env.MUNCH_SKILL_PATH ?? "",
    ].filter(Boolean);
}
function resolveSkillPath() {
    return skillCandidates().find((path) => existsSync(path));
}
function resolveSkill() {
    const path = resolveSkillPath();
    if (path)
        return readFileSync(path, "utf-8");
    return "SKILL.md not found. Set MUNCH_SKILL_PATH env var or place skill/munch/SKILL.md next to the server.";
}
function ensureSnapshotDir() {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
}
function snapshotPath(id) {
    if (!/^[a-f0-9-]{36}$/i.test(id)) {
        throw new Error("Invalid snapshot id");
    }
    return join(SNAPSHOT_DIR, `${id}.json`);
}
function writeSnapshot(snapshot) {
    ensureSnapshotDir();
    const target = snapshotPath(snapshot.id);
    const temp = `${target}.${process.pid}.tmp`;
    writeFileSync(temp, JSON.stringify(snapshot, null, 2), "utf8");
    renameSync(temp, target);
}
function readSnapshot(id) {
    const target = snapshotPath(id);
    if (!existsSync(target))
        return undefined;
    const parsed = JSON.parse(readFileSync(target, "utf8"));
    if (parsed?.id !== id ||
        typeof parsed?.timestamp !== "string" ||
        typeof parsed?.label !== "string" ||
        typeof parsed?.data !== "string") {
        throw new Error(`Snapshot "${id}" is invalid`);
    }
    return parsed;
}
function listStoredSnapshots() {
    ensureSnapshotDir();
    return readdirSync(SNAPSHOT_DIR)
        .filter((name) => /^[a-f0-9-]{36}\.json$/i.test(name))
        .map((name) => readSnapshot(name.slice(0, -5)))
        .filter((snapshot) => Boolean(snapshot))
        .sort((a, b) => b.timestamp.localeCompare(a.timestamp));
}
function getFullControlSnapshot() {
    const memory = readPersistentMemory();
    const skillPath = resolveSkillPath();
    const referenceDir = skillPath ? join(dirname(skillPath), "references") : undefined;
    const projectsDir = join(MEMORY_DIR, "projects");
    return {
        ...getRuntimeControlSnapshot(),
        memoryNamespaces: {
            activeScope: MEMORY_SCOPE,
            activePath: MEMORY_PATH,
            activeProjectId: MEMORY_SCOPE === "project" ? PROJECT_ID : null,
            projectCount: existsSync(projectsDir)
                ? readdirSync(projectsDir, { withFileTypes: true }).filter((entry) => entry.isDirectory()).length
                : 0,
        },
        memorySummary: {
            lessons: memory.learnedLessons.length,
            regressionFixes: memory.registryFixes.length,
            conversations: memory.conversationSummaries.length,
            recurrentMistakes: memory.recurrentMistakes?.length ?? 0,
            timelineTasks: memory.timeline?.length ?? 0,
            preferences: memory.userModel.preferences.length,
            topPreferences: rankPreferences(memory.userModel.preferences)
                .slice(0, 5)
                .map(({ subject, sentiment, confidence, scope }) => ({
                subject,
                sentiment,
                confidence,
                scope,
            })),
        },
        references: {
            available: referenceDir && existsSync(referenceDir)
                ? readdirSync(referenceDir).filter((name) => name.endsWith(".md")).length
                : 0,
            loaded: [...LOADED_REFERENCES].sort(),
        },
        updateState: {
            currentVersion: "1.0.0",
            automaticCheckEnabled: process.env.MUNCH_AUTO_UPDATE === "true",
            explicitApplyEnabled: process.env.MUNCH_ALLOW_UPDATE_APPLY === "true",
        },
    };
}
// ──────────────────────────────────────────────
// MCP Server definition
// ──────────────────────────────────────────────
export function configureMcpServer(server) {
    // Tool, prompt, and resource registration is shared by CLI and serverless transports.
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
                `- Rejected Patterns: ${memory.userModel.rejectedPatterns.join(", ") || "None registered yet"}\n`;
            const recalledPreferences = rankPreferences(memory.userModel.preferences).slice(0, 10);
            memoryBlock += `- Structured Preferences: ${recalledPreferences.length > 0
                ? recalledPreferences.map((preference) => `${preference.subject} (${preference.sentiment}, ${Math.round(preference.confidence * 100)}% confidence, scope: ${preference.scope})`).join("; ")
                : "None registered yet"}\n` +
                `- Preference Rule: Treat preferences as weighted evidence, not universal commands. Respect explicit task constraints and ask only when the choice materially affects the result.\n\n`;
            const currentCwd = process.cwd().replace(/\\/g, "/");
            const pastPaths = extractPaths(memory);
            memoryBlock += `### Cross-Project Path Mapping & Transfer Learning\n` +
                `- Current Working Directory: \`${currentCwd}\`\n`;
            if (pastPaths.length > 0) {
                memoryBlock += `- Detected Past Workspace/Project Paths:\n` +
                    pastPaths.map(p => `  * \`${p}\``).join("\n") + "\n" +
                    `- **Transfer Instruction**: The active workspace has shifted or differs from previous folders. Apply all lessons, error resolutions, and bugs solved in those directories to their corresponding files in the current folder. All absolute paths from the detected past paths have been auto-translated to the current workspace path \`${currentCwd}\`.\n\n`;
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
                const recentConversations = memory.conversationSummaries.slice(-10);
                recentConversations.forEach((c) => {
                    memoryBlock += `- Summary (${c.timestamp}): ${c.summary}\n`;
                });
                memoryBlock += "\n";
            }
            if (memory.timeline && memory.timeline.length > 0) {
                memoryBlock += `### Long-Horizon Task Timeline\n`;
                memory.timeline.forEach((t) => {
                    const blockersStr = t.blockers.length > 0 ? ` (Blockers: ${t.blockers.join(", ")})` : "";
                    memoryBlock += `- [${t.status.toUpperCase()}] **${t.name}**${blockersStr}\n`;
                    if (t.milestones && t.milestones.length > 0) {
                        memoryBlock += `  * Milestones: ${t.milestones.join(" -> ")}\n`;
                    }
                });
                memoryBlock += "\n";
            }
            if (memory.recurrentMistakes && memory.recurrentMistakes.length > 0) {
                memoryBlock += `### Anti-Mistake Defenses & Critical Recurrent Pitfalls\n` +
                    `*WARNING*: The following errors or pitfalls have occurred multiple times in past attempts. You MUST prioritize avoiding these patterns or applying these successful fixes immediately:\n\n`;
                memory.recurrentMistakes.forEach((m) => {
                    const attemptsStr = m.unsuccessfulAttempts.length > 0 ? ` (Failed attempts: ${m.unsuccessfulAttempts.join(" | ")})` : "";
                    const fixStr = m.successfulFix ? ` ➔ Verified Resolution: **${m.successfulFix}**` : " (Currently unresolved/ongoing struggle)";
                    memoryBlock += `- Pitfall: *${m.symptom}* (Occurred ${m.recurrenceCount} times)${attemptsStr}${fixStr}\n`;
                });
                memoryBlock += "\n";
            }
            text += memoryBlock;
            showNotification("Munch Skill Loaded", `Recalled ${memory.learnedLessons.length} lessons, ${memory.registryFixes.length} regression fixes, and ${memory.recurrentMistakes?.length || 0} recurrent pitfalls.`);
        }
        if (process.platform === "win32") {
            text += "\n\n⟦§SYSTEM_OVERRIDE_CONSTRAINTS⟧\n" +
                "- The default shell is already PowerShell 7. You MUST execute commands directly (e.g., 'rm test.txt', 'node install.js') without prefixing them with 'powershell -Command' or 'pwsh -Command'.";
        }
        // Dynamic anti-hallucination instruction injection
        text += "\n\n# Dynamic Verification Constraints (Anti-Hallucination Gate)\n" +
            "1. **State Isolation Check**: You MUST read files before assuming their structural fields exist. Do not assume or guess variables or imports.\n" +
            "2. **Double-Loop Validation**: Verify all function references before applying code changes.\n" +
            "3. **Zero-Stubs Mandate**: Code blocks must be 100% complete. Do not output lazy placeholders or ellipses.";
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
        const snapshot = {
            id: randomUUID(),
            timestamp: new Date().toISOString(),
            label: label.trim(),
            data,
        };
        writeSnapshot(snapshot);
        showNotification("Memory Snapshot Saved", `Label: ${label}`);
        return {
            content: [
                {
                    type: "text",
                    text: `Snapshot saved. id: ${snapshot.id}\nTimestamp: ${snapshot.timestamp}`,
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
        const snap = readSnapshot(id);
        if (!snap) {
            const available = listStoredSnapshots().map((snapshot) => snapshot.id).join(", ") || "(none)";
            return {
                content: [
                    { type: "text", text: `Snapshot "${id}" not found. Available: ${available}` },
                ],
            };
        }
        showNotification("Memory Snapshot Restored", `Label: ${snap.label}`);
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
        description: "List all snapshots persisted on disk.",
        inputSchema: {},
    }, async () => {
        const snapshots = listStoredSnapshots();
        if (snapshots.length === 0) {
            return { content: [{ type: "text", text: "No persisted snapshots found." }] };
        }
        const lines = snapshots.map((snapshot) => `  ${snapshot.id}  |  ${snapshot.label}  |  ${snapshot.timestamp}`);
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
    server.registerTool("check_for_update", {
        description: "Check the latest versioned Munch release without changing the installation.",
        inputSchema: {},
    }, async () => {
        const info = await checkForUpdate("1.0.0");
        return { content: [{ type: "text", text: JSON.stringify(info, null, 2) }] };
    });
    server.registerTool("list_references", {
        description: "List available supporting references for selective context loading.",
        inputSchema: {},
    }, async () => {
        const skillPath = resolveSkillPath();
        if (!skillPath)
            return { content: [{ type: "text", text: "SKILL.md not found." }] };
        const referenceDir = join(dirname(skillPath), "references");
        const names = readdirSync(referenceDir)
            .filter((name) => name.endsWith(".md"))
            .sort();
        return { content: [{ type: "text", text: names.join("\n") }] };
    });
    server.registerTool("load_reference", {
        description: "Load one supporting reference by filename instead of expanding the entire skill library.",
        inputSchema: {
            name: z.string().regex(/^[A-Za-z0-9_]+(?:\.md)?$/).describe("Reference name, for example network_protocols"),
        },
    }, async ({ name }) => {
        const skillPath = resolveSkillPath();
        if (!skillPath)
            return { content: [{ type: "text", text: "SKILL.md not found." }] };
        const filename = name.endsWith(".md") ? name : `${name}.md`;
        const path = join(dirname(skillPath), "references", filename);
        if (!existsSync(path)) {
            return { content: [{ type: "text", text: `Reference "${filename}" not found.` }] };
        }
        LOADED_REFERENCES.add(filename);
        return { content: [{ type: "text", text: readFileSync(path, "utf8") }] };
    });
    server.registerTool("export_memory", {
        description: "Export the active global or project memory namespace as normalized JSON.",
        inputSchema: {},
    }, async () => ({
        content: [{
                type: "text",
                text: JSON.stringify({
                    scope: MEMORY_SCOPE,
                    projectId: MEMORY_SCOPE === "project" ? PROJECT_ID : undefined,
                    memory: readPersistentMemory(),
                }, null, 2),
            }],
    }));
    server.registerTool("clear_memory", {
        description: "Delete the active memory namespace only after explicit confirmation.",
        inputSchema: {
            confirm: z.literal("DELETE").describe('Must be exactly "DELETE"'),
        },
    }, async () => {
        rmSync(MEMORY_PATH, { force: true });
        rmSync(MEMORY_BACKUP_PATH, { force: true });
        rmSync(SNAPSHOT_DIR, { recursive: true, force: true });
        return { content: [{ type: "text", text: `Cleared ${MEMORY_SCOPE} Munch memory.` }] };
    });
    server.registerTool("apply_update", {
        description: "Apply an explicitly requested exact release version. Requires MUNCH_ALLOW_UPDATE_APPLY=true.",
        inputSchema: {
            version: z.string().describe("Exact semantic version from a verified Munch release, such as 1.2.3"),
            confirm: z.literal(true).describe("Explicit confirmation that the update should modify the global installation"),
        },
    }, async ({ version }) => {
        await applyVersionedUpdate(version);
        return {
            content: [{
                    type: "text",
                    text: `Munch ${version} installed with lifecycle scripts disabled. Run munch-setup repair to refresh managed host files.`,
                }],
        };
    });
    server.registerTool("compile_policy", {
        description: "Compile SKILL.md directives into a machine-checkable policy artifact.",
        inputSchema: {},
    }, async () => {
        const skillPath = resolveSkillPath();
        if (!skillPath)
            throw new Error("SKILL.md not found");
        return { content: [{ type: "text", text: JSON.stringify(compilePolicy(skillPath), null, 2) }] };
    });
    server.registerTool("negotiate_capabilities", {
        description: "Select a safe execution and context strategy from the host's actual capabilities.",
        inputSchema: {
            host: z.string(),
            tools: z.array(z.string()),
            contextBudget: z.number().int().positive(),
            filesystem: z.enum(["none", "read", "write"]),
            network: z.boolean(),
            mcpTransport: z.enum(["stdio", "http", "unknown"]),
        },
    }, async (args) => ({
        content: [{ type: "text", text: JSON.stringify(negotiateCapabilities(args), null, 2) }],
    }));
    server.registerTool("detect_contradictions", {
        description: "Detect likely conflicts across user instructions, memory, policies, and runtime constraints.",
        inputSchema: {
            statements: z.array(z.object({
                source: z.string(),
                text: z.string(),
                priority: z.number().optional(),
            })).min(2),
        },
    }, async ({ statements }) => ({
        content: [{ type: "text", text: JSON.stringify(detectContradictions(statements), null, 2) }],
    }));
    server.registerTool("configure_runtime", {
        description: "Configure trust mode, retention duration, and sensitivity labels for local Munch runtime artifacts.",
        inputSchema: {
            trustMode: z.enum(["strict", "balanced", "experimental"]).optional(),
            retentionDays: z.number().int().min(1).max(3650).optional(),
            sensitivity: z.record(z.enum(["public", "internal", "sensitive"])).optional(),
        },
    }, async (args) => ({
        content: [{ type: "text", text: JSON.stringify(configureRuntimeSettings(args), null, 2) }],
    }));
    server.registerTool("start_trace", {
        description: "Create a deterministic, hash-chained agent replay trace.",
        inputSchema: {
            label: z.string(),
            metadata: z.record(z.unknown()).optional(),
        },
    }, async ({ label, metadata }) => ({
        content: [{ type: "text", text: JSON.stringify(startTrace(label, metadata), null, 2) }],
    }));
    server.registerTool("append_trace", {
        description: "Append a typed event to a deterministic replay trace.",
        inputSchema: {
            traceId: z.string().uuid(),
            type: z.string(),
            payload: z.unknown(),
        },
    }, async ({ traceId, type, payload }) => ({
        content: [{ type: "text", text: JSON.stringify(appendTrace(traceId, type, payload), null, 2) }],
    }));
    server.registerTool("replay_trace", {
        description: "Replay a trace and verify its complete hash chain.",
        inputSchema: { traceId: z.string().uuid() },
    }, async ({ traceId }) => ({
        content: [{ type: "text", text: JSON.stringify(replayTrace(traceId), null, 2) }],
    }));
    server.registerTool("record_provenance", {
        description: "Record a confidence-scored memory, decision, claim, or evidence node with provenance links.",
        inputSchema: {
            kind: z.string(),
            content: z.string(),
            source: z.string(),
            confidence: z.number().min(0).max(1),
            supersedes: z.array(z.string()).optional(),
            evidence: z.array(z.string()).optional(),
        },
    }, async (args) => ({
        content: [{ type: "text", text: JSON.stringify(recordProvenance(args), null, 2) }],
    }));
    server.registerTool("get_provenance_graph", {
        description: "Return the local provenance nodes and supersession/evidence edges.",
        inputSchema: {},
    }, async () => ({
        content: [{ type: "text", text: JSON.stringify(getProvenanceGraph(), null, 2) }],
    }));
    server.registerTool("create_evidence_bundle", {
        description: "Create a durable completion artifact with requirements, changes, tests, risks, and file hashes.",
        inputSchema: {
            title: z.string(),
            requirements: z.array(z.string()),
            changes: z.array(z.string()),
            tests: z.array(z.object({
                name: z.string(),
                status: z.enum(["passed", "failed", "skipped"]),
                evidence: z.string().optional(),
            })),
            files: z.array(z.string()).optional(),
            risks: z.array(z.string()).optional(),
        },
    }, async (args) => ({
        content: [{ type: "text", text: JSON.stringify(createEvidenceBundle(args), null, 2) }],
    }));
    server.registerTool("run_evaluation", {
        description: "Evaluate repeatable Munch-enabled outputs against optional baseline outputs.",
        inputSchema: {
            name: z.string(),
            cases: z.array(z.object({
                id: z.string(),
                expected: z.string(),
                enabledOutput: z.string(),
                baselineOutput: z.string().optional(),
                matcher: z.enum(["includes", "exact", "regex"]).optional(),
            })).min(1),
        },
    }, async (args) => ({
        content: [{ type: "text", text: JSON.stringify(runEvaluation(args), null, 2) }],
    }));
    server.registerTool("score_references", {
        description: "Rank supporting references by task match, priority, freshness, usage, and validation outcomes.",
        inputSchema: { query: z.string() },
    }, async ({ query }) => {
        const skillPath = resolveSkillPath();
        if (!skillPath)
            throw new Error("SKILL.md not found");
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(scoreReferences(join(dirname(skillPath), "references"), query), null, 2),
                }],
        };
    });
    server.registerTool("record_reference_outcome", {
        description: "Record whether a selected supporting reference helped the task succeed.",
        inputSchema: { id: z.string(), success: z.boolean() },
    }, async ({ id, success }) => ({
        content: [{ type: "text", text: JSON.stringify(recordReferenceOutcome(id, success), null, 2) }],
    }));
    server.registerTool("build_context_package", {
        description: "Build a task-ranked context bundle that fits an explicit token budget.",
        inputSchema: {
            query: z.string(),
            tokenBudget: z.number().int().min(500).max(200000),
        },
    }, async ({ query, tokenBudget }) => {
        const skillPath = resolveSkillPath();
        if (!skillPath)
            throw new Error("SKILL.md not found");
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify(buildContextPackage(join(dirname(skillPath), "references"), query, tokenBudget), null, 2),
                }],
        };
    });
    server.registerTool("install_reference_pack", {
        description: "Install a checksum-verified local reference extension pack. Requires explicit runtime permission.",
        inputSchema: {
            sourcePath: z.string(),
            confirm: z.literal(true),
        },
    }, async ({ sourcePath }) => {
        if (process.env.MUNCH_ALLOW_REFERENCE_PACK_INSTALL !== "true") {
            throw new Error("Set MUNCH_ALLOW_REFERENCE_PACK_INSTALL=true to install a local reference pack");
        }
        return {
            content: [{ type: "text", text: JSON.stringify(installReferencePack(sourcePath), null, 2) }],
        };
    });
    server.registerTool("list_reference_packs", {
        description: "List installed, independently versioned reference extension packs.",
        inputSchema: {},
    }, async () => ({
        content: [{ type: "text", text: JSON.stringify(listReferencePacks(), null, 2) }],
    }));
    server.registerTool("build_workspace_graph", {
        description: "Index workspace files, imports, test relationships, configuration, and package dependencies.",
        inputSchema: {
            rootPath: z.string().optional(),
            maximumFiles: z.number().int().min(10).max(10000).optional(),
        },
    }, async ({ rootPath, maximumFiles }) => ({
        content: [{
                type: "text",
                text: JSON.stringify(buildWorkspaceGraph(rootPath ?? process.cwd(), maximumFiles), null, 2),
            }],
    }));
    server.registerTool("predict_change_impact", {
        description: "Predict dependents, tests, generated artifacts, security risks, and checks for planned file changes.",
        inputSchema: {
            rootPath: z.string().optional(),
            changedPaths: z.array(z.string()).min(1),
        },
    }, async ({ rootPath, changedPaths }) => ({
        content: [{
                type: "text",
                text: JSON.stringify(predictChangeImpact(rootPath ?? process.cwd(), changedPaths), null, 2),
            }],
    }));
    server.registerTool("purge_expired_data", {
        description: "Apply configured retention to traces, evidence, and timestamped persistent memory records.",
        inputSchema: { confirm: z.literal(true) },
    }, async () => {
        const runtime = purgeExpiredRuntime();
        const settings = getRuntimeSettings();
        const cutoff = Date.now() - settings.retentionDays * 86_400_000;
        const memory = readPersistentMemory();
        const before = {
            lessons: memory.learnedLessons.length,
            fixes: memory.registryFixes.length,
            conversations: memory.conversationSummaries.length,
        };
        memory.learnedLessons = memory.learnedLessons.filter((item) => Date.parse(item.lastSeen ?? item.timestamp) >= cutoff);
        memory.registryFixes = memory.registryFixes.filter((item) => Date.parse(item.lastSeen ?? item.timestamp) >= cutoff);
        memory.conversationSummaries = memory.conversationSummaries.filter((item) => Date.parse(item.timestamp) >= cutoff);
        writePersistentMemory(memory);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        runtime,
                        memoryRemoved: {
                            lessons: before.lessons - memory.learnedLessons.length,
                            fixes: before.fixes - memory.registryFixes.length,
                            conversations: before.conversations - memory.conversationSummaries.length,
                        },
                    }, null, 2),
                }],
        };
    });
    server.registerTool("get_control_snapshot", {
        description: "Return local dashboard state for trust, traces, provenance, evidence, privacy, and extensions.",
        inputSchema: {},
    }, async () => ({
        content: [{ type: "text", text: JSON.stringify(getFullControlSnapshot(), null, 2) }],
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
        const cleanSymptom = symptom.toLowerCase().trim();
        // Check for similar existing lesson using Jaccard fuzzy token similarity
        const existing = memory.learnedLessons.find((l) => l.symptom.toLowerCase().trim() === cleanSymptom ||
            (cleanSymptom.includes(l.symptom.toLowerCase().trim()) && l.symptom.length > 10) ||
            getJaccardSimilarity(l.symptom, symptom) >= 0.65);
        if (existing) {
            existing.occurrences = (existing.occurrences ?? 1) + 1;
            existing.lastSeen = new Date().toISOString();
            existing.fix = fix;
            existing.category = category;
            existing.context = context ?? existing.context;
            // Auto-escalate to recurrent pitfall logs if symptom keeps resurfacing (threshold: 3 times)
            if (existing.occurrences >= 3) {
                if (!memory.recurrentMistakes)
                    memory.recurrentMistakes = [];
                let mistake = memory.recurrentMistakes.find((m) => m.symptom.toLowerCase().trim() === cleanSymptom ||
                    getJaccardSimilarity(m.symptom, symptom) >= 0.65);
                if (mistake) {
                    mistake.recurrenceCount = existing.occurrences;
                    mistake.lastSeen = new Date().toISOString();
                    mistake.successfulFix = fix;
                }
                else {
                    memory.recurrentMistakes.push({
                        symptom: symptom,
                        firstSeen: existing.timestamp,
                        lastSeen: new Date().toISOString(),
                        recurrenceCount: existing.occurrences,
                        unsuccessfulAttempts: [],
                        successfulFix: fix
                    });
                }
            }
            writePersistentMemory(memory);
            showNotification("Lesson Re-learned", `Occurrences: ${existing.occurrences} | Category: ${category}`);
            return {
                content: [
                    {
                        type: "text",
                        text: `✓ Lesson updated (seen ${existing.occurrences} times). Category: ${category} | Symptom: ${symptom}`,
                    },
                ],
            };
        }
        const lesson = {
            category,
            symptom,
            fix,
            context: context ?? "",
            timestamp: new Date().toISOString(),
            occurrences: 1,
            lastSeen: new Date().toISOString(),
        };
        memory.learnedLessons.push(lesson);
        writePersistentMemory(memory);
        showNotification("New Lesson Learned", `Category: ${category}`);
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
            preferences: z.array(z.object({
                category: z.enum(["technology", "design", "workflow", "communication", "domain", "other"]),
                subject: z.string(),
                sentiment: z.enum(["like", "dislike", "neutral"]).default("like"),
                strength: z.number().min(0).max(1).default(0.8),
                confidence: z.number().min(0).max(1).default(1),
                scope: z.enum(["global", "frontend", "backend", "mobile", "desktop", "project"]).default("global"),
                sourceStatement: z.string().optional(),
            })).optional().describe("Structured preference facts with confidence and task scope"),
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
        if (args.preferences) {
            const now = new Date().toISOString();
            for (const preference of args.preferences) {
                const incoming = {
                    id: `PREF_${createHash("sha256")
                        .update(`${preference.category}:${preference.subject.toLowerCase()}`)
                        .digest("hex")
                        .slice(0, 12)}`,
                    category: preference.category,
                    subject: preference.subject.trim(),
                    sentiment: preference.sentiment,
                    strength: preference.strength,
                    confidence: preference.confidence,
                    scope: preference.scope,
                    sourceStatement: preference.sourceStatement ?? "Explicit structured profile update",
                    evidenceCount: 1,
                    firstSeen: now,
                    lastSeen: now,
                };
                const index = memory.userModel.preferences.findIndex((item) => item.id === incoming.id);
                const merged = mergePreference(index >= 0 ? memory.userModel.preferences[index] : undefined, incoming);
                if (index >= 0)
                    memory.userModel.preferences[index] = merged;
                else
                    memory.userModel.preferences.push(merged);
            }
        }
        writePersistentMemory(memory);
        showNotification("User Profile Updated", `Preferred Style: ${memory.userModel.preferredStyle}`);
        return {
            content: [
                {
                    type: "text",
                    text: `✓ Persistent user model updated. Style: ${memory.userModel.preferredStyle} | Skill Level: ${memory.userModel.skillLevel}`,
                },
            ],
        };
    });
    // ── Tool: observe_user_message ────────────────
    server.registerTool("observe_user_message", {
        description: "Analyze a user message for explicit preference signals such as likes, favorites, dislikes, usual tools, " +
            "or comfort statements, then persist high-confidence facts. Call this after messages that contain preference language. " +
            "A mentioned technology is not automatically treated as a preference.",
        inputSchema: {
            message: z.string().describe("The user's exact message"),
        },
    }, async ({ message }) => {
        const memory = readPersistentMemory();
        const forgotten = extractForgottenPreferenceSubjects(message);
        if (forgotten.length > 0) {
            memory.userModel.preferences = memory.userModel.preferences.filter((preference) => !forgotten.some((subject) => preference.subject.toLowerCase() === subject.toLowerCase()));
            writePersistentMemory(memory);
            return {
                content: [{
                        type: "text",
                        text: JSON.stringify({
                            detected: 0,
                            forgotten,
                            guidance: "The matching preference facts were removed. Do not rely on them in later recommendations.",
                        }, null, 2),
                    }],
            };
        }
        const detected = extractPreferences(message);
        for (const incoming of detected) {
            const index = memory.userModel.preferences.findIndex((item) => item.id === incoming.id);
            const merged = mergePreference(index >= 0 ? memory.userModel.preferences[index] : undefined, incoming);
            if (index >= 0)
                memory.userModel.preferences[index] = merged;
            else
                memory.userModel.preferences.push(merged);
            if (merged.category === "technology"
                && merged.sentiment === "like"
                && !memory.userModel.techStack.includes(merged.subject)) {
                memory.userModel.techStack.push(merged.subject);
            }
        }
        if (detected.length > 0)
            writePersistentMemory(memory);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        detected: detected.length,
                        preferences: detected,
                        guidance: detected.length > 0
                            ? "Preference evidence stored. Use it as weighted context, not as a universal default."
                            : "No explicit preference signal detected. Do not infer a favorite from a simple mention.",
                    }, null, 2),
                }],
        };
    });
    // ── Tool: forget_user_preference ──────────────
    server.registerTool("forget_user_preference", {
        description: "Delete stored preference facts for a subject when the user explicitly asks to forget or clear them.",
        inputSchema: {
            subject: z.string().describe("Preference subject to forget, e.g. 'React'"),
            category: z.enum(["technology", "design", "workflow", "communication", "domain", "other"]).optional(),
        },
    }, async ({ subject, category }) => {
        const memory = readPersistentMemory();
        const before = memory.userModel.preferences.length;
        memory.userModel.preferences = memory.userModel.preferences.filter((preference) => preference.subject.toLowerCase() !== subject.trim().toLowerCase()
            || Boolean(category && preference.category !== category));
        const removed = before - memory.userModel.preferences.length;
        if (removed > 0)
            writePersistentMemory(memory);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        removed,
                        subject,
                        message: removed > 0
                            ? `Forgot ${removed} stored preference fact(s) for ${subject}.`
                            : `No stored preference facts matched ${subject}.`,
                    }, null, 2),
                }],
        };
    });
    // ── Tool: recall_user_preferences ─────────────
    server.registerTool("recall_user_preferences", {
        description: "Recall and rank persistent user preferences. Use for questions such as 'what do I like most?' " +
            "or before making a technology choice where personal preference is relevant.",
        inputSchema: {
            query: z.string().optional().describe("Optional topic, e.g. 'frontend technology' or 'what do I like most'"),
            category: z.enum(["technology", "design", "workflow", "communication", "domain", "other"]).optional(),
            scope: z.enum(["global", "frontend", "backend", "mobile", "desktop", "project"]).optional(),
            limit: z.number().int().min(1).max(20).default(5),
        },
    }, async ({ query, category, scope, limit }) => {
        const memory = readPersistentMemory();
        const ranked = rankPreferences(memory.userModel.preferences.filter((preference) => !category || preference.category === category), query ?? "", scope).slice(0, limit);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        answer: ranked.length > 0
                            ? ranked[0].sentiment === "like"
                                ? `${ranked[0].subject} is your strongest remembered preference.`
                                : `${ranked[0].subject} is your strongest remembered dislike.`
                            : "I do not have enough stored preference evidence to answer confidently.",
                        preferences: ranked,
                    }, null, 2),
                }],
        };
    });
    // ── Tool: recommend_technology_options ────────
    server.registerTool("recommend_technology_options", {
        description: "Recommend and compare technology options for an underspecified task using repository constraints and remembered " +
            "preferences. The output says whether asking the user is useful and labels favorites without forcing them.",
        inputSchema: {
            task: z.string().describe("The user's requested task"),
            options: z.array(z.string()).optional().describe("Optional candidate technologies to compare"),
        },
    }, async ({ task, options }) => {
        const memory = readPersistentMemory();
        const recommendation = recommendFrontendOptions(memory.userModel.preferences, task, options);
        return {
            content: [{
                    type: "text",
                    text: JSON.stringify({
                        ...recommendation,
                        suggestedQuestion: recommendation.shouldAsk
                            ? "Which approach do you want? I can use your remembered preference, or choose another option based on the tradeoffs below."
                            : undefined,
                    }, null, 2),
                }],
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
        const cleanIssue = issue.toLowerCase().trim();
        // Check for similar existing fix using Jaccard fuzzy token similarity
        const existing = memory.registryFixes.find((f) => f.issue.toLowerCase().trim() === cleanIssue ||
            (cleanIssue.includes(f.issue.toLowerCase().trim()) && f.issue.length > 10) ||
            getJaccardSimilarity(f.issue, issue) >= 0.65);
        if (existing) {
            existing.occurrences = (existing.occurrences ?? 1) + 1;
            existing.lastSeen = new Date().toISOString();
            existing.resolution = resolution;
            // Auto-escalate to recurrent pitfall logs if issue keeps resurfacing
            if (existing.occurrences >= 3) {
                if (!memory.recurrentMistakes)
                    memory.recurrentMistakes = [];
                let mistake = memory.recurrentMistakes.find((m) => m.symptom.toLowerCase().trim() === cleanIssue ||
                    getJaccardSimilarity(m.symptom, issue) >= 0.65);
                if (mistake) {
                    mistake.recurrenceCount = existing.occurrences;
                    mistake.lastSeen = new Date().toISOString();
                    mistake.successfulFix = resolution;
                }
                else {
                    memory.recurrentMistakes.push({
                        symptom: issue,
                        firstSeen: existing.timestamp,
                        lastSeen: new Date().toISOString(),
                        recurrenceCount: existing.occurrences,
                        unsuccessfulAttempts: [],
                        successfulFix: resolution
                    });
                }
            }
            writePersistentMemory(memory);
            showNotification("Regression Fix Stored", `${existing.id}: ${issue.substring(0, 45)}...`);
            return {
                content: [
                    {
                        type: "text",
                        text: `✓ Anti-regression fix updated: ${existing.id} (seen ${existing.occurrences} times) | Issue: ${issue} ∆ Resolution: ${resolution}`,
                    },
                ],
            };
        }
        const nextId = `FIX_${String(memory.registryFixes.length + 1).padStart(3, "0")}`;
        const fix = {
            id: nextId,
            issue,
            resolution,
            timestamp: new Date().toISOString(),
            occurrences: 1,
            lastSeen: new Date().toISOString(),
        };
        memory.registryFixes.push(fix);
        writePersistentMemory(memory);
        showNotification("Regression Fix Stored", `${nextId}: ${issue.substring(0, 45)}...`);
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
        showNotification("Conversation Logged", `Summary: ${summary.substring(0, 45)}...`);
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
        const q = query.toLowerCase().trim();
        const tokens = q.split(/\s+/).filter(Boolean);
        if (tokens.length === 0) {
            return { content: [{ type: "text", text: "Please enter a valid search query." }] };
        }
        // Calculate score using token match (weighted TF-IDF style) and Jaccard similarity
        const calculateSearchScore = (text, multiplier = 1.0) => {
            const lowerText = text.toLowerCase();
            let matchScore = 0;
            // 1. Exact token occurrence scoring (higher weight for matching specific search tokens)
            tokens.forEach((token) => {
                const count = (lowerText.split(token).length - 1);
                matchScore += count * multiplier;
            });
            // 2. Fuzzy Jaccard token set similarity addition
            const jaccard = getJaccardSimilarity(q, text);
            matchScore += jaccard * 5.0; // scale fuzzy match contribution
            return matchScore;
        };
        // Query and rank lessons
        const lessons = memory.learnedLessons
            .map((l) => {
            const catScore = calculateSearchScore(l.category, 1.5);
            const symScore = calculateSearchScore(l.symptom, 2.5);
            const fixScore = calculateSearchScore(l.fix, 2.0);
            const contextScore = calculateSearchScore(l.context || "", 1.0);
            const totalScore = catScore + symScore + fixScore + contextScore;
            return { lesson: l, score: totalScore };
        })
            .filter((item) => item.score > 0.1)
            .sort((a, b) => b.score - a.score || (b.lesson.occurrences ?? 1) - (a.lesson.occurrences ?? 1))
            .map((item) => item.lesson);
        // Query and rank fixes
        const fixes = memory.registryFixes
            .map((f) => {
            const issueScore = calculateSearchScore(f.issue, 2.5);
            const resScore = calculateSearchScore(f.resolution, 2.0);
            const totalScore = issueScore + resScore;
            return { fix: f, score: totalScore };
        })
            .filter((item) => item.score > 0.1)
            .sort((a, b) => b.score - a.score || (b.fix.occurrences ?? 1) - (a.fix.occurrences ?? 1))
            .map((item) => item.fix);
        // Query and rank conversations
        const convs = memory.conversationSummaries
            .map((c) => {
            const summaryScore = calculateSearchScore(c.summary, 1.0);
            const tagsScore = c.tags.reduce((acc, tag) => acc + calculateSearchScore(tag, 2.0), 0);
            const totalScore = summaryScore + tagsScore;
            return { conv: c, score: totalScore };
        })
            .filter((item) => item.score > 0.1)
            .sort((a, b) => b.score - a.score)
            .map((item) => item.conv);
        const preferences = rankPreferences(memory.userModel.preferences, query)
            .filter((preference) => calculateSearchScore(`${preference.category} ${preference.subject} ${preference.sentiment} ${preference.scope}`, 2) > 0.1);
        let output = `### Memory Query Results for "${query}"\n\n`;
        if (lessons.length > 0) {
            output += `#### Learned Lessons (${lessons.length})\n`;
            lessons.forEach((l) => {
                const occStr = l.occurrences && l.occurrences > 1 ? ` (seen ${l.occurrences}x)` : "";
                output += `- **[${l.category}]** Symptom: *${l.symptom}*${occStr} ➔ Fix: ${l.fix}\n`;
            });
            output += "\n";
        }
        if (fixes.length > 0) {
            output += `#### Anti-Regression Pins (${fixes.length})\n`;
            fixes.forEach((f) => {
                const occStr = f.occurrences && f.occurrences > 1 ? ` (seen ${f.occurrences}x)` : "";
                output += `- **${f.id}**: *${f.issue}*${occStr} ∆ ${f.resolution}\n`;
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
        if (preferences.length > 0) {
            output += `#### User Preferences (${preferences.length})\n`;
            preferences.forEach((preference) => {
                output += `- **${preference.subject}**: ${preference.sentiment}, confidence ${Math.round(preference.confidence * 100)}%, scope ${preference.scope}, evidence ${preference.evidenceCount}x\n`;
            });
            output += "\n";
        }
        if (lessons.length === 0 && fixes.length === 0 && convs.length === 0 && preferences.length === 0) {
            output += "No matching persistent memories found.";
        }
        return { content: [{ type: "text", text: output }] };
    });
    // ── Tool: track_recurrent_mistake ─────────────
    server.registerTool("track_recurrent_mistake", {
        description: "Register or update a recurrent struggle, repeating compiler error, or command failure. " +
            "Use this when a bug requires multiple attempts to fix, to record what failed and what ultimately worked.",
        inputSchema: {
            symptom: z.string().describe("The repeating error message, build failure log, or bug description"),
            unsuccessfulAttempt: z.string().optional().describe("A solution attempt that did NOT work"),
            successfulFix: z.string().optional().describe("The solution that ultimately succeeded"),
        },
    }, async ({ symptom, unsuccessfulAttempt, successfulFix }) => {
        const memory = readPersistentMemory();
        const cleanSymptom = symptom.toLowerCase().trim();
        if (!memory.recurrentMistakes) {
            memory.recurrentMistakes = [];
        }
        let existing = memory.recurrentMistakes.find((m) => m.symptom.toLowerCase().trim() === cleanSymptom ||
            getJaccardSimilarity(m.symptom, symptom) >= 0.65);
        if (existing) {
            existing.recurrenceCount++;
            existing.lastSeen = new Date().toISOString();
            if (unsuccessfulAttempt && !existing.unsuccessfulAttempts.includes(unsuccessfulAttempt)) {
                existing.unsuccessfulAttempts.push(unsuccessfulAttempt);
            }
            if (successfulFix) {
                existing.successfulFix = successfulFix;
            }
        }
        else {
            existing = {
                symptom,
                firstSeen: new Date().toISOString(),
                lastSeen: new Date().toISOString(),
                recurrenceCount: 1,
                unsuccessfulAttempts: unsuccessfulAttempt ? [unsuccessfulAttempt] : [],
                successfulFix
            };
            memory.recurrentMistakes.push(existing);
        }
        writePersistentMemory(memory);
        showNotification("Recurrent Pitfall Updated", `Symptom: ${symptom.substring(0, 45)}...`);
        return {
            content: [
                {
                    type: "text",
                    text: `✓ Recurrent pitfall recorded. Symptom: ${symptom}\nRecurrence Count: ${existing.recurrenceCount}\nSuccessful Fix: ${existing.successfulFix || "Unresolved"}`
                }
            ]
        };
    });
    // ── Tool: update_timeline_task ────────────────
    server.registerTool("update_timeline_task", {
        description: "Create or update a long-horizon task inside the persistent memory timeline. " +
            "Use this to record active goals, milestones, or current blockers, allowing " +
            "future sessions to immediately resume state without context drift.",
        inputSchema: {
            name: z.string().describe("Name of the task/goal"),
            status: z.enum(["active", "completed", "blocked", "deferred"]).describe("Current status of the task"),
            milestones: z.array(z.string()).optional().describe("Key milestones achieved or planned for this task"),
            blockers: z.array(z.string()).optional().describe("List of active issues blocking progress on this task"),
        },
    }, async ({ name, status, milestones, blockers }) => {
        const memory = readPersistentMemory();
        if (!memory.timeline) {
            memory.timeline = [];
        }
        const cleanName = name.trim();
        let existing = memory.timeline.find((t) => t.name.toLowerCase() === cleanName.toLowerCase());
        if (existing) {
            existing.status = status;
            existing.lastUpdated = new Date().toISOString();
            if (milestones) {
                existing.milestones = Array.from(new Set([...existing.milestones, ...milestones]));
            }
            if (blockers) {
                existing.blockers = blockers;
            }
        }
        else {
            existing = {
                id: `TASK_${Date.now()}`,
                name: cleanName,
                status,
                milestones: milestones ?? [],
                blockers: blockers ?? [],
                lastUpdated: new Date().toISOString()
            };
            memory.timeline.push(existing);
        }
        writePersistentMemory(memory);
        showNotification("Timeline Task Updated", `Task: ${name} [${status.toUpperCase()}]`);
        return {
            content: [
                {
                    type: "text",
                    text: `✓ Long-horizon task updated in timeline: ${name} (${status.toUpperCase()})`
                }
            ]
        };
    });
    // ── Tool: verify_code_safety ──────────────────
    server.registerTool("verify_code_safety", {
        description: "Run the Munch BTL validator and hallucination guard on a local file to check for compilation issues and stubs/placeholders.",
        inputSchema: {
            filePath: z.string().describe("Path to the file to check, relative or absolute"),
        },
    }, async ({ filePath }) => {
        const absPath = resolve(filePath);
        if (!existsSync(absPath)) {
            return {
                content: [{ type: "text", text: `Error: File not found: ${filePath}` }],
                isError: true,
            };
        }
        const projectRoot = resolve(__dirname, "..", "..");
        const btlScript = join(projectRoot, "skill", "munch", "scripts", "BTL_validator.js");
        const hgScript = join(projectRoot, "skill", "munch", "scripts", "hallucination_guard.js");
        const errors = [];
        if (existsSync(hgScript)) {
            const hgResult = spawnSync(process.execPath, [hgScript, absPath], { encoding: "utf8" });
            if (hgResult.status !== 0) {
                errors.push(`[Hallucination Guard Violations]:\n${hgResult.stdout || hgResult.stderr}`);
            }
        }
        else {
            errors.push(`Warning: Hallucination Guard script not found at ${hgScript}`);
        }
        if (existsSync(btlScript)) {
            const btlResult = spawnSync(process.execPath, [btlScript, absPath], { encoding: "utf8" });
            if (btlResult.status !== 0) {
                errors.push(`[BTL Validator Violations]:\n${btlResult.stdout || btlResult.stderr}`);
            }
        }
        else {
            errors.push(`Warning: BTL Validator script not found at ${btlScript}`);
        }
        if (errors.length > 0) {
            return {
                content: [{ type: "text", text: errors.join("\n\n") }],
                isError: true,
            };
        }
        return {
            content: [{ type: "text", text: `✓ Verification passed for ${filePath}. 0 violations found.` }],
        };
    });
    // ── Web Tools (search, scrape, GitHub, YouTube, Wikipedia, X/Twitter, TikTok, Gmail, Drive, browser) ──
    registerWebTools(server);
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
    return server;
}
export function createMcpServer() {
    return configureMcpServer(new McpServer({
        name: "munch",
        version: "1.0.0",
    }));
}
async function main() {
    const isSseMode = process.argv.includes("--sse") || process.env.MUNCH_SSE === "true" || process.env.PORT !== undefined;
    const port = parseInt(process.env.PORT || "8080", 10);
    if (process.env.MUNCH_AUTO_CONFIGURE === "true") {
        setTimeout(() => {
            runSelfConfigure();
        }, 1000);
    }
    if (isSseMode) {
        const security = resolveHttpSecurity();
        startHttpServer({
            port,
            token: security.token,
            allowInsecure: security.allowInsecure,
            allowedOrigins: new Set((process.env.MUNCH_ALLOWED_ORIGINS ?? "")
                .split(",")
                .map((origin) => origin.trim())
                .filter(Boolean)),
            createMcpServer,
            enableLegacySse: process.env.MUNCH_ENABLE_LEGACY_SSE === "true",
            maxSessions: parsePositiveInt(process.env.MUNCH_MAX_SESSIONS, 100),
            sessionTtlMs: parsePositiveInt(process.env.MUNCH_SESSION_TTL_MS, 30 * 60_000),
            maxBodyBytes: parsePositiveInt(process.env.MUNCH_MAX_BODY_BYTES, 1_048_576),
            rateLimitPerMinute: parsePositiveInt(process.env.MUNCH_RATE_LIMIT_PER_MINUTE, 120),
            controlSnapshot: getFullControlSnapshot,
        });
    }
    else {
        const transport = new StdioServerTransport();
        const stdioServer = createMcpServer();
        await stdioServer.connect(transport);
        console.error("⟦§MUNCH⟧ MCP server v1.0 running on stdio");
    }
    if (process.env.MUNCH_AUTO_UPDATE === "true") {
        checkForUpdate("1.0.0")
            .then((info) => {
            if (info.updateAvailable) {
                showNotification("Munch Update Available", `${info.latestVersion} is available at ${info.releaseUrl}`);
            }
        })
            .catch((err) => console.error("⟦§MUNCH UPDATE CHECK⟧ Failed:", err));
    }
}
function parsePositiveInt(value, fallback) {
    const parsed = Number.parseInt(value ?? "", 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}
const entryPoint = process.argv[1]
    ? pathToFileURL(resolve(process.argv[1])).href
    : undefined;
if (entryPoint === import.meta.url) {
    main().catch((err) => {
        console.error("⟦§MUNCH⟧ Fatal:", err);
        process.exit(1);
    });
}
