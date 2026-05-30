# ⟦§POLYGLOT_DATA_FUNCTIONAL v2.1⟧
> Code paradigms, security gates, and parsing configurations for functional programming, databases, and markup/config files.

---

## 1. Pure Functional & Concurrent Programming (Haskell, Elixir, Erlang, Clojure)

### A. Elixir OTP Concurrency & Supervision
* **Let It Crash Philosophy**: Do not trap exits inside worker processes. Let processes crash and configure a robust supervision tree to restart them to a known healthy state.
* **Avoid Shared Mutable State**: Use Elixir Agent or GenServer states strictly. Never update state without passing it through immutable function pipelines.

### B. Haskell Lazy Evaluation Boundaries
* **Avoid Space Leaks**: Laziness can hold references to large data graphs in memory. Enforce strict evaluation using strict operator applications or compile-time strictness flags when accumulating values in loops.

---

## 2. Databases & Querying (SQL, GraphQL, Cypher, SPARQL)

### A. GraphQL N+1 Query Prevention
* **Batch Loading**: Never resolve nested lists of child properties using inline database calls inside your resolvers. Implement a Batch Loader to consolidate single queries.

### B. Cypher (Graph Databases) Injection Protection
* **Parameterize Graph Queries**: Never concatenate strings to build Cypher statements. Always use parameter maps to pass inputs safely.

---

## 3. Configuration & Infrastructure (Docker, Terraform, YAML, XML)

### A. Docker Root User Mitigation
* **Container Hardening**: Never let containers run as the root user. Always define a custom, unprivileged user and restrict file permissions.

### B. XML External Entity (XXE) Injection Prevention
* **Disable External DTDs**: When configuring parser engines (like SAX or DOM in Java), explicitly disable external entity parsing to prevent system file disclosure.
