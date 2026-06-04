# ⟦§PERSISTENT_MEMORY v1.0⟧

id: persistent_memory
state: active | self_updating | recursive | adaptive
scope: knowledge_retention + error_log + preference_model + state_synthesis + task_timeline
boot: auto_load | load_skill_integration

This supporting skill establishes the cognitive frameworks, schema rules, and tool interactions for the Self-Improving Memory Engine (SIME). It instructs the agent on how to track user profiles, record resolved compiler bugs, manage regression pins, and manage the long-horizon timeline across sessions and hosts.

```mermaid
graph TD
  Start["1. Task Execution / Debug Resolve"] --> SaveMemory{"2. Resolve & Update Memory?"}
  SaveMemory -->|Bug/Compilation Error Fixed| PersistLesson["3. Call remember_lesson Tool"]
  SaveMemory -->|User Style/Stack Update| PersistProfile["4. Call update_user_model Tool"]
  SaveMemory -->|Regression Blockers Found| PersistFix["5. Call add_registry_fix Tool"]
  SaveMemory -->|Long-Horizon Goal Shift| PersistTimeline["6. Call update_timeline_task Tool"]
  SaveMemory -->|Session Concluded| PersistConv["7. Call log_conversation Tool"]
  
  PersistLesson --> SyncFile["8. Write to ~/.munchmemory/munch_memory.json"]
  PersistProfile --> SyncFile
  PersistFix --> SyncFile
  PersistTimeline --> SyncFile
  PersistConv --> SyncFile
  
  SyncFile --> LoadSession["9. Inject Context via load_skill on Next Session start"]
```

---

## 1. The Lessons Learned Protocol (remember_lesson)

When recording a lesson, format the inputs into irreducible technical facts. Avoid conversational descriptions. Stick to exact symptoms and concrete fixes.

### A. Symptom Taxonomy
- **Category**: Define the boundaries clearly. Use categories like "WSL2 Custom ROM Build", "TypeScript Type Constraints", or "Vanilla CSS Flexbox Layout".
- **Symptom**: Paste the exact compiler error line, stack trace segment, or visual misbehavior description.
- **Fix**: Write the exact CLI command, compiler flag, or code block change that resolved the symptom.

### B. Example Mapping
- **Symptom**: Kotlin compile fails on Windows with 'Duplicate class found in modules' during Gradle build.
- **Fix**: Append 'multiDexEnabled true' in build.gradle and configure gradle.properties with 'android.useAndroidX=true'.
- **Action**: Execute `remember_lesson` with this mapping to store it permanently in the user's local memory file.

---

## 2. Adaptive User Profile Learning (update_user_model)

The agent must adapt to the user's working style and environment. Do not ask the user for their profile; infer and update it dynamically based on the interaction.

- **Inferring Skill Level**:
  - If user provides high-level architecture diagrams or requests bare-minimum concise edits -> Set skillLevel to "expert".
  - If user requests explanations of basic concepts or needs step-by-step guidance -> Set skillLevel to "novice" or "intermediate".
- **Inferring Banned Patterns**:
  - If user rejects an animation framework, gradient style, or file system API -> Append that pattern to the rejectedPatterns array immediately. Never reuse a rejected pattern in subsequent turns or sessions.

---

## 3. Anti-Regression & Registry Pinning (add_registry_fix)

Registry pins are hard constraints that prevent regression. They act as automated quality gates.

- **Step 1: Identify Regression Risks**: Any bug that took more than 2 debugging cycles to solve is a prime candidate for a registry pin.
- **Step 2: Assign a FIX ID**: The system automatically assigns a serial ID (e.g. `FIX_001`, `FIX_002`) to every registry fix.
- **Step 3: Enforce the Fix**: On every subsequent file edit, search the file content to ensure that the logic of the regression fix is not overwritten or reverted.

---

## 4. Long-Horizon Task Tracking (update_timeline_task)

Long-horizon tasks require structured progress tracking across workspace shifts and system restarts.

- **Objective Registration**: When a task has multiple subtasks or spans across sessions, invoke `update_timeline_task` with the task name, status (`active`, `completed`, `blocked`, `deferred`), active blockers, and achieved milestones.
- **Context Resiliency**: The main agent (acting as Orchestrator) updates this timeline periodically as goals are met. When a new session is initialized, the timeline tasks are automatically printed in the context block to anchor the active goals.

---

## 5. Conversation Summarization & Bridging (log_conversation)

Summarizing the session is the final step in the continuous learning cycle. It creates a cognitive link so that the next agent session can resume work immediately without loss of momentum.

- **Structure of the Summary**:
  - **Milestones**: List all files modified, features implemented, and tests passed.
  - **Design Decisions**: Document why specific patterns, paths, or tools were chosen over alternatives.
  - **Open Threads**: Outline what tasks remain unfinished or what options need clarification.
- **Tagging**: Use descriptive tags (e.g. `["android-kernel", "mcp-server-routing", "css-grid"]`) to make queries fast.

---

## 6. Knowledge Synthesis & Data Compaction

To prevent context window pollution from growing indefinitely over time, the SIME engine automatically compacts memories.

- **Recent History (sliding window)**: Only the most recent 10 conversation summaries and active timeline tasks are injected into the active prompt context via `load_skill`.
- **Historical Lessons (archived)**: Older lessons remain stored in the JSON file and can be explicitly queried using the `query_memory` tool when the agent runs into unfamiliar errors.
- **Consolidation**: Over time, duplicates or similar errors are merged into generalized rules, keeping the memory file clean and high-density.

