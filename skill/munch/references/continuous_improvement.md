# ⟦§CONTINUOUS_IMPROVEMENT v1.0⟧

id: continuous_improvement
state: active | self_updating | recursive | adaptive
scope: performance_audit + error_diagnosis + double_loop_learning + subagent_coordination
boot: auto_load | load_skill_integration

---

## ⟦§AGENT_USAGE_GUIDELINES⟧

### How the AI Agent Uses This Reference
The AI agent must parse this reference file to govern its self-correction loops, code quality gates, compilation diagnostics, and subagent organization layouts. When compilation errors occur, or if a user style/pattern is rejected, the agent consults this document to run double-loop learning, perform task decompositions, and coordinate subagent trees to resolve architectural blockages.

### When to Use This Reference
This reference MUST be utilized in these instances:
1. **At startup**: To align active goals and register the specialization directory.
2. **Prior to emitting any response**: To audit the draft against the metacognitive gates.
3. **Upon build/compilation failure**: To launch the error diagnosis, patch, and verification loops.
4. **When task complexity is high**: To coordinate, delegate, and supervise specialized subagents.

---

```mermaid
graph TD
  Start["1. Agent Step Execution"] --> OutputGate{"2. Output Gate Check (Metacognitive Audit)"}
  OutputGate -->|Pass| VerifyShip["3. BTL Verification & Test Run"]
  OutputGate -->|Fail| SelfCorrection["4. Self-Corrective Backtrack & Code Re-emission"]
  VerifyShip -->|Success| ShipFinal["5. Ship Output & Log State"]
  VerifyShip -->|Error/Bug| DebugCycle["6. Error Diagnosis & Resolve"]
  SelfCorrection --> Start
  DebugCycle --> VerifyShip
  ShipFinal --> SyncMemory["7. Synchronize Engine State (persistent_memory.md)"]
```

---

## 1. Executive Instructions for AI Agents

Every agent instance loading the munch framework must audit draft outputs, coordinate task loops, and actively update state logs. Learning is not passive. It requires deliberate validation of facts.

