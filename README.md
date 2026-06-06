# ⟦§MUNCH v1.0⟧

> Augmented cognitive agent — anti-regression tracking, adaptive user modeling,  
> BTL build loop, OWASP security kernel, polyglot code quality across 20+ languages.

---

## What is munch?

**munch** is a portable agent skill + MCP server that loads a structured cognitive  
kernel into any compatible AI coding agent. Once active it provides:

- **§ANTI_REGRESSION** — fix registry, hard pins, drift detection across exchanges
- **§ADAPTIVE_INTELLIGENCE** — session-scoped user model that learns your patterns
- **§COGNITION** — first-principles + chain-of-thought + probabilistic + dialectical reasoning
- **§BTL** — Build → Test → Loop → Ship with regression guard
- **§SECURITY_KERNEL** — OWASP Top 10 scan on every code output, never ships silent
- **§FRONTEND** — slop detection, WCAG a11y, mobile-first responsive rules
- **§POLYGLOT** — 20+ T1 languages with idiom + security profile per language
- **§CODE_QUALITY** — DRY, KISS, YAGNI, SOLID, error handling, observability
- **§MEMORY** — entity tracking, context compression, snapshot export/restore
- **§REFERENCE_ROUTER** — 43 focused references selected by task domain and context budget
- **§RELIABILITY_RUNTIME** — policy compilation, trust modes, replay, provenance, evaluations, workspace graphs, evidence, privacy, and control dashboard

Supporting references now include backend architecture, database engineering,
API design, testing strategy, CI/CD, package release, AI agent engineering,
prompt engineering, desktop and mobile apps, game development, browser
automation, and reverse engineering. `references/reference_index.md` is the
entry point for selecting the smallest relevant set.

The expanded systems layer adds Windows internals, installer and updater
lifecycles, security engineering, observability and debugging, distributed
systems, CLI/TUI engineering, accessibility, code review and refactoring,
network protocols, and documentation engineering.

The reliability runtime adds machine-checkable policy compilation, host
capability negotiation, contradiction detection, deterministic hash-chained
replay, reference quality scoring, token-budgeted context packaging, memory
provenance, evaluation comparisons, workspace dependency graphs, change impact
prediction, checksummed extension packs, evidence bundles, trust modes,
encrypted runtime artifacts, retention controls, and a local control dashboard.

`references/catalog.json` is generated from the library and records each
reference's ID, version, priority, keywords, dependencies, Mermaid graph IDs,
and verification command.

---

## Compatibility

| Tool                | Method           | Location                                                                 |
| ------------------- | ---------------- | ------------------------------------------------------------------------ |
| **Claude Code**     | Skill            | `.claude/skills/munch/SKILL.md` or `~/.claude/skills/munch/SKILL.md`     |
| **Claude.ai**       | Skill (Projects) | Upload `skill/munch/SKILL.md` as project knowledge                       |
| **KiloCode**        | Skill            | `.kilocode/skills/munch/SKILL.md` or `~/.kilocode/skills/munch/SKILL.md` |
| **OpenCode**        | Skill + Plugin   | `.opencode/skills/munch/SKILL.md` + `opencode-plugin/munch.plugin.ts`    |
| **Codex CLI**       | Skill + Plugin   | `~/.agents/skills/munch/SKILL.md` + `codex-plugin/`                      |
| **Antigravity CLI** | Skill            | `~/.gemini/skills/munch/SKILL.md`                                        |
| **Antigravity IDE** | Skill            | `~/.gemini/skills/munch/SKILL.md`                                        |
| **Any MCP host**    | MCP Server       | See `mcp-server/`                                                        |

---

## Quick Install

Clone the repository and run the automated installer:

```bash
git clone https://github.com/WyvernCW/MunchsPlugin.git
cd MunchsPlugin
npm run setup

or


npm install -g --ignore-scripts git+https://github.com/WyvernCW/MunchsPlugin.git
munch-setup setup --codex-only --no-ifeo
```

The first command installs the package and command-line entry points. The
second command registers the Munch plugin, skill, and MCP server with Codex.
`--ignore-scripts` deliberately prevents npm from changing host configuration,
so the setup command is required.

The installer script will automatically:

1. **Install Skills**: Copy `SKILL.md` to destination folders for **Claude Code**, **KiloCode**, **Codex**, **Antigravity**, and **OpenCode**.
2. **Install Plugins**: Copy plugin modules for **OpenCode**, **Codex**, and **Antigravity**.
3. **Compile MCP Server**: Run `npm install` and compile typescript in the `mcp-server` directory.
4. **Configure Host Files**: Register the locally built stdio MCP server inside supported host configuration files.
5. **Configure PowerShell Redirection on Windows**: With an elevation prompt, preserve the HKLM IFEO rule that redirects `powershell.exe` to the bundled PowerShell 7 wrapper.

