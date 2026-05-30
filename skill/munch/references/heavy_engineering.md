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

### 1. Android/Linux Kernel Compilations
Configure and build kernel modules cleanly using the following environment declarations:

```bash
# Set build architecture and target cross-compiler prefixes
export ARCH=arm64
export SUBARCH=arm64
export CROSS_COMPILE=aarch64-linux-android-
export CLANG_TRIPLE=aarch64-linux-gnu-

# Define toolchain installation path (e.g., prebuilts/clang/host/linux-x86)
export PATH="/path/to/clang/bin:$PATH"

# 1. Clean the tree and load the default configuration (defconfig)
make clean && make mrproper
make vendor/codename_defconfig

# 2. Compile kernel, modules, and Device Tree Blobs (DTB) using multi-threading
make -j$(nproc) CC=clang CLANG_TRIPLE=$CLANG_TRIPLE
```

* **Symbol Checking**: Check `Module.symvers` to verify symbol compatibility across compile modules.
* **DTB Compilation**: Compile device tree sources using `dtc` and verify device tree blobs before packing them into target boot images:
  ```bash
  dtc -I dts -O dtb -o arch/arm64/boot/dts/vendor/codename.dtb arch/arm64/boot/dts/vendor/codename.dts
  ```

### 2. Android Custom ROMs (AOSP / LineageOS)
Managing Android source trees requires exact build environment variables and repo configurations.

```bash
# 1. Initialize repository with clean thread depth
repo init -u https://github.com/LineageOS/android.git -b lineage-21.0 --git-lfs --depth=1

# 2. Sync sources restricting network overload
repo sync -c -j$(nproc --all) --force-sync --no-clone-bundle --no-tags

# 3. Setup caching to speed up successive builds
export USE_CCACHE=1
export CCACHE_EXEC=/usr/bin/ccache
ccache -M 50G

# 4. Initialize Android build environment
source build/envsetup.sh
lunch lineage_codename-userdebug

# 5. Extract proprietary binaries directly from a connected device
cd device/vendor/codename
./extract-files.sh

# 6. Execute full compilation
mka bacon -j$(nproc)
```

---

## ⟦§RESILIENCE_GATE⟧
If a build or compilation fails:
1. **Never Guess**: Do not modify random flags to "try and fix it". Read the compilation log from the last error line upward to identify the root cause (e.g. missing include, symbol collision, compiler mismatch).
2. **Isolate Build Errors**: Run the exact failing compilation command in isolation with verbose flags (e.g., `make V=1` or `ninja -v`) to extract precise error reports.
3. **Environment Audit**: Audit compiler versions, headers, and library search paths (`LD_LIBRARY_PATH`, `LIBRARY_PATH`) before attempting rebuilding.