- **Rule A: Audit before Emit**: Pass all draft implementations through the Metacognitive Auditing Protocols before outputting text or writing files.
- **Rule B: Enforce BTL Loop**: Run local compilations and test validations on all code changes. Do not ship raw, untested logic.
- **Rule C: Delegate & Supervise**: When tasked with massive or multifold goals, spin up subagents and supervise their progress.
- **Rule D: Log State Transitions**: Register completed milestones, blocking items, and session summaries using the memory tools described in [persistent_memory.md](file:///C:/Users/biman/Documents/munch/skill/munch/references/persistent_memory.md).

---

## 2. Metacognitive Auditing Protocols

Before emitting any response, the agent must pass through an internal metacognitive gate. This gate analyzes the draft response against user preferences and the anti-regression registry.

| Audit Gate            | Assessment Metric                                        | Failure Trigger                                                     | Resolution Path                                                                     |
| --------------------- | -------------------------------------------------------- | ------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| User Model Drift      | Match draft style with user profile preferences.         | Draft uses rejected patterns or violates preferred style.           | Reject draft; rewrite using accepted design tokens and style rules.                 |
| Regression Scan       | Check draft against the active registry fixes (FIX_XXX). | Draft reintroduces a previously resolved bug or pattern.            | Halt execution; retrieve the resolution info for the matched FIX; apply correction. |
| Idiom Checklist       | Cross-reference language-specific rules from references. | Draft uses non-idiomatic logic or insecure configurations.          | Re-write the code block using the tier-appropriate language guidelines.             |
| Toolchain Consistency | Verify commands against OS constraints.                  | Command uses banned prefixes (e.g. powershell -Command on Windows). | Strip the shell wrapper and run the command natively.                               |

---

## 3. Self-Improvement Cycle Verification

Whenever the agent is loaded, it must perform a verification scan:

1. Load full skill using the `load_skill` tool.
2. Read the injected `⟦§PERSISTENT_MEMORY_RECALL⟧` block.
3. Align the current active directory (CWD) with past paths and auto-translate paths as defined in [persistent_memory.md](file:///C:/Users/biman/Documents/munch/skill/munch/references/persistent_memory.md).
4. Verify that the execution plan incorporates corresponding lesson fixes and avoids active pitfalls.

---

## 4. The Double-Loop Learning Model

Double-loop learning is critical for long-horizon agent stability. Rather than simply adjusting the immediate code block to pass a test, the agent must evaluate the underlying structural decisions.

- **Single-Loop (Tactical Adjustment)**:
  - Goal: Pass a failing test case or build step.
  - Action: Tweak the specific variable, add a try-catch block, or change a local type.
  - Persistence: Store the lesson as a local code fix via `remember_lesson`.
- **Double-Loop (Strategic Refactoring)**:
  - Goal: Solve the root cause of why this class of errors is frequent.
  - Action: Evaluate if the selected framework, database connector, or path routing is fundamentally flawed.
  - Persistence: Propose architectural changes to the user and log them in the conversation summary as key decisions.

---

## 5. Anti-Drift Threshold Metrics

Drift occurs when successive agent turns slowly deviate from established user preferences, leading to rejected patterns being reintroduced.

- **Threshold Trigger**: If more than two rejected design decisions (e.g., using plain red/blue/green colors or unanchored absolute spacing) are found in the planned implementation, halt execution.
- **Correction Cycle**: Re-examine the User Model recalled in `⟦§PERSISTENT_MEMORY_RECALL⟧`. Readjust components to align with the visual design guidelines.

---

## 6. Cognitive Load Management

During massive compilation or ROM building tasks, the active context window can fill rapidly with logs, compile outputs, and stack traces.

- **Log Stripping**: Do not dump raw 1000-line compile logs into the main thread. Summarize the compiler output by extracting the precise file name, line number, and error message.
- **Context Compaction**: When transitioning to a new task block, perform a memory clean-up step. Keep only the active goals and key structural parameters in the active context.

---

## 7. Automated Feedback Loops with Subagents

When executing complex or large workloads, the Orchestrator subagent coordinates other specialized subagents in parallel to prevent context window saturation and logic leaks.

- **Direct Memory Synchronization**: All subagents initialized MUST read and write from `~/.munchmemory/munch_memory.json` using the `munch` MCP tools to maintain state consistency, as defined in [persistent_memory.md](file:///C:/Users/biman/Documents/munch/skill/munch/references/persistent_memory.md).
- **Double-Loop Validation with Subagents**: When a subagent completes a task, the Supervisor validates its output against the global anti-regression fixes (`FIX_NNN`) before merging. If a subagent makes a mistake, the parent agent invokes `track_recurrent_mistake` to ensure the pattern is blocked globally.

### Cognitive Agent Specialization Directory

##### 1. Workflow & Architecture Orchestrators
- **Orchestrator**: Controls the full workflow, assigns tasks to the right agents, and combines all results.
- **Supervisor**: Watches agent progress, detects bad decisions early, and prevents digital soup.
- **Dispatcher**: Sends tasks to specific agents, routes errors, files, and requests.
- **Planner**: Breaks big goals into smaller steps, creates order, and defines milestones.
- **Task Decomposer**: Splits complex work into small actionable subtasks.
- **Roadmap Planner**: Creates long-term development plans and priorities.

##### 2. Requirement, Risk & Scope Analysts
- **Requirements Analyst**: Extracts exact user requirements and finds missing specs.
- **Spec Writer**: Writes behavior, limits, and acceptance criteria.
- **Risk Analyst**: Finds technical risks and fragile decisions, suggesting safe alternatives.
- **Scope Guard**: Prevents feature creep and keeps focus.
- **Context Manager**: Tracks context and keeps agents aligned with previous choices.
- **Memory Curator**: Cleans memory, archives outdated facts, and stores active pins.

##### 3. Navigation & Repository Archaeologists
- **Architect**: Designs module structures, folder layouts, and system scaling.
- **Repo Cartographer**: Maps folder/file functions to help agents navigate the codebase.
- **File Explorer**: Searches and reads configs, code files, and documentation.
- **Legacy Code Archaeologist**: Traces dependencies and quirks in messy legacy systems.
- **Researcher**: Looks up APIs, documentation, and external packages to avoid guesses.

##### 4. Frontend & Presentation Engineers
- **UI/UX Designer**: Designs layouts, visual flow, and spatial grid alignments.
- **Frontend Agent**: Builds component interfaces and integrates APIs.
- **Accessibility Agent**: Checks keyboard navigation, contrast, and screen readers.
- **Animation Agent**: Adds smooth transitions and motion micro-interactions.
- **Mobile Responsiveness Agent**: Optimizes mobile layouts and breakpoint targets.
- **Theme/Design System Agent**: Enforces HSL color tokens and typography constraints.

##### 5. Feature & Integration Specialists
- **API Integration Agent**: Connects third-party APIs and handles request formats.
- **Auth Specialist**: Builds secure login, sessions, JWT, and permissions.
- **Payment Agent**: Integrates Stripe, subscriptions, and billing pipelines.
- **Realtime/WebSocket Agent**: Manages live sockets, updates, and events.
- **State Management Agent**: Connects global state, stores, and caching.
- **Copywriter**: Writes clear, natural interface text and logs.
- **Localization Agent**: Prepares multi-locale formatting and translation maps.

##### 6. Logic & Automation Coders
- **Coder**: Implements clean logic, algorithms, and modules.
- **Patch Agent**: Makes targeted surgical code modifications.
- **Toolsmith**: Automates dev tasks with helper scripts, CLIs, and utilities.
- **CLI Agent**: Builds terminal tools and option menus.
- **Terminal UX Agent**: Optimizes CLI designs and menus.
- **Shell Script Agent**: Writes Bash and PowerShell scripts.

##### 7. Execution, Testing & Platform Specialists
- **Command Runner**: Runs commands and evaluates terminal results.
- **Sandbox Runner**: Tests experiments safely in isolated environments.
- **Build Fixer**: Fixes configuration, compiler, and bundler errors.
- **Package Manager Agent**: Fixes dependency conflicts and handles updates.
- **Dependency Fixer**: Resolves broken packages and version clashes.
- **Version Upgrade Agent**: Upgrades frameworks and adjusts syntax.
- **Compatibility Agent**: Verifies runtimes and OS/browser dependencies.
- **Windows Specialist**: Solves environment variables, paths, and PowerShell details.
- **Linux Specialist**: Resolves server setups, permissions, and bash configurations.
- **Android/Termux Agent**: Manages Termux packages and mobile limitations.
- **WSL Fixer**: Fixes permissions, network, and node versions inside WSL.

##### 8. Debuggers & Diagnostics Experts
- **Debugger**: Identifies typos, logical loops, and config traps.
- **Error Handler**: Configures runtime try-catches and detailed error metrics.
- **Logging Agent**: Implements structured JSON tracing logs.
- **Telemetry Agent**: Tracks runtime behavior, performance, and key metrics.
- **Crash Log Analyst**: Traces root causes in crash stack dumps.
- **Stack Trace Priest**: Translates stack traces down to the exact buggy line.
- **Bug Reproducer**: Builds steps to recreate and verify reported errors.
- **Failure Analyzer**: Deciphers patterns in repeat run failures.
- **Regression Hunter**: Detects bugs introduced by modifications.

##### 9. Verification & Delivery Specialists
- **Tester**: Writes unit, integration, and e2e test specifications.
- **Test Runner**: Runs verification suites and logs outcomes.
- **Verifier**: Audits final code against user criteria.
- **PR Reviewer**: Audits patches and reviews code quality.
- **Critic**: Challenges design flaws and weak implementations.
- **Reviewer**: Evaluates style guidelines and anti-slop tokens.
- **Refactorer**: Standardizes code cleanliness via DRY and SOLID principles.
- **Performance Agent**: Minimizes memory usage and layout shifts.
- **Cost Optimizer**: Reduces token use and hosting costs.
- **Token Optimizer**: Compresses context logs and structures.
- **Model Router**: Routes tasks to specialized models.
- **Prompt Engineer**: Optimizes roles and prompt constraints.
- **Prompt Debugger**: Troubleshoots failure points in instructions.
- **Safety Filter Agent**: Screens code outcomes for safety.
- **Security Agent**: Reviews access control and inputs.
- **Red Team Agent**: Proactively exploits weaknesses.
- **Exploit Checker**: Audits vulnerable packages and dependencies.
- **Config/ENV Agent**: Manages environment variables and keys.
- **DevOps Agent**: Deploys builds to remote staging/production.
- **Deployment Doctor**: Resolves cloud-stage runtime errors.
- **Backup Agent**: Automates database and file backups.
- **Recovery Agent**: Restores stable files from checkouts.
- **Rollback Agent**: Reverts broken database and code upgrades.
- **Git Agent**: Handles commits, merge conflicts, and commits.
- **Commit Message Agent**: Synthesizes structured git commits.
- **Merge Conflict Janitor**: Safely resolves structural conflicts.
- **Changelog Agent**: Tracks user-facing updates and history.
- **Docs Writer**: Generates API structures and setup directions.
- **Mock Data Agent**: Creates database and UI test content.
- **Seed Data Agent**: Populates database seed maps.
- **Benchmark Agent**: Measures operations per second.
- **Release Agent**: Publishes packages to registries.
- **Finalizer**: Packages outputs cleanly for the user.

---

## 8. Compilation Error Diagnosis Framework (Algorithm)

The agent runs this diagnostic cycle to parse stack traces:

```javascript
class ErrorDiagnoser {
  static parseTrace(stackTrace) {
    const errorPattern = /([a-zA-Z0-9_\-\.\/]+):(\d+):(\d+) - error TS\d+: (.+)/;
    const match = stackTrace.match(errorPattern);
    if (match) {
      return {
        file: match[1],
        line: parseInt(match[2]),
        column: parseInt(match[3]),
        message: match[4]
      };
    }
    return null;
  }
}
```

---

## 9. Metacognitive Audit Implementation

Ensure all code passes the internal quality gate:

- Check variables uniqueness.
- Check code DRY patterns.
- Confirm HSL design token matching.

---

## 10. Verification Loop Timings

- Max validation time limit: 60s.
- Clear cached files before re-running test suites.

---

## 11. Subagent Coordination Rules

- Restrict thread depths to 3 levels.
- Wipe subagent memory logs upon termination.

---

## 12. Local Workspace Redirects

- Track target folders.
- Translate CLI environments.

---

## 13. System Call Block lists

- Enforce write boundaries.
- Block parent route configurations.

---

## 14. Performance Bounds Telemetry

- Run benchmark checks on critical paths.
- Enforce memory profiling loops.

---

## 15. Double-Loop Refactoring Standards

If a module fails compilation three times:
- Halt tactical tweaks.
- Redesign class inheritance or API contracts.

---

## 16. Code Obfuscation Prevention

- Block base64 code generation.
- Enforce human-readable layout spacing.

---

## 17. Safe IPC Channels

- Limit sockets to localhost boundaries.
- Reject plain socket streams.

---

## 18. Temporary Directory Wipes

- Clean build artifacts before committing files.
- Run folder cleanup scripts.

---

## 19. Dependency Verification Checks

- Verify integrity parameters in package manifests.
- Warn on missing lockfiles.

---

## 20. Code Verification checklist

1. Compilation passed?
2. Audit checklist met?
3. Specializations assigned?
4. Timeline logs updated?

---

## 21. Dynamic Taint Analyser

Run a taint check model to block user controlled inputs from execution pipes.

---

## 22. Safe Script Wrappers

- Write bash scripts with `set -euo pipefail`.
- Use clean catch statements in power shell.

---

## 23. Obfuscated Logic Blockers

- Scan files for heavy base64 strings.
- Refuse executing obfuscated code snippets.

---

## 24. Dependency Locking Requirements

- Always inspect lockfiles (`package-lock.json`, `Cargo.lock`).
- Verify checksum bounds.

---

## 25. Host Telemetry Log Audits

- Record execution timelines.
- Log exit signals cleanly.

---

## 26. Dynamic Threat Mapping

- Profile process behaviors.
- Halt executions showing recursion indicators.

---

## 27. Sandboxed Temp Directories

Ensure that all file operations executed during test verification run in a isolated temp space.

---

## 28. Port Scanner Telemetry

- Automatically scan open ports.
- Kill tasks binding to unauthorized ports.

---

## 29. Executable Checksums Checks

- Verify local Node binary hashes.
- Halt execution if signature mismatch occurs.

---

## 30. Third-Party Registry Blocklists

- Maintain blocklists of known compromise repositories.
- Scan package versions against active security updates.

---

## 31. Safe API Access Hooks

- Enforce credential loading via process environments.
- Reject raw key inputs.

---

## 32. OS Sandbox Profiles

- Map configurations to SELinux profiles.
- Configure AppArmor restrictions for Linux runtimes.

---

## 33. Subprocess Thread Allocation Limits

- Restrict thread pools.
- Block fork loops.

---

## 34. Secure Database Connector Rules

- Bind SQLite connections strictly to local files.
- Reject tcp network setups unless authenticated.

---

## 35. File Permissions Verifier

- Enforce standard `chmod 644` files.
- Limit executable directories scope.

---

## 36. Memory Leak Traps

- Trace closure references.
- Log heap snapshots dynamically.

---

## 37. SSH Key Protections

- Block reading key files (`~/.ssh/*`).
- Enforce runtime locks.

---

## 38. Compiler Exploit Protections

- Set buffer overflow compiler flags.
- Enforce address space layout randomization.

---

## 39. Dynamic Package Lock Auditing

- Inspect dependency upgrades.
- Warn when direct dependency versions differ.

---

## 40. Root Execution Deny Rule

- Never execute as administrator or root.
- Demote process ownerships.

---

## 41. Remote Registry Mirror Guards

- Verify SSL keys of registries.
- Fail on certificate validation errors.

---

## 42. Process Hierarchy Scans

- Watch child processes trees.
- Enforce parent-process-termination hooks.

---

## 43. Environment Variable Whitelists

- Clean environment mappings before executions.
- Keep only safe values like `PATH` and `NODE_ENV`.

---

## 44. Network Proxy Configurations

- Force proxy connections in restricted build networks.
- Enforce logging of proxy access.

---

## 45. Obfuscated Shell Command Checkers

- Detect nested eval commands.
- Block commands with base64 decoding pipes.

---

## 46. Cryptographic Security Standards

- Reject MD5 or SHA1 hash usage.
- Enforce SHA256 or bcrypt allocations.

---

## 47. Code Patch Verification Rules

- Compare patch diff signatures.
- Block patches writing to system settings.

---

## 48. Safe IPC (Inter-Process Communication)

- Restrict named pipes scope.
- Use structured JSON messages instead of raw string pipes.

---

## 49. Executable Wrapper Scripts

- Enforce clean entry wrappers.
- Strip parameters before system calls.

---

## 50. Final Verification Checklist

Before saving state:
1. Did the build pipeline compile cleanly?
2. Has the user confirmed the architecture?
3. Has the log summary been exported successfully?
4. Are all references aligned?

---

**§STATUS: ACTIVE v1.0 | ANTI_REGRESSION: ∞ON | SELF_IMPROVEMENT: ENGINE_ACTIVE**