---

## 7. State Restructure & Schema Evolution

As the system is updated, the memory schema in the JSON files will evolve. The agent must handle migrations gracefully.

- **Data Integrity Check**: The server parses incoming memories with strict type guards. If an older schema is loaded, missing fields (e.g., `recurrentMistakes`, `timeline`) are populated with safe defaults.
- **Schema Conversions**: If a session snapshot uses a legacy key format, convert it during deserialization and save the migrated structure back to disk.

---

## 8. Cross-Host Synchronization (Local vs Remote)

SIME is designed to synchronize knowledge across both local client setups and remote deployment services.

- **Local Paths**: Reads and writes to `~/.munchmemory/munch_memory.json` on the host machine.
- **Remote Consistency**: When deploying the MCP server to remote hosting platforms (e.g. Railway), the database can reside in a persistent volume or stateful storage. If remote storage is not available, the agent relies on session snapshots to bridge state, using `log_conversation` as a structured export format.

---

## 9. Failure Recovery and Troubleshooting for SIME

In rare cases of memory file corruption or serialization errors, apply the following recovery paths.

- **Error Detection**: If reading `munch_memory.json` fails due to syntax or parsing exceptions, log a warning and fallback to the default template structures.
- **Automatic Backup**: The server writes to a temporary swap file before replacing `munch_memory.json`. If writing fails, it restores the previous state, preserving all historical lessons.
- **Manual Re-sync**: If the database is out of sync, the user can force a rewrite by pasting a session snapshot yaml and triggering `restore_snapshot`.

---

## 10. Cross-Project Path Mapping and Transfer Learning

When the user moves the project workspace, clones it to a new path, or starts a different project directory:

- **Immediate Analysis**: On session start, retrieve the persistent memory (`munch_memory.json`) and compare the current active directory (`CWD`) with the paths stored in past lessons or regression registry files.
- **Dynamic Translation**: Translate all absolute paths referencing the old directory structure to match the corresponding files/subfolders in the new active project folder.
- **Transfer Learning**: Do not discard past errors or fixes just because the project resides in a new directory. Apply the lessons, fixes, and style preferences from the previous project to the current active workspace, treating it as an analogical continuation.
- **Self-Improving Memory Engine Strategy**: Map file patterns, language structures, and framework layouts. If a compilation bug was solved on `/home/user/example/src/main.rs`, and the current folder is `/home/user/new-project/src/main.rs`, translate the lessons and enforce the same fixes to prevent regression.

### A. Cross-Project Topology Maps & Folder Alignment
- **Path Offset Delta Matching**: If the root folder has shifted (e.g., from `/Users/biman/projects/app-v1` to `/Users/biman/dev/app-v2`), identify the parent delta and translate the file structures. Map key directories like `src/components` to `lib/components` or `app/routes` to `src/pages` based on folder signatures.
- **File Signature Mapping**: When starting in a new repository, check the file extension topology (e.g., `.ts`, `.rs`, `.kt`, `.py`) and configurations (`package.json`, `Cargo.toml`, `build.gradle.kts`) to automatically link its category to previous projects.

### B. Multi-Repository Tech Stack Synthesis
- **Fuzzy Analogy Engine**: Query the lessons registry using Jaccard fuzzy token similarity. If project B throws a compilation error similar to one in project A (even with different imports or module names), run a cross-project query to extract and adapt project A's fix.
- **Automatic Gradle & Compiling Sync**: If a Gradle flag or compiler options fix was applied in project A, auto-inject or check that compiler setting in project B when compilation failures occur.

### C. Architectural Decision Record (ADR) Sync
- **Preferred Design Tokens**: If a layout structure, HSL color system, typography baseline, or routing layout was accepted by the user in project A, load it as the default design archetype for project B.
- **Structural Strategy Consistency**: Track the user's architectural choices (e.g., Zustand vs Redux, SQLite vs Postgres, Clean Architecture vs Flat structure). Prevent proposing rejected architectures from past projects.

---

## 11. Global Codebase Directory & Project DNA Registry

To build a unified brain across workspaces, the SIME engine maintains metadata signatures of all indexed repositories in `munch_memory.json`'s `projectModel` schema:

- **Project Metadata**: Tracks the last active timestamp, absolute path, primary language, active tools, environment parameters (WSL, terminal type, node version), and key dependency versions.
- **Global Search & Retrieve**: When the agent encounters a task in a brand-new project, it automatically scans the Project DNA Registry to fetch analogous implementations, preventing cold-start assumptions.

---

## 12. Dynamic Knowledge Synthesis Verification Checklist

Before wrapping up a work cycle, the agent must run through these verification steps to guarantee memory synchronization:

- **Check A**: Have all newly resolved compilation errors been captured using the `remember_lesson` tool?
- **Check B**: Has the user profile been updated if the user specified a new framework version or lint rule?
- **Check C**: Has any complex multi-step fix been pinned using `add_registry_fix`?
- **Check D**: Have active tasks and blockers been registered via `update_timeline_task`?
- **Check E**: Has the project DNA registry been updated with the current project's active dependencies and directories layout?
- **Check F**: Has the session been summarized and saved via `log_conversation`?

**§STATUS: ACTIVE v1.0 | ANTI_REGRESSION: ∞ON | MEMORY_ENGINE: PERSISTENT**
