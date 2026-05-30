# ⟦§POLYGLOT_DATA_FUNCTIONAL v1.0 ⟧
> Security rules, logic verification patterns, and syntax constraints for data, stats, databases, functional programming, and configuration languages.

---

## 1. Database & Query (SQL, PL/SQL, T-SQL, Cypher, GraphQL, SPARQL, Datalog, XQuery, MDX, DAX)

* **SQL (PostgreSQL, MySQL, SQLite, T-SQL, PL/SQL)**:
  * *Rules*: Parameterize queries. Use CTEs for complex queries. Avoid using raw table locks.
  * *Security*: Prevent SQL injection. Validate and limit schema exposures (`information_schema`). Check transaction isolation levels.
* **Cypher, GraphQL, SPARQL, Datalog**:
  * *Rules*: GraphQL enforce depth limits, batching (avoid N+1), and strict query limits. Cypher prevent injection via APOC procedures.
* **XQuery, MDX, DAX**:
  * *Rules*: Keep queries optimized; avoid redundant calculations in subqueries.

---

## 2. Functional Programming (Haskell, Erlang, Elixir, Clojure, Lisp, Scheme, F#, OCaml, SML, Racket, Agda, Idris, Coq, Lean)

* **Haskell**:
  * *Rules*: Avoid `unsafePerformIO` in production. Check for stack overflows in lazy evaluation.
* **Erlang & Elixir**:
  * *Rules*: Use supervision trees. Validate atom allocations (limit dynamic atom creation to prevent crash loops).
* **Clojure, Lisp, Scheme, Racket**:
  * *Rules*: Minimize macros; focus on pure recursion. Avoid unsafe object deserialization.
* **Agda, Idris, Coq/Rocq, Lean (Theorem Provers)**:
  * *Rules*: Maintain strict proof structures. Enforce termination checks.

---

## 3. Data Science & Math (R, Julia, MATLAB, SAS, Stata, Wolfram, Octave, Scilab)

* **R, Julia, MATLAB**:
  * *Rules*: Vectorize arrays; avoid forloops. Julia enforce type-stability.
  * *Security*: Avoid arbitrary code execution in R (`unserializeObject`). Prevent script/command injection in MATLAB `eval()`.

---

## 4. Markup, Style, & Config (HTML, CSS, XML, JSON, YAML, TOML, Markdown, LaTeX, SVG, HCL, Docker, Make)

* **HTML, CSS, SVG**:
  * *Rules*: CSS variables for theme layouts. WCAG contrast guidelines. HTML semantic tags.
  * *Security*: Sanitize SVG script injections. Avoid inline styles that invite CSS injection vector.
* **JSON, YAML, TOML, XML**:
  * *Security*: Disable XML External Entities (XXE). Prevent safe loading bypasses in YAML.
* **HCL, Dockerfile, Makefile**:
  * *Security*: Docker use non-root users. Verify checksums of downloaded binaries in Makefiles.
