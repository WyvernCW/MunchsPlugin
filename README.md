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

---

## Compatibility

| Tool | Method | Location |
|------|--------|----------|
| **Claude Code** | Skill | `.claude/skills/munch/SKILL.md` or `~/.claude/skills/munch/SKILL.md` |
| **Claude.ai** | Skill (Projects) | Upload `skill/munch/SKILL.md` as project knowledge |
| **KiloCode** | Skill | `.kilocode/skills/munch/SKILL.md` or `~/.kilocode/skills/munch/SKILL.md` |
| **OpenCode** | Skill + Plugin | `.opencode/skills/munch/SKILL.md` + `opencode-plugin/munch.plugin.ts` |
| **Codex CLI** | Skill + Plugin | `~/.agents/skills/munch/SKILL.md` + `codex-plugin/` |
| **Antigravity CLI** | Skill | `~/.gemini/skills/munch/SKILL.md` |
| **Antigravity IDE** | Skill | `~/.gemini/skills/munch/SKILL.md` |
| **Any MCP host** | MCP Server | See `mcp-server/` |

---

## Quick Install

### Skill only (Claude Code, KiloCode, Codex, Antigravity)

```bash
# Clone repo
git clone https://github.com/YOUR_HANDLE/munch.git

# Claude Code (global)
mkdir -p ~/.claude/skills/munch
cp skill/munch/SKILL.md ~/.claude/skills/munch/SKILL.md

# KiloCode (global)
mkdir -p ~/.kilocode/skills/munch
cp skill/munch/SKILL.md ~/.kilocode/skills/munch/SKILL.md

# Codex (global)
mkdir -p ~/.agents/skills/munch
cp skill/munch/SKILL.md ~/.agents/skills/munch/SKILL.md

# Antigravity CLI + IDE (shared global)
mkdir -p ~/.gemini/skills/munch
cp skill/munch/SKILL.md ~/.gemini/skills/munch/SKILL.md

# OpenCode (global)
mkdir -p ~/.config/opencode/skills/munch
cp skill/munch/SKILL.md ~/.config/opencode/skills/munch/SKILL.md
```

### OpenCode Plugin

```bash
# Project-level
mkdir -p .opencode/plugins
cp opencode-plugin/munch.plugin.ts .opencode/plugins/munch.plugin.ts

# Global
mkdir -p ~/.config/opencode/plugins
cp opencode-plugin/munch.plugin.ts ~/.config/opencode/plugins/munch.plugin.ts
```

### Codex / Antigravity Plugin

```bash
# Codex — user-level
mkdir -p ~/.agents/plugins/munch
cp -r codex-plugin/* ~/.agents/plugins/munch/
cp skill/munch/SKILL.md ~/.agents/plugins/munch/skill/munch/SKILL.md

# Antigravity — shared global plugins
mkdir -p ~/.gemini/config/plugins/munch
cp -r codex-plugin/* ~/.gemini/config/plugins/munch/
```

### MCP Server

```bash
cd mcp-server
npm install
npm run build

# Claude Code — add to .claude/settings.json or ~/.claude/settings.json
# {
#   "mcpServers": {
#     "munch": {
#       "command": "node",
#       "args": ["/absolute/path/to/munch/mcp-server/build/index.js"]
#     }
#   }
# }

# OpenCode — add to opencode.json
# { "mcp": { "munch": { "command": "node", "args": ["./mcp-server/build/index.js"] } } }

# Antigravity — add to ~/.gemini/config/mcp_config.json
# { "mcpServers": { "munch": { "command": "node", "args": ["/path/to/munch/mcp-server/build/index.js"] } } }

# Codex — add to ~/.codex/config.toml
# [mcp.munch]
# command = "node"
# args = ["/path/to/munch/mcp-server/build/index.js"]
```

---

## MCP Tools

| Tool | Description |
|------|-------------|
| `load_skill` | Load full SKILL.md or a named section into context |
| `list_sections` | List all sections in the skill |
| `save_snapshot` | Persist a §MEMORY snapshot for later restore |
| `restore_snapshot` | Restore a saved snapshot by id |
| `list_snapshots` | Show all snapshots saved this session |
| `ping` | Health check |

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

Paste this at the start of a new session to restore context.  
Or use the MCP `save_snapshot` / `restore_snapshot` tools.

---

## Structure

```
munch/
├── skill/
│   └── munch/
│       └── SKILL.md              ← The skill (all agents)
├── mcp-server/
│   ├── src/index.ts              ← MCP server source
│   ├── package.json
│   └── tsconfig.json
├── opencode-plugin/
│   └── munch.plugin.ts           ← OpenCode plugin
├── codex-plugin/
│   └── agents/openai.yaml        ← Codex/Antigravity plugin manifest
└── README.md
```

---

## License

MIT — do whatever, attribution appreciated.

**§STATUS: ACTIVE v1.0 | ANTI_REGRESSION: ∞ON | SECURITY_KERNEL: AUTO**
