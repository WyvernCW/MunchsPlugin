# ⟦§POLYGLOT_SYSTEMS v1.0⟧
> Safety gates, memory management patterns, and security constraints for systems, low-level, hardware, and scientific languages.

---

## 1. Low-Level & Systems (C, C++, Zig, D, Nim, Odin, V, Jai, Carbon)

* **C**:
  * *Rules*: Avoid deprecated buffer functions (`strcpy`, `gets`, `sprintf`). Always check pointer allocation returns.
  * *Security*: Check for integer overflows before malloc, prevent Use-After-Free (UAF), and validate buffer limits.
* **C++**:
  * *Rules*: Use modern C++20 smart pointers (`std::unique_ptr`, `std::shared_ptr`). Avoid raw arrays (`std::vector` or `std::array` only).
  * *Security*: Enforce RAII for resources. Prevent buffer overflow, format string vulnerability, and memory leaks.
* **Zig, D, Nim, Odin, V, Jai, Carbon**:
  * *Rules*: In Zig, always check error unions. In Nim, leverage the ARC/ORC garbage collector correctly. In D, maintain pure/nothrow safety annotations.
  * *Security*: Zig check allocator out-of-memory cases. In D/Nim, avoid unsafe pointer casts and truncation in conversion casting.

---

## 2. Assembly & Core Systems (Assembly, Ada, Fortran, Pascal)

* **Assembly (x86_64, ARM, RISC-V)**:
  * *Rules*: Maintain strict calling conventions (preserving callee-saved registers). Watch stack alignments (e.g., 16-byte alignment on x86).
  * *Security*: Watch stack Pivoting, shellcode injection vector vectors, and Return-Oriented-Programming (ROP) vulnerability.
* **Ada, Fortran, Pascal**:
  * *Rules*: In Ada, enforce strong typing compile-time restrictions. In Fortran, utilize array-parallel functions. In Pascal, avoid unsafe pointer manipulations.

---

## 3. Hardware & Embedded (VHDL, Verilog, SystemVerilog, Embedded C, Forth, nesC)

* **VHDL & Verilog / SystemVerilog**:
  * *Rules*: In VHDL, separate registers from combinational processes. In SystemVerilog, use non-blocking assignments (`<=`) for registers.
  * *Security*: Avoid latches, state machine locks, metastability, and signal glitches.
* **Embedded C, Forth, nesC**:
  * *Rules*: Avoid heap allocation in embedded loops. nesC watch component connection bindings. Forth watch parameter stack overflows.

---

## 4. Scientific Array Languages (APL, J, K, Q)

* **APL, J, K, Q**:
  * *Rules*: Vectorized operations only; avoid loops. Maintain high-density calculations. Inspect array dimensions before indexing.
  * *Security*: Check bounds on sparse array calculations to prevent memory leakage.