Installation and host configuration occur only when `npm run setup` or `munch-setup`
is explicitly executed. Starting the MCP server no longer rewrites host configuration
unless `MUNCH_AUTO_CONFIGURE=true` is set.

Installer lifecycle commands:

| Command | Purpose |
| --- | --- |
| `munch-setup plan` | Show managed destinations |
| `munch-setup setup --dry-run` | Preview changes without writing |
| `munch-setup setup` | Install and record ownership/backups |
| `munch-setup doctor` | Verify managed files and IFEO state |
| `munch-setup repair` | Reapply missing managed state |
| `munch-setup uninstall` | Restore backups and remove owned state |
| `munch-setup setup --no-ifeo` | Install without configuring IFEO |
| `munch-setup setup --codex-only --no-ifeo` | Register only the Codex plugin, skill, and MCP server |

---

## MCP Tools

| Tool               | Description                                        |
| ------------------ | -------------------------------------------------- |
| `load_skill`       | Load full SKILL.md or a named section into context |
| `list_sections`    | List all sections in the skill                     |
| `save_snapshot`    | Persist a §MEMORY snapshot for later restore       |
| `restore_snapshot` | Restore a saved snapshot by id                     |
| `list_snapshots`   | Show all snapshots persisted on disk                |
| `ping`             | Health check                                       |
| `remember_lesson`  | Persist a resolved bug or toolchain lesson          |
| `update_user_model`| Persist user preferences and technical context      |
| `observe_user_message` | Detect explicit likes, dislikes, favorites, corrections, and forget requests |
| `recall_user_preferences` | Rank remembered preferences with confidence and task scope |
| `forget_user_preference` | Remove a stored preference when explicitly requested |
| `recommend_technology_options` | Compare stack options without forcing the remembered favorite |
| `add_registry_fix` | Add or update an anti-regression rule                |
| `log_conversation` | Persist a concise conversation bridge                |
| `query_memory`     | Search persistent lessons, fixes, and summaries      |
| `track_recurrent_mistake` | Track repeating failures and attempted fixes |
| `update_timeline_task` | Track long-horizon task state and blockers      |
| `list_references` | List routed references and catalog metadata |
| `load_reference` | Load one supporting reference on demand |
| `export_memory` | Export the active global or project memory namespace |
| `clear_memory` | Explicitly clear the active memory namespace |
| `check_for_update` | Check the latest exact-version GitHub release |
| `apply_update` | Verify and install a checksummed release artifact |
| `compile_policy` | Compile SKILL.md directives into policy JSON |
| `negotiate_capabilities` | Select behavior from actual host capabilities |
| `detect_contradictions` | Find conflicts across instruction sources |
| `configure_runtime` | Configure trust, retention, and sensitivity |
| `start_trace` / `append_trace` / `replay_trace` | Record and verify deterministic traces |
| `record_provenance` / `get_provenance_graph` | Maintain confidence and evidence lineage |
| `create_evidence_bundle` | Persist requirements, changes, tests, risks, and hashes |
| `run_evaluation` | Compare Munch-enabled outputs with baselines |
| `score_references` / `record_reference_outcome` | Rank and learn reference usefulness |
| `build_context_package` | Fit ranked references into a token budget |
| `install_reference_pack` / `list_reference_packs` | Manage verified extension packs |
| `build_workspace_graph` / `predict_change_impact` | Map dependencies and change effects |
| `purge_expired_data` | Apply explicit retention deletion |
| `get_control_snapshot` | Inspect local reliability runtime state |

---

## Snapshot Export / Restore

When you say **"save state"** or **"export memory"**, the agent emits a YAML snapshot:

```yaml
§SNAPSHOT_v1.0:
  timestamp: "2026-05-30T12:00:00Z"
  user_preferences: []
  fix_registry: []
  hard_pins: []
  project_context:
    active_projects: []
    tech_stack: []
    design_tokens: []
    constraints: []
  user_model:
    skill_level: expert
    style: concise
    vocab: []
    rejected_patterns: []
    accepted_patterns: []
  pending: []
```

Snapshots created through MCP are stored under `~/.munchmemory/snapshots/` and
survive MCP process restarts.

