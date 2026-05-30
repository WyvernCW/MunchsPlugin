# ⟦§POLYGLOT_SYSTEMS v2.1⟧
> Code patterns, memory safety rules, and performance guidelines for low-level systems, hardware, and scientific computing.

---

## 1. Low-Level Systems Programming (C, C++, Assembly)

### A. C Memory Safety & Pointer Bounds
* **Buffer Overflow Prevention**: Never use unbounded string/memory copying functions. Always use bounded safe alternatives and explicitly terminate buffers, ensuring memory size calculations include the null terminator.
* **Heap Discipline**: Maintain a single, clear owner for every allocated pointer. Force pointers to NULL immediately after freeing them to prevent double-free and use-after-free vulnerabilities.

### B. C++ Resource Acquisition Is Initialization (RAII)
* **Smart Pointers**: Avoid raw pointers and manual memory allocation. Use unique pointer wrappers for singular ownership and shared/weak pointer wrappers for shared reference counting.
* **Move Semantics**: Implement move constructors and move assignment operators to transfer ownership of heavy heap resources without copying, using reference swaps.

---

## 2. Compile-Time & Typed Systems (Zig, Nim, D)

### A. Zig (Manual Allocation & Comptime)
* **Explicit Allocators**: Zig has no hidden allocator. Pass allocators explicitly to functions that require heap memory, and clean up allocations with defer.
* **Comptime Execution**: Utilize comptime blocks to run logic, validation, and generic types at compile time.

---

## 3. Scientific Computing (R, Julia, MATLAB)

* **Julia Type Stability**: Ensure all functions are type-stable. Avoid returning variables of different types depending on inputs, preventing dynamic dispatch performance loss.
* **Vectorization**: Prefer vectorized matrix operations over raw for loops to leverage optimized BLAS/LAPACK binaries.

---

## 4. Hardware Description Languages (VHDL, Verilog, SystemVerilog)

* **Clock Domain Crossing (CDC)**: Enforce double-flop synchronization on all asynchronous signals migrating across distinct clock domains to prevent metastability.
* **Assignment Boundaries**: In Verilog, use Non-blocking assignments for sequential logic (triggered by clock edges) and Blocking assignments for combinational logic blocks.
