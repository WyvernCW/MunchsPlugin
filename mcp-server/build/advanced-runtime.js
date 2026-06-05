import { createCipheriv, createDecipheriv, createHash, randomBytes, randomUUID } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync, } from "node:fs";
import os from "node:os";
import { basename, dirname, extname, join, relative, resolve } from "node:path";
const RUNTIME_ROOT = process.env.MUNCH_RUNTIME_DIR
    ? resolve(process.env.MUNCH_RUNTIME_DIR)
    : join(os.homedir(), ".munchmemory", "runtime");
const SETTINGS_PATH = join(RUNTIME_ROOT, "settings.json");
const TRACE_DIR = join(RUNTIME_ROOT, "traces");
const PROVENANCE_PATH = join(RUNTIME_ROOT, "provenance.json");
const EVIDENCE_DIR = join(RUNTIME_ROOT, "evidence");
const EVALUATION_DIR = join(RUNTIME_ROOT, "evaluations");
const REFERENCE_STATS_PATH = join(RUNTIME_ROOT, "reference-stats.json");
const EXTENSION_DIR = join(RUNTIME_ROOT, "reference-packs");
const POLICY_PATH = join(RUNTIME_ROOT, "compiled-policy.json");
function ensureRuntime() {
    for (const path of [RUNTIME_ROOT, TRACE_DIR, EVIDENCE_DIR, EVALUATION_DIR, EXTENSION_DIR]) {
        mkdirSync(path, { recursive: true });
    }
}
function readJson(path, fallback) {
    if (!existsSync(path))
        return fallback;
    return JSON.parse(readFileSync(path, "utf8"));
}
function writeJson(path, value) {
    mkdirSync(dirname(path), { recursive: true });
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`, "utf8");
}
function hash(value) {
    return createHash("sha256").update(value).digest("hex");
}
function encryptionKey() {
    const configured = process.env.MUNCH_RUNTIME_ENCRYPTION_KEY;
    return configured ? createHash("sha256").update(configured).digest() : undefined;
}
function protect(value) {
    const key = encryptionKey();
    if (!key)
        return value;
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key, iv);
    const plaintext = Buffer.from(JSON.stringify(value), "utf8");
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    return {
        encrypted: true,
        algorithm: "aes-256-gcm",
        iv: iv.toString("base64"),
        tag: cipher.getAuthTag().toString("base64"),
        ciphertext: ciphertext.toString("base64"),
    };
}
function unprotect(value) {
    const candidate = value;
    if (!candidate?.encrypted)
        return value;
    const key = encryptionKey();
    if (!key)
        throw new Error("MUNCH_RUNTIME_ENCRYPTION_KEY is required to read this artifact");
    const decipher = createDecipheriv("aes-256-gcm", key, Buffer.from(candidate.iv, "base64"));
    decipher.setAuthTag(Buffer.from(candidate.tag, "base64"));
    const plaintext = Buffer.concat([
        decipher.update(Buffer.from(candidate.ciphertext, "base64")),
        decipher.final(),
    ]);
    return JSON.parse(plaintext.toString("utf8"));
}
function readProtectedJson(path, fallback) {
    if (!existsSync(path))
        return fallback;
    return unprotect(JSON.parse(readFileSync(path, "utf8")));
}
function writeProtectedJson(path, value) {
    writeJson(path, protect(value));
}
function safeId(value) {
    const normalized = value.trim().toLowerCase().replace(/[^a-z0-9_-]+/g, "-").replace(/^-+|-+$/g, "");
    if (!normalized)
        throw new Error("A non-empty identifier is required");
    return normalized;
}
function defaultSettings() {
    return {
        schemaVersion: 1,
        trustMode: "balanced",
        retentionDays: 90,
        sensitivity: {
            traces: "sensitive",
            provenance: "internal",
            evidence: "internal",
            evaluations: "internal",
        },
    };
}
export function getRuntimeSettings() {
    ensureRuntime();
    const parsed = readJson(SETTINGS_PATH, defaultSettings());
    return {
        ...defaultSettings(),
        ...parsed,
        sensitivity: { ...defaultSettings().sensitivity, ...(parsed.sensitivity ?? {}) },
    };
}
export function configureRuntimeSettings(input) {
    const current = getRuntimeSettings();
    const next = {
        ...current,
        trustMode: input.trustMode ?? current.trustMode,
        retentionDays: input.retentionDays ?? current.retentionDays,
        sensitivity: { ...current.sensitivity, ...(input.sensitivity ?? {}) },
    };
    if (!Number.isInteger(next.retentionDays) || next.retentionDays < 1 || next.retentionDays > 3650) {
        throw new Error("retentionDays must be an integer from 1 to 3650");
    }
    writeJson(SETTINGS_PATH, next);
    return next;
}
export function compilePolicy(skillPath) {
    const source = readFileSync(skillPath, "utf8");
    const sections = [...source.matchAll(/⟦§([A-Z0-9_*]+)⟧/g)].map((match) => match[1]);
    const directives = source
        .split(/\r?\n/)
        .map((line, index) => ({ line: index + 1, text: line.trim() }))
        .filter(({ text }) => /\bMUST\b|\bnever\b|\brequires?_|\bcondition:|\btrigger:|^\s*¬/i.test(text))
        .map((entry) => ({
        ...entry,
        severity: /\bnever\b|\bMUST\b|^\s*¬/.test(entry.text) ? "required" : "conditional",
        id: `POLICY_${hash(`${entry.line}:${entry.text}`).slice(0, 12)}`,
    }));
    const compiled = {
        schemaVersion: 1,
        source: skillPath,
        sourceHash: hash(source),
        compiledAt: new Date().toISOString(),
        sections: [...new Set(sections)],
        directives,
    };
    writeJson(POLICY_PATH, compiled);
    return compiled;
}
export function negotiateCapabilities(input) {
    const settings = getRuntimeSettings();
    const toolSet = new Set(input.tools.map((tool) => tool.toLowerCase()));
    const verification = [
        toolSet.has("shell") || toolSet.has("exec") ? "runtime-command-verification" : "static-verification-only",
        input.filesystem === "write" ? "workspace-edits" : input.filesystem === "read" ? "analysis-only" : "prompt-only",
        input.network ? "remote-source-verification" : "offline-sources-only",
    ];
    const contextStrategy = input.contextBudget < 8_000 ? "minimal" : input.contextBudget < 32_000 ? "selective" : "expanded";
    return {
        host: input.host,
        trustMode: settings.trustMode,
        contextStrategy,
        verification,
        restrictions: [
            ...(settings.trustMode === "strict" ? ["require-evidence-before-mutation", "no-unverified-update"] : []),
            ...(input.filesystem !== "write" ? ["no-file-mutation"] : []),
            ...(!input.network ? ["no-network-dependent-claims"] : []),
        ],
        available: {
            filesystem: input.filesystem,
            network: input.network,
            transport: input.mcpTransport,
            tools: [...toolSet].sort(),
        },
    };
}
function tokenSet(value) {
    return new Set(value.toLowerCase().match(/[a-z0-9_]{3,}/g) ?? []);
}
function overlap(left, right) {
    const common = [...left].filter((token) => right.has(token)).length;
    return common / Math.max(1, Math.min(left.size, right.size));
}
export function detectContradictions(statements) {
    const results = [];
    for (let leftIndex = 0; leftIndex < statements.length; leftIndex += 1) {
        for (let rightIndex = leftIndex + 1; rightIndex < statements.length; rightIndex += 1) {
            const left = statements[leftIndex];
            const right = statements[rightIndex];
            const similarity = overlap(tokenSet(left.text), tokenSet(right.text));
            const leftNegative = /\b(no|not|never|disable|forbid|without)\b/i.test(left.text);
            const rightNegative = /\b(no|not|never|disable|forbid|without)\b/i.test(right.text);
            if (similarity >= 0.45 && leftNegative !== rightNegative) {
                const winner = (left.priority ?? 0) === (right.priority ?? 0)
                    ? "unresolved"
                    : (left.priority ?? 0) > (right.priority ?? 0) ? left.source : right.source;
                results.push({
                    left,
                    right,
                    similarity: Number(similarity.toFixed(3)),
                    resolution: winner,
                });
            }
        }
    }
    return { contradictionCount: results.length, contradictions: results };
}
export function startTrace(label, metadata = {}) {
    ensureRuntime();
    const id = randomUUID();
    const header = {
        schemaVersion: 1,
        id,
        label: label.trim(),
        createdAt: new Date().toISOString(),
        metadata,
    };
    writeFileSync(join(TRACE_DIR, `${id}.jsonl`), `${JSON.stringify(header)}\n`, "utf8");
    return header;
}
export function appendTrace(traceId, type, payload) {
    const path = join(TRACE_DIR, `${traceId}.jsonl`);
    if (!existsSync(path))
        throw new Error(`Trace "${traceId}" does not exist`);
    const lines = readFileSync(path, "utf8").trim().split(/\r?\n/);
    const previous = lines.length > 1 ? JSON.parse(lines.at(-1)) : undefined;
    const eventBase = {
        index: previous ? previous.index + 1 : 0,
        timestamp: new Date().toISOString(),
        type: safeId(type),
        payload: protect(payload),
        previousHash: previous?.hash ?? hash(lines[0]),
    };
    const event = { ...eventBase, hash: hash(JSON.stringify(eventBase)) };
    writeFileSync(path, `${JSON.stringify(event)}\n`, { encoding: "utf8", flag: "a" });
    return event;
}
export function replayTrace(traceId) {
    const path = join(TRACE_DIR, `${traceId}.jsonl`);
    if (!existsSync(path))
        throw new Error(`Trace "${traceId}" does not exist`);
    const lines = readFileSync(path, "utf8").trim().split(/\r?\n/);
    const header = JSON.parse(lines[0]);
    const events = lines.slice(1).map((line) => JSON.parse(line));
    let previousHash = hash(lines[0]);
    const failures = [];
    for (const event of events) {
        const { hash: storedHash, ...eventBase } = event;
        if (event.previousHash !== previousHash || hash(JSON.stringify(eventBase)) !== storedHash) {
            failures.push(event.index);
        }
        previousHash = storedHash;
    }
    return {
        header,
        events: events.map((event) => ({ ...event, payload: unprotect(event.payload) })),
        encrypted: Boolean(encryptionKey()),
        deterministic: failures.length === 0,
        failedIndexes: failures,
    };
}
export function recordProvenance(input) {
    if (input.confidence < 0 || input.confidence > 1)
        throw new Error("confidence must be from 0 to 1");
    const graph = readProtectedJson(PROVENANCE_PATH, { schemaVersion: 1, nodes: [], edges: [] });
    const id = `PROV_${hash(`${input.kind}:${input.content}:${input.source}`).slice(0, 16)}`;
    const node = { id, ...input, recordedAt: new Date().toISOString(), contentHash: hash(input.content) };
    graph.nodes = graph.nodes.filter((entry) => entry.id !== id);
    graph.nodes.push(node);
    for (const target of input.supersedes ?? []) {
        graph.edges.push({ from: id, to: target, type: "supersedes" });
    }
    for (const target of input.evidence ?? []) {
        graph.edges.push({ from: id, to: target, type: "supported-by" });
    }
    graph.edges = graph.edges.filter((edge, index, all) => all.findIndex((candidate) => JSON.stringify(candidate) === JSON.stringify(edge)) === index);
    writeProtectedJson(PROVENANCE_PATH, graph);
    return node;
}
export function getProvenanceGraph() {
    return readProtectedJson(PROVENANCE_PATH, { schemaVersion: 1, nodes: [], edges: [] });
}
export function createEvidenceBundle(input) {
    ensureRuntime();
    const fileHashes = (input.files ?? []).map((path) => ({
        path,
        sha256: existsSync(path) && statSync(path).isFile() ? hash(readFileSync(path)) : null,
    }));
    const id = `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeId(input.title)}`;
    const bundle = {
        schemaVersion: 1,
        id,
        createdAt: new Date().toISOString(),
        ...input,
        fileHashes,
        complete: input.tests.every((test) => test.status === "passed"),
    };
    writeProtectedJson(join(EVIDENCE_DIR, `${id}.json`), bundle);
    return bundle;
}
export function runEvaluation(input) {
    const score = (expected, actual, matcher = "includes") => {
        if (matcher === "exact")
            return actual === expected ? 1 : 0;
        if (matcher === "regex")
            return new RegExp(expected, "i").test(actual) ? 1 : 0;
        return actual.toLowerCase().includes(expected.toLowerCase()) ? 1 : 0;
    };
    const cases = input.cases.map((entry) => {
        const enabled = score(entry.expected, entry.enabledOutput, entry.matcher);
        const baseline = entry.baselineOutput === undefined
            ? null
            : score(entry.expected, entry.baselineOutput, entry.matcher);
        return { id: entry.id, enabled, baseline, delta: baseline === null ? null : enabled - baseline };
    });
    const enabledScore = cases.reduce((sum, entry) => sum + entry.enabled, 0) / Math.max(1, cases.length);
    const baselines = cases.filter((entry) => entry.baseline !== null);
    const baselineScore = baselines.length
        ? baselines.reduce((sum, entry) => sum + (entry.baseline ?? 0), 0) / baselines.length
        : null;
    const result = {
        name: input.name,
        evaluatedAt: new Date().toISOString(),
        cases,
        enabledScore,
        baselineScore,
        improvement: baselineScore === null ? null : enabledScore - baselineScore,
    };
    const filename = `${new Date().toISOString().replace(/[:.]/g, "-")}-${safeId(input.name)}.json`;
    writeProtectedJson(join(EVALUATION_DIR, filename), result);
    return result;
}
function readCatalog(referenceDir) {
    return readJson(join(referenceDir, "catalog.json"), { schemaVersion: 1, references: [] });
}
function referenceStats() {
    return readJson(REFERENCE_STATS_PATH, {});
}
export function scoreReferences(referenceDir, query) {
    const catalog = readCatalog(referenceDir);
    const stats = referenceStats();
    const queryTokens = tokenSet(query);
    const now = Date.now();
    const ranked = catalog.references.map((entry) => {
        const content = readFileSync(join(referenceDir, entry.file), "utf8");
        const matches = [...queryTokens].filter((token) => `${entry.id} ${entry.title} ${entry.keywords.join(" ")} ${content.slice(0, 6000)}`.toLowerCase().includes(token)).length;
        const usage = stats[entry.id] ?? { uses: 0, successes: 0, failures: 0 };
        const contradictionSignals = (content.match(/\b(?:always|never|must)\b/gi) ?? []).length;
        const contradictionRisk = Math.min(1, contradictionSignals / 100);
        const validationScore = entry.verification ? 1 : 0;
        const successRate = usage.successes + usage.failures === 0
            ? 0.5
            : usage.successes / (usage.successes + usage.failures);
        const freshness = usage.lastUsed
            ? Math.max(0, 1 - (now - Date.parse(usage.lastUsed)) / (180 * 86_400_000))
            : 0.2;
        const score = matches * 10 +
            (entry.priority === "core" ? 3 : 0) +
            Math.log2(usage.uses + 1) +
            successRate * 2 +
            freshness +
            validationScore -
            contradictionRisk;
        return {
            ...entry,
            score: Number(score.toFixed(3)),
            tokenEstimate: Math.ceil(content.length / 4),
            validationScore,
            contradictionRisk: Number(contradictionRisk.toFixed(3)),
            usage,
        };
    }).sort((a, b) => b.score - a.score || a.id.localeCompare(b.id));
    return { query, ranked };
}
export function recordReferenceOutcome(id, success) {
    const stats = referenceStats();
    const current = stats[id] ?? { uses: 0, successes: 0, failures: 0 };
    current.uses += 1;
    current.lastUsed = new Date().toISOString();
    if (success)
        current.successes += 1;
    else
        current.failures += 1;
    stats[id] = current;
    writeJson(REFERENCE_STATS_PATH, stats);
    return { id, ...current };
}
export function buildContextPackage(referenceDir, query, tokenBudget) {
    if (!Number.isInteger(tokenBudget) || tokenBudget < 500)
        throw new Error("tokenBudget must be at least 500");
    const scored = scoreReferences(referenceDir, query);
    const selected = [];
    let used = 0;
    for (const entry of scored.ranked) {
        if (entry.score <= 0 || used + entry.tokenEstimate > tokenBudget)
            continue;
        const content = readFileSync(join(referenceDir, entry.file), "utf8");
        selected.push({ id: entry.id, file: entry.file, score: entry.score, content, tokenEstimate: entry.tokenEstimate });
        used += entry.tokenEstimate;
    }
    return { query, tokenBudget, estimatedTokens: used, selected };
}
export function installReferencePack(sourcePath, expectedCoreMajor = 1) {
    const source = resolve(sourcePath);
    const manifestPath = join(source, "munch-reference-pack.json");
    if (!existsSync(manifestPath))
        throw new Error("Reference pack manifest is missing");
    const manifest = readJson(manifestPath, {});
    if (manifest.compatibleCoreMajor !== expectedCoreMajor) {
        throw new Error(`Reference pack requires core major ${manifest.compatibleCoreMajor}`);
    }
    const id = safeId(manifest.id);
    for (const file of manifest.files) {
        const candidate = resolve(source, file.path);
        if (!candidate.startsWith(`${source}${process.platform === "win32" ? "\\" : "/"}`)) {
            throw new Error(`Reference pack path escapes source directory: ${file.path}`);
        }
        if (!existsSync(candidate) || hash(readFileSync(candidate)) !== file.sha256.toLowerCase()) {
            throw new Error(`Reference pack checksum failed: ${file.path}`);
        }
    }
    const target = join(EXTENSION_DIR, id, manifest.version);
    rmSync(target, { recursive: true, force: true });
    mkdirSync(target, { recursive: true });
    cpSync(source, target, { recursive: true });
    return { id, version: manifest.version, target, fileCount: manifest.files.length };
}
export function listReferencePacks() {
    ensureRuntime();
    const packs = readdirSync(EXTENSION_DIR, { withFileTypes: true })
        .filter((entry) => entry.isDirectory())
        .flatMap((entry) => {
        const root = join(EXTENSION_DIR, entry.name);
        return readdirSync(root, { withFileTypes: true })
            .filter((version) => version.isDirectory())
            .map((version) => ({
            id: entry.name,
            version: version.name,
            path: join(root, version.name),
        }));
    });
    return { packs };
}
function classifyPath(path) {
    if (/(^|[\\/])(test|tests|__tests__)([\\/]|$)|\.(test|spec)\./i.test(path))
        return "test";
    if (/\.(json|ya?ml|toml|ini|config\.[cm]?[jt]s)$/i.test(path))
        return "config";
    if (/\.(md|txt|rst)$/i.test(path))
        return "documentation";
    if (/\.(png|jpe?g|gif|svg|ico|woff2?|ttf)$/i.test(path))
        return "asset";
    return "source";
}
export function buildWorkspaceGraph(rootPath, maximumFiles = 3000) {
    const root = resolve(rootPath);
    const workspace = resolve(process.cwd());
    if (process.env.MUNCH_ALLOW_EXTERNAL_WORKSPACE_SCAN !== "true" &&
        root !== workspace &&
        !root.startsWith(`${workspace}${process.platform === "win32" ? "\\" : "/"}`)) {
        throw new Error("Workspace scans are restricted to the MCP process working directory");
    }
    const nodes = [];
    const edges = [];
    const byRelative = new Map();
    const ignored = new Set([".git", "node_modules", "build", "dist", "coverage", ".next"]);
    const stack = [root];
    while (stack.length && nodes.length < maximumFiles) {
        const directory = stack.pop();
        for (const entry of readdirSync(directory, { withFileTypes: true })) {
            if (ignored.has(entry.name))
                continue;
            const absolute = join(directory, entry.name);
            if (entry.isDirectory()) {
                stack.push(absolute);
                continue;
            }
            const path = relative(root, absolute).replace(/\\/g, "/");
            const node = { id: `FILE_${hash(path).slice(0, 12)}`, path, kind: classifyPath(path), size: statSync(absolute).size };
            nodes.push(node);
            byRelative.set(path, node);
            if (nodes.length >= maximumFiles)
                break;
        }
    }
    for (const node of nodes.filter((entry) => entry.kind === "source" || entry.kind === "test")) {
        if (node.size > 1_000_000)
            continue;
        const content = readFileSync(join(root, node.path), "utf8");
        const imports = [
            ...content.matchAll(/(?:from\s+|require\()\s*["']([^"']+)["']/g),
            ...content.matchAll(/import\(\s*["']([^"']+)["']\s*\)/g),
        ].map((match) => match[1]);
        for (const imported of imports) {
            if (!imported.startsWith("."))
                continue;
            const base = resolve(dirname(join(root, node.path)), imported);
            const candidates = [base, ...[".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs"].map((extension) => `${base}${extension}`)];
            const target = candidates.find((candidate) => existsSync(candidate) && statSync(candidate).isFile());
            if (!target)
                continue;
            const targetNode = byRelative.get(relative(root, target).replace(/\\/g, "/"));
            if (targetNode)
                edges.push({ from: node.id, to: targetNode.id, type: "imports" });
        }
        if (node.kind === "test") {
            const stem = basename(node.path).replace(/\.(test|spec)?\.[^.]+$/i, "");
            for (const candidate of nodes.filter((entry) => entry.kind === "source" && basename(entry.path).startsWith(stem))) {
                edges.push({ from: node.id, to: candidate.id, type: "tests" });
            }
        }
    }
    const packagePath = join(root, "package.json");
    if (existsSync(packagePath)) {
        const packageJson = readJson(packagePath, {});
        const packageNode = byRelative.get("package.json");
        if (packageNode) {
            for (const dependency of Object.keys({ ...(packageJson.dependencies ?? {}), ...(packageJson.devDependencies ?? {}) })) {
                const id = `PACKAGE_${dependency}`;
                if (!nodes.some((node) => node.id === id)) {
                    nodes.push({ id, path: dependency, kind: "dependency", size: 0 });
                }
                edges.push({ from: packageNode.id, to: id, type: "declares-dependency" });
            }
        }
    }
    return { root, nodes, edges, truncated: nodes.length >= maximumFiles };
}
export function predictChangeImpact(rootPath, changedPaths) {
    const graph = buildWorkspaceGraph(rootPath);
    const normalized = new Set(changedPaths.map((path) => path.replace(/\\/g, "/")));
    const changedNodes = graph.nodes.filter((node) => normalized.has(node.path));
    const changedIds = new Set(changedNodes.map((node) => node.id));
    const directDependents = graph.edges
        .filter((edge) => changedIds.has(edge.to))
        .map((edge) => graph.nodes.find((node) => node.id === edge.from))
        .filter((node) => Boolean(node));
    const tests = graph.nodes.filter((node) => node.kind === "test" &&
        (directDependents.some((dependent) => dependent.id === node.id) ||
            changedNodes.some((changed) => basename(node.path).includes(basename(changed.path, extname(changed.path))))));
    const generated = changedPaths.some((path) => /AGENT|CLAUDE|GEMINI|plugin\.json|references\//i.test(path))
        ? ["npm run generate:check"]
        : [];
    return {
        changed: changedNodes,
        directDependents,
        tests,
        recommendedChecks: [...new Set(["npm run lint", "npm run compile", ...generated, tests.length ? "npm test" : "npm run verify"])],
        risks: [
            ...(changedNodes.some((node) => node.kind === "config") ? ["configuration-drift"] : []),
            ...(changedPaths.some((path) => /installer|update|security|memory|http/i.test(path)) ? ["security-boundary-change"] : []),
        ],
    };
}
export function purgeExpiredRuntime(now = Date.now()) {
    const settings = getRuntimeSettings();
    const cutoff = now - settings.retentionDays * 86_400_000;
    const removed = [];
    for (const directory of [TRACE_DIR, EVIDENCE_DIR, EVALUATION_DIR]) {
        if (!existsSync(directory))
            continue;
        for (const entry of readdirSync(directory)) {
            const path = join(directory, entry);
            if (statSync(path).mtimeMs < cutoff) {
                rmSync(path, { recursive: true, force: true });
                removed.push(path);
            }
        }
    }
    return { retentionDays: settings.retentionDays, cutoff: new Date(cutoff).toISOString(), removed };
}
function countEntries(path) {
    return existsSync(path) ? readdirSync(path).length : 0;
}
export function getControlSnapshot() {
    const settings = getRuntimeSettings();
    const provenance = readProtectedJson(PROVENANCE_PATH, {});
    return {
        status: "online",
        settings,
        encryptionEnabled: Boolean(encryptionKey()),
        compiledPolicy: existsSync(POLICY_PATH) ? readJson(POLICY_PATH, {}) : null,
        traces: countEntries(TRACE_DIR),
        evidenceBundles: countEntries(EVIDENCE_DIR),
        evaluations: countEntries(EVALUATION_DIR),
        provenanceNodes: provenance.nodes?.length ?? 0,
        provenanceEdges: provenance.edges?.length ?? 0,
        referencePacks: listReferencePacks(),
        paths: {
            runtimeRoot: RUNTIME_ROOT,
            traces: TRACE_DIR,
            evidence: EVIDENCE_DIR,
            evaluations: EVALUATION_DIR,
            extensions: EXTENSION_DIR,
        },
    };
}
export function renderControlDashboard(snapshot) {
    const escaped = JSON.stringify(snapshot).replace(/</g, "\\u003c");
    return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>Munch Control</title>
<style>
:root{color-scheme:dark;--bg:#111315;--panel:#1a1e21;--line:#343a40;--text:#f2f0ea;--muted:#aeb5bb;--accent:#e3b341}
*{box-sizing:border-box}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.5 ui-sans-serif,system-ui;padding:32px}
main{max-width:1120px;margin:auto}header{display:grid;grid-template-columns:1.6fr 1fr;gap:32px;border-bottom:1px solid var(--line);padding-bottom:32px}
h1{font-size:clamp(40px,8vw,88px);line-height:1;margin:0;letter-spacing:-.05em}p{color:var(--muted)}
.status{align-self:end;border-left:4px solid var(--accent);padding-left:16px}.grid{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin-top:32px}
section{background:var(--panel);border:1px solid var(--line);padding:24px}.value{font-size:40px;font-weight:700}.label{color:var(--muted)}
pre{white-space:pre-wrap;word-break:break-word;font-size:13px;color:#d9dee2}.wide{grid-column:span 4}
@media(max-width:760px){body{padding:16px}header,.grid{grid-template-columns:1fr}.wide{grid-column:auto}}
</style>
</head>
<body><main><header><div><h1>Munch Control</h1><p>Local runtime state, trust policy, provenance, traces, evidence, and extension health.</p></div><div class="status"><strong>STATUS: ${snapshot.status.toUpperCase()}</strong><br><span>${snapshot.settings.trustMode} trust mode</span></div></header>
<div class="grid">
<section><div class="value">${snapshot.traces}</div><div class="label">Replay traces</div></section>
<section><div class="value">${snapshot.provenanceNodes}</div><div class="label">Provenance nodes</div></section>
<section><div class="value">${snapshot.evidenceBundles}</div><div class="label">Evidence bundles</div></section>
<section><div class="value">${snapshot.evaluations}</div><div class="label">Evaluations</div></section>
<section class="wide"><h2>Runtime Snapshot</h2><pre id="snapshot"></pre></section>
</div></main><script>document.getElementById("snapshot").textContent=JSON.stringify(${escaped},null,2)</script></body></html>`;
}
