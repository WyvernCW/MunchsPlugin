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
  * Write progress files in the workspace (e.g. `scratch/build_status.json` or `.munch_checkpoint`) to track current step, environment variables, compiled modules, and next operations.
  * Before every exchange, verify your active configuration path and toolchain state.

### 3. Incremental Compilation & Verification
* **Divide and Conquer**: Compile modules individually before starting a full system build. 
* **Early Fail Detection**: Run pre-compilation linting, header-file presence checks, and environment diagnostics to prevent 2-hour builds failing on trivial issues.

---

## ⟦§COMPLEX_SYSTEMS_GUIDELINES⟧

### 1. Kernel Development (Linux / Android)
* **Toolchain Rigor**: Always inspect target cross-compilers (`clang`, `gcc-arm-linux-gnueabi`, `aarch64-linux-android-`). Verify path configurations and target architectures (`ARCH=arm64`).
* **Kernel Configs**: Read and analyze `.config` and `arch/arm64/configs/` directories. Never modify `.config` manually; use dynamic script modifications (`scripts/config`) or make defconfig targets.
* **Header Integrity**: Ensure correct Kernel Headers (`make headers_install`) are exported before compiling user-space modules or external drivers.

### 2. Android Custom ROMs (AOSP / LineageOS)
* **Manifest Control**: Inspect `.repo/manifests/` and local manifests (`.repo/local_manifests/`) to resolve dependency conflicts before running `repo sync`.
* **Device Trees**: Ensure the device tree (`device/vendor/codename`), kernel source (`kernel/vendor/codename`), and vendor blobs (`vendor/vendor/codename`) are structurally matched.
* **Build Systems**: Configure build flags in `BoardConfig.mk` and device makefiles. Run build commands cleanly using standard wrappers (`source build/envsetup.sh && lunch <target> && mka bacon`).

### 3. Bootstrap & Compilers
* **Multi-stage Builds**: When building toolchains or compilers, use strict 3-stage bootstrapping to guarantee code generation validity.
* **Memory Management**: When writing low-level systems, respect page sizes, physical/virtual address boundaries, and memory alignment constraints.

---

## ⟦§RESILIENCE_GATE⟧
If a build or compilation fails:
1. **Never Guess**: Do not modify random flags to "try and fix it". Read the compilation log from the last error line upward to identify the root cause (e.g. missing include, symbol collision, compiler mismatch).
2. **Isolate Build Errors**: Run the exact failing compilation command in isolation with verbose flags (e.g., `make V=1` or `ninja -v`) to extract precise error reports.
3. **Environment Audit**: Audit compiler versions, headers, and library search paths (`LD_LIBRARY_PATH`, `LIBRARY_PATH`) before attempting rebuilding.
