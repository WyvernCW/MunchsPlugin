# ⟦§POLYGLOT_SYSTEMS v2.0⟧
> Code patterns, memory safety rules, and performance guidelines for low-level systems, hardware, and scientific computing.

---

## 1. Low-Level Systems Programming (C, C++, Assembly)

### A. C Memory Safety & Pointer Bounds
* **Buffer Overflow Prevention**: Never use unbounded string/memory copying functions (`strcpy`, `sprintf`, `gets`). Always use bounded safe alternatives (`strncpy`, `snprintf`) and explicitly terminate buffers.
* **Heap Discipline**: Keep a clear owner for every allocated pointer. Set pointers to `NULL` immediately after calling `free()` to prevent double-free and use-after-free vulnerabilities.

```c
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#define MAX_BUFFER_SIZE 256

//  SAFE: Bounded copies and immediate NULL re-assignment
void process_input_string(const char *input) {
    char *buffer = (char *)malloc(MAX_BUFFER_SIZE);
    if (buffer == NULL) {
        return; // Allocation failure guard
    }

    // Copy at most size - 1 and force null terminator
    strncpy(buffer, input, MAX_BUFFER_SIZE - 1);
    buffer[MAX_BUFFER_SIZE - 1] = '\0';

    printf("Input string: %s\n", buffer);

    free(buffer);
    buffer = NULL; // Prevent use-after-free
}
```

### B. C++ Resource Acquisition Is Initialization (RAII)
* **Smart Pointers**: Avoid raw pointers and manual memory allocation (`new`/`delete`). Use `std::unique_ptr` for singular ownership and `std::shared_ptr`/`std::weak_ptr` for shared reference counting.
* **Move Semantics**: Implement move constructors and move assignment operators using `std::move` to transfer ownership of heavy heap resources without copying.

```cpp
#include <memory>
#include <vector>
#include <string>

class ResourceHolder {
private:
    std::unique_ptr<std::vector<std::string>> data_buffer;

public:
    ResourceHolder() : data_buffer(std::make_unique<std::vector<std::string>>()) {}

    // Move constructor: transfers ownership cleanly
    ResourceHolder(ResourceHolder&& other) noexcept 
        : data_buffer(std::move(other.data_buffer)) {}

    // Move assignment operator
    ResourceHolder& operator=(ResourceHolder&& other) noexcept {
        if (this != &other) {
            data_buffer = std::move(other.data_buffer);
        }
        return *this;
    }

    // Disable copy operations to enforce unique ownership
    ResourceHolder(const ResourceHolder&) = delete;
    ResourceHolder& operator=(const ResourceHolder&) = delete;
};
```

---

## 2. Compile-Time & Typed Systems (Zig, Nim, D)

### A. Zig (Manual Allocation & Comptime)
* **Explicit Allocators**: Zig has no hidden allocator. Always pass allocators explicitly to functions that require heap memory, and clean up allocations with `defer`.
* **Comptime Execution**: Utilize `comptime` blocks to run logic, validation, and generic types at compile time.

```zig
const std:: = @import("std");

//  SAFE: Explicit allocator passing and defer cleanup
pub fn loadPayload(allocator: std.mem.Allocator, size: usize) ![]u8 {
    const buffer = try allocator.alloc(u8, size);
    errdefer allocator.free(buffer); // Clean up on failure

    // Perform payload operations
    return buffer;
}
```

---

## 3. Scientific Computing (R, Julia, MATLAB)

* **Julia Type Stability**: Ensure all functions are type-stable. Avoid returning variables of different types depending on inputs, preventing dynamic dispatch performance loss.
* **Vectorization**: Always prefer vectorized matrix operations over raw `for` loops in R and MATLAB to leverage optimized BLAS/LAPACK binaries.

---

## 4. Hardware Description Languages (VHDL, Verilog, SystemVerilog)

* **Clock Domain Crossing (CDC)**: Enforce double-flop synchronization on all asynchronous signals migrating across distinct clock domains to prevent metastability.
* **Assignment Boundaries**: In Verilog, use Non-blocking assignments (`<=`) for sequential logic (triggered by `posedge clk`) and Blocking assignments (`=`) for combinational logic blocks.

```verilog
// Sequential logic clock block
always @(posedge clk or negedge rst_n) begin
    if (!rst_n) begin
        q_reg <= 1'b0; // Non-blocking assignment
    end else begin
        q_reg <= d_in;
    end
end
```