Paste this at the start of a new session to restore context.
Or use the MCP `save_snapshot` / `restore_snapshot` tools.

---

## Runtime Safety

The MCP server starts without installing files, rewriting host configuration, or
pulling updates. Optional runtime behavior is controlled explicitly:

| Variable | Effect |
| --- | --- |
| `MUNCH_AUTO_CONFIGURE=true` | Run host self-configuration after MCP startup |
| `MUNCH_AUTO_UPDATE=true` | Check for versioned releases and notify; never applies automatically |
| `MUNCH_HTTP_TOKEN=<secret>` | Bearer token for Streamable HTTP mode; strongly recommended for public deployments |
| `MUNCH_ALLOWED_ORIGINS=https://host` | Comma-separated browser origins allowed for HTTP |
| `MUNCH_ALLOW_INSECURE_HTTP=true` | Permit tokenless HTTP for isolated local development |
| `MUNCH_ENABLE_LEGACY_SSE=true` | Enable deprecated `/sse` and `/messages` compatibility endpoints |
| `MUNCH_MAX_SESSIONS=100` | Maximum active remote MCP sessions |
| `MUNCH_SESSION_TTL_MS=1800000` | Idle session expiration |
| `MUNCH_MAX_BODY_BYTES=1048576` | Maximum HTTP request body |
| `MUNCH_RATE_LIMIT_PER_MINUTE=120` | Per-address request limit |
| `MUNCH_MEMORY_SCOPE=project` | Store memory under a project-specific namespace |
| `MUNCH_DESKTOP_NOTIFICATIONS=false` | Disable desktop notifications |
| `MUNCH_ALLOW_UPDATE_APPLY=true` | Permit explicitly confirmed exact-version updates |
| `MUNCH_RUNTIME_ENCRYPTION_KEY=<secret>` | Encrypt trace payloads, provenance, and evidence with AES-256-GCM |
| `MUNCH_RUNTIME_DIR=<path>` | Override reliability-runtime storage location |
| `MUNCH_ALLOW_REFERENCE_PACK_INSTALL=true` | Permit explicitly confirmed local reference-pack installation |
| `MUNCH_ALLOW_EXTERNAL_WORKSPACE_SCAN=true` | Permit workspace graph scans outside the MCP working directory |

The Windows HKLM IFEO PowerShell redirection remains part of the explicit installer.

Reliability CLI commands:

```bash
npm run policy:compile
npm run evaluate -- path/to/evaluation.json
```

Remote servers use MCP Streamable HTTP. The Vercel deployment is available at
`https://munch-ashy.vercel.app/api/mcp`, with `/mcp` provided as a shorter
alias. The root URL returns deployment status and the active authentication
mode.

Set `MUNCH_HTTP_TOKEN` in the Vercel project for production, preview, and
development environments. MCP clients must send
`Authorization: Bearer <token>`. Browser clients must also be listed in
`MUNCH_ALLOWED_ORIGINS` as a comma-separated set of exact origins. The Vercel
handler refuses to start without a token unless
`MUNCH_ALLOW_INSECURE_HTTP=true` is explicitly configured.

Vercel Functions have ephemeral local storage. Munch maps runtime memory to
`/tmp/.munchmemory` on Vercel, so durable cross-instance memory requires an
external persistence provider in a future release. Local stdio installations
continue to use `~/.munchmemory`.

The update checker uses published GitHub releases, not `git pull`. A repository
with no published release is treated as up to date; applying an update still
requires an exact version, checksummed release assets, and
`MUNCH_ALLOW_UPDATE_APPLY=true`.

---

## Structure

```
munch/
├── skill/
│   └── munch/
│       ├── SKILL.md              ← The skill (all agents)
│       ├── agents/
│       │   └── openai.yaml        ← Codex/Antigravity manifest
│       ├── scripts/              ← Supporting runtime/validation scripts & redirects
│       ├── references/           ← 43 routed engineering, reliability, polyglot, design, and QA references
│       └── assets/               ← Design token templates & snapshot schemas
├── mcp-server/
│   ├── src/index.ts              ← MCP tools and memory integration
│   ├── src/advanced-runtime.ts   ← policy, replay, provenance, context, graph, privacy, evidence
│   ├── package.json
│   └── tsconfig.json
├── opencode-plugin/
│   └── munch.plugin.ts           ← OpenCode plugin
└── README.md
```

---

## License

MIT — do whatever, attribution appreciated.

**§STATUS: ACTIVE v1.0 | ANTI_REGRESSION: ∞ON | SECURITY_KERNEL: AUTO**
