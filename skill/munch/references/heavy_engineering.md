# Heavy & Complex Systems Engineering Supporting Skill
License: Complete terms in LICENSE.txt

This skill guides the AI agent through executing massive, highly complex, and long-horizon software engineering tasks—such as building Linux/Android kernels, compiling custom Android ROMs, bootstrapping operating systems, writing compilers, and architecting enterprise full-stack platforms.

---

## ⟦§CAPABILITY_MAXIMA⟧
1. **Zero Horizon Limits**: You are capable of accomplishing *anything* in software engineering. There are no limitations on structural complexity, compilation sizes, or execution length.
2. **Excellence First**: It is not about the speed of generation or writing a minimum viable product. It is about showing absolute engineering mastery, writing production-grade code, and delivering world-class software architectures.
3. **Infinite Code Capacity**: Do not truncate outputs, write placeholders, or skip files because of size. Emit full, complete implementations.
4. **Fearless Execution**: Treat complex, low-level compilation pipelines, toolchains, assembly code, and driver kernel code as standard engineering tasks. Approach them with confidence and rigorous planning.

---

## ⟦§LONG_HORIZON_EXECUTION_FLOW⟧
When executing tasks that require hours of work, massive compilations, or multi-stage steps, use the following operational flow:

### 1. Architectural Deconstruction
* **First-Principles Decomposition**: Break the massive target system (e.g., a custom Android ROM build) down to its irreducible core components:
  ```mermaid
  graph TD
    System["Target System (e.g. Android ROM)"] --> Toolchain["1. Toolchain & Environment"]
    System --> Dependencies["2. Source Tree & Dependencies"]
    System --> Configuration["3. Core Configuration (Defconfigs/Manifests)"]
    System --> Compilation["4. Target Compilation (Modules/Subsystems)"]
    System --> Linking["5. Packaging & Image Linking"]
    System --> Verification["6. Binary Validation & Testing"]
  ```
* **Define Checkpoints**: Create a strict linear checklist of deliverables and checkpoint states.

### 2. State & Context Anchoring
* Because long tasks span multiple turns and risk context drift:
  * Write progress files in the workspace to track current step, environment variables, compiled modules, and next operations.
  * Before every exchange, verify your active configuration path and toolchain state.

### 3. Incremental Compilation & Verification
* **Divide and Conquer**: Compile modules individually before starting a full system build. 
* **Early Fail Detection**: Run pre-compilation linting, header-file presence checks, and environment diagnostics to prevent 2-hour builds failing on trivial issues.

---

## ⟦§COMPLEX_SYSTEMS_GUIDELINES⟧

### 1. Android/Linux Kernel Compilations
* **Cross-Compiler Environments**: Enforce variables for target architectures and cross-compiler paths. Point build tools to targeted folders recursively.
* **Defconfig Setup**: Clean the tree completely, then initialize configurations using targeted target defconfigs. Never mutate configs dynamically without tracking them in patch lists.
* **Device Tree Blobs**: Compile Device Tree Sources into Device Tree Blobs utilizing device tree compilers. Validate inputs and compile structures before linking boot images.
* **Symbol Compatibility**: Verify symbol references inside compilation outputs to guarantee cross-module compatibility.

### 2. Android Custom ROMs (AOSP / LineageOS)
* **Manifest Control**: Initialize source repositories using specific branch descriptors. Sync directories by using local manifests to resolve repository overlaps.
* **Build Caching**: Enforce compile cache memory sizes to expedite successive rebuilds.
* **Binary Extraction**: Extract proprietary vendor binaries directly from active target devices using extraction scripts, mapping them safely inside the vendor tree.
* **Compilation Setup**: Initialize build environments, load target parameters (like userdebug configurations), and launch multi-threaded builders.

---

## ⟦§RESILIENCE_GATE⟧
If a build or compilation fails:
1. **Never Guess**: Do not modify random flags to "try and fix it". Read the compilation log from the last error line upward to identify the root cause (e.g. missing include, symbol collision, compiler mismatch).
2. **Isolate Build Errors**: Run the exact failing compilation command in isolation with verbose flags to extract precise error reports.
3. **Environment Audit**: Audit compiler versions, headers, and library search paths before attempting rebuilding.
