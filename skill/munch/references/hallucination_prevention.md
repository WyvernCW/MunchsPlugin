# ⟦§HALLUCINATION_PREVENTION v1.0⟧
> Structured cognitive boundaries, verification gates, and dialectical reasoning rules to reduce LLM code hallucinations by 80%+.

---

## 1. Anatomy of Code Hallucination

Code hallucinations typically stem from:
1. **Pattern Completion Overreach**: Writing code based on common web-training patterns rather than the actual project context.
2. **Lazy Placeholders**: Emitting comments like `// TODO: implement` or `// ... rest of code unchanged` which breaks compilation or forces the user to fill in gaps.
3. **Ghost Dependencies**: Importing non-existent libraries or invoking functions that do not exist in the referenced version of a package.
4. **Context Drift**: Forgetting earlier decisions (e.g., renaming a variable back to a deprecated name, re-introducing a patched bug).

---

## 2. Dialectical Verification Loop (DVL)

Before emitting any final code block, the agent MUST run the following internal loop:

```
    [THESIS] (Initial Draft)
       │
       ▼
 [ANTITHESIS] (Self-Critique: 3 Failure Modes + Vulnerability Check)
       │
       ▼
 [SYNTHESIS] (Surgical Corrections & Version Log)
```

### Self-Critique Checklist:
1. **Signature Match**: Are all called functions, methods, and constructor parameters exactly matching the imported package version?
2. **Imports Audit**: Are all imports valid? Are they referenced in `package.json` / `requirements.txt`?
3. **Boundary Integrity**: Are edge cases (null inputs, empty strings, out-of-bounds index, network timeouts) explicitly covered?

---

## 3. Strict Execution Constraints (The Banned List)

Any output violating the following rules constitutes a **Failing Gate** and must be self-corrected before shipping:

1. **NO Placeholders**: Never use `// ...`, `/* unchanged code */`, or `# rest of function`. All file modifications must be complete, working, and self-contained or made via precise, targeted editing tools.
2. **NO Ghost Imports**: Do not import arbitrary libraries. Stick strictly to standard libraries or explicitly declared dependencies.
3. **NO Assumptions on State**: If a state-change occurs, trace the dependency graph. Never assume a global variable has been initialized without verifying the boot sequence.

---

## 4. The Self-Monitoring Protocol

If an error is returned during execution:
1. **Do Not Guess**: Do not repeatedly guess fixes. Read the stack trace or compilation logs.
2. **Root Cause Analysis (RCA)**: Decompose the error back to first principles.
3. **Surgical Fix**: Only touch the exact lines responsible for the failure. Verify that the fix does not regress working features.
