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
  1. *Toolchain & Environment Setup*: Verify the existence and versions of compilers, build utilities, and host library dependencies.
  2. *Source Tree & Dependencies Syncing*: Download, verify, and link the complete source code repositories including sub-modules.
  3. *Core Configuration Init*: Setup hardware parameters, defconfigs, product configurations, and custom board layout definitions.
  4. *Target Subsystems Compilation*: Build intermediate binaries, compiled kernel modules, device libraries, and core configurations.
  5. *Image Linking & Packing*: Assemble compiled components into target binary images (like boot.img or system.img).
  6. *Binary Validation & Testing*: Run checks, verify signatures, boot logs, and test functionality.
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
* **Target Architecture Configuration**: Set variables defining the target processor type and build systems (e.g. setting architecture definitions to arm64 and sub-architectures to arm64).
* **Cross-Compiler Declarations**: Verify the path parameters for your target cross-compiler tools (like clang, aarch64-linux-android-, and aarch64-linux-gnu- clang triples). Add toolchain binaries directly to the environment path variable.
* **Config Initialization**: Run cleanup targets (mrproper, clean) to clear build flags, then load the default target vendor configuration definition (defconfig).
* **Multi-threaded Compilation**: Launch compilers (like clang) using multi-threaded execution flags (linking threads dynamically to the host machine's total CPU cores).
* **DTB Compilation**: Compile device tree source files (DTS) into binary device tree blobs (DTB) using device tree compilers. Audit and check compiled DTBs before linking boot image assets.
* **Symbol Checking**: Inspect the compiled module symbols definitions files (like Module.symvers) to check cross-compilation interface signatures.

### 2. Android Custom ROMs (AOSP / LineageOS)
* **Manifest Configurations**: Initialize the repository tree using the target branch manifest (such as lineage-21.0). Configure manifest sync targets, enabling Git Large File Storage (LFS) and limiting clone depth.
* **Network Restraints Sync**: Perform a sync operation on all projects in the tree. Limit concurrent network connections and bypass unneeded clone packages or tags to ensure network and memory stability.
* **Build Caching**: Enable compilation caches and define cache size allocations (e.g. 50 Gigabytes) in user-level files to accelerate successive rebuild configurations.
* **Proprietary Vendor Blobs**: Extract device-specific vendor libraries directly from connected devices or extraction zip packages. Place these assets cleanly in the device vendor trees before running build lunch configurations.
* **Compilation Orchestration**: Initialize the build shell parameters (using build envsetup scripts), run lunch configurations specifying target product userdebug types, and launch the multi-threaded system builder (like mka bacon).

---

## ⟦§RESILIENCE_GATE⟧
If a build or compilation fails:
1. **Never Guess**: Do not modify random flags to "try and fix it". Read the compilation log from the last error line upward to identify the root cause (e.g. missing include, symbol collision, compiler mismatch).
2. **Isolate Build Errors**: Run the exact failing compilation command in isolation with verbose flags to extract precise error reports.
3. **Environment Audit**: Audit compiler versions, headers, and library search paths before attempting rebuilding.
4. **State Restorations**: If compilation configuration parameters are broken beyond diagnostic limits, restore the working tree to the last valid Git commit checkpoint and re-init parameters systematically.
