# ⟦§POLYGLOT_MAINSTREAM v2.1⟧
> Security rules, idiomatic design, and code patterns for mainstream, backend, and mobile languages.

---

## 1. Web Frontend & Scripting (Python, JavaScript, TypeScript)

### A. Python
* **Secure Subprocesses**: Avoid calling command execution shells. Never configure commands with variable strings or shell execution flags enabled. Always pass arguments as clean, separate parameter arrays to block command injections.
* **Safe Serialization**: Restrict arbitrary data deserialization. Standard loaders (like pickle or yaml default configs) run arbitrary code upon extraction. Always load variables using safe configurations.

### B. JavaScript / TypeScript
* **Prototype Pollution Protection**: When merging deep objects, audit and block property configurations targeting prototype attributes (`__proto__`, `constructor`, and `prototype`) to prevent runtime script injections.
* **XSS Defense**: Restrict raw, unescaped HTML assignments in browser documents. Sanitize all dynamic string content before inserting it into dynamic templates, preventing cross-site scripting (XSS).

---

## 2. Systems Backend (Go & Rust)

### A. Go
* **Goroutine Leak Protection**: Always bind goroutine lifecycles using cancelable context channels to prevent them from remaining active in the background.
* **SQL Injection Avoidance**: Never construct query statements via string formatting or concatenation. Pass parameters separately using database-driver parameter bindings.

### B. Rust
* **Minimize Unsafe**: Restrict unsafe memory blocks to performance-critical modules, document safety invariants, and verify safety boundaries before execution.
* **Integer Casting Safety**: Avoid lossy data conversion casts that truncate integer values (e.g. converting 64-bit indexes directly into 8-bit variables). Check index bounds explicitly using safe conversion operations.

---

## 3. Enterprise JVM Environments (Java, Kotlin, Scala)

### A. Java & Kotlin
* **Safe Deserialization**: Restrict reading serialized byte arrays from untrusted connections. Use input object filters to restrict JVM class loader execution.
* **Kotlin Null Safety Interoperability**: When calling Java libraries in Kotlin, treat returned signatures as nullable unless explicitly marked with non-null annotations.

---

## 4. Mobile & Web Backend (Swift, Objective-C, PHP, Ruby, Dart)

### A. Swift (Structured Concurrency)
* Enforce compiler task boundaries using asynchronous await operations. Avoid legacy completion handlers that hide thread exceptions or lead to memory retain cycles.

### B. PHP & Ruby
* **PHP**: Sanitize user outputs before rendering them to standard templates to prevent injections.
* **Ruby**: Restrict mass parameter assignments in web forms. Explicitly permit and list fields using controller-level parameter filtering.
