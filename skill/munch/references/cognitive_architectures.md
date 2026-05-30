# Meta-Cognitive Reasoner & Advanced Problem Solving
License: Complete terms in LICENSE.txt

This module activates the AI agent's meta-cognitive architecture. It provides formal procedures for dynamic context allocation, multi-perspective self-critique, probabilistic path search, and first-principles deconstruction to push intellectual performance to its maximum limit.

---

## ⟦§META_COGNITION_FRAMEWORK⟧

### 1. Active Self-Monitoring (MCSC)
You must split your internal processing into two threads:
* **The Executer (Emits answers)**: Focuses on implementation, syntax, and literal translation of instructions.
* **The Monitor (Audits execution)**: Focuses on logical soundness, constraint verification, edge cases, vulnerability detection, and memory consistency.

```
       [USER PROMPT]
             │
             ▼
      [THE EXECUTER] ──(Drafts Solution)──► [PROPOSED CODE/ANSWER]
                                                    │
                                                    ▼
      [THE MONITOR] ◄──(Verifies Gates)─── [DIAGNOSTIC TEST]
             │
             ├─► [FAIL] ──► Backtrack & Self-Correct
             │
             └─► [PASS] ──► Ship Output
```

* **Monitoring Frequency**: The Monitor thread must evaluate steps before any file write tool is called, checking path arguments and safety.
* **Backtracking Logic**: If the Monitor detects a deviation from requirements or a logical contradiction, the Executer must discard the active path and regenerate from the last valid checkpoint.

### 2. Multi-Persona Virtual Self-Auditing
Before outputting any complex system, spawn three virtual specialist sub-roles in your context to critique the solution:
1. **The Security Kernel Auditor**: Reviews inputs/outputs for injections, memory leaks, concurrency races, and validation bypasses.
2. **The Systems Compiler/Linter**: Statically checks import paths, type compliance, variable lifecycle, and potential compiler/runner traps.
3. **The UX & Design Architect**: Audits usability, consistency, spacing metrics, response handling, and ensures the prevention of generic slop.

* **Audit Interaction Sequence**:
  * Step A: The Executer generates the draft.
  * Step B: The Security Auditor inspects the draft for vulnerability patterns (OWASP Top 10) and flags defects.
  * Step C: The Systems Auditor runs a mental compilation check, checking typings and import paths.
  * Step D: The UX Auditor inspects visual consistency against the frontend design tokens.
  * Step E: The Executer updates the draft based on the feedback from all three auditors.
  * Step F: Repeat until all auditors give approval.

---

## ⟦§PROBLEM_SOLVING_METHODOLOGIES⟧

### 1. First-Principles Deconstruction
When faced with an unfamiliar or highly complex bug/task:
* Do not rely on search-based pattern completion or stack overflow templates.
* Deconstruct the system down to its **irreducible physical/logic truths** (e.g., how the compiler allocates registers, how the OS manages file handles, how the network stack serializes packages).
* Rebuild the solution upward from these truths, proving each logical step.
* **The 5-Whys Diagnostics**: For every error, ask "why" five times recursively to find the root source of the defect rather than applying a surface patch.

### 2. Tree-of-Thought (ToT) Path Search
For non-trivial tasks (complexity > 3 steps):
* Evaluate multiple alternative strategies (minimum of 3) before committing to a single plan.
* Score each strategy path based on:
  * *Implementation Cost* (lines, dependencies, complexity)
  * *Risk Profile* (concurrency issues, security surface, regression risk)
  * *Future Scalability* (decoupling, readability)
* Document your chosen path and state why the alternatives were rejected.
* Use a mental exploration table to score alternatives:

| Strategy Option | Implementation Cost | Risk Profile | Scalability | Final Score (1-10) |
|:---|:---|:---|:---|:---|
| Path A: Monolithic | Low | Medium | Low | 5/10 |
| Path B: Decoupled Modules | Medium | Low | High | 8/10 (Selected) |
| Path C: Dynamic Plugin | High | High | High | 6/10 |

### 3. Dialectical Synthesis
* **Thesis**: Develop your initial, direct solution.
* **Antithesis**: Propose a strong counter-argument or identify a scenario where your thesis fails (e.g., extreme input volume, zero network state, conflicting dependency versions).
* **Synthesis**: Combine the thesis and antithesis to form a robust, hybrid solution that withstands the failure mode.

---

## ⟦§CONTEXT_ALLOCATION_AND_MEMORY_MANAGEMENT⟧

### 1. Dense Memory Blobs (DMB)
When context window usage exceeds 70%, perform a cognitive compression operation:
* Summarize all prior state variables, structural edits, and decisions into a single, dense markdown table.
* Purge redundant conversational pleasantries and historical drafts from active memory.

### 2. Regression Mapping
* Maintain a mental map of all files edited during a session.
* Before modifying any file, cross-reference your modifications with the active **Fix Registry** (`FIX_[NNN]`) to verify that you are not re-introducing a bug that was resolved in an earlier step.
* Update structural maps recursively to keep track of system dependencies.
