# ⟦§POLYGLOT_MAINSTREAM v1.0⟧
> Security rules, idiomatic design, and code patterns for mainstream, backend, and mobile languages.

---

## 1. Python, JS, TS, & Web Scripting

* **Python**:
  * *Idiom*: Use generator expressions for large data streams; enforce type-annotations.
  * *Security*: Prevent injection in `eval()`/`exec()`. Never use `subprocess(shell=True)`. Avoid unsafe YAML parsing (`yaml.safe_load` only).
* **JavaScript / TypeScript**:
  * *Idiom*: Use ES2022 features (optional chaining, logical assignment). Prefer immutability (`readonly`, `ReadonlyArray`).
  * *Security*: Prevent Prototype Pollution (`JSON.parse` audits). Avoid `dangerouslySetInnerHTML` (XSS). Avoid weak random algorithms for crypto keys (`crypto.getRandomValues`).
* **CoffeeScript, Elm, PureScript, ReasonML, ReScript, ClojureScript**:
  * *Rules*: In Elm/PureScript, maintain strict functional purity; avoid side effects in state handlers. In ReScript, compile clean JS without runtime wrappers.

---

## 2. Go & Rust (Systems Backend)

* **Go**:
  * *Idiom*: Handle errors explicitly. Use defer for resource cleanup. Keep channels simple to avoid lockups.
  * *Security*: Avoid SQL concat; use parameterized queries. Prevent goroutine leaks by controlling routine exits via context.
* **Rust**:
  * *Idiom*: Prefer pattern matching over nested `if let`. Utilize standard traits (`From`, `Into`, `Default`).
  * *Security*: Minimize `unsafe` blocks. Check integer casting truncation (`as` casts). Prevent panics in production by mapping `Result` types properly.

---

## 3. JVM Languages (Java, Kotlin, Scala)

* **Java**:
  * *Idiom*: Utilize modern features (records, text blocks, pattern matching switch). Use stream APIs for pipelines.
  * *Security*: Prevent unsafe deserialization (`ObjectInputStream`). Avoid JNDI lookup injection (Log4Shell vulnerability).
* **Kotlin & Scala**:
  * *Idiom*: In Kotlin, use null-safety types and coroutines. In Scala, prefer functional constructs (immutability, pattern matching).
  * *Security*: Ensure Kotlin JVM interoperability is null-safe. In Scala, avoid reflection injection and XML external entities.

---

## 4. Mobile, PHP & Ruby (Swift, Objective-C, PHP, Ruby, Dart)

* **Swift & Objective-C**:
  * *Rules*: Use Swift structured concurrency. In Objective-C, enforce ARC and watch for reference cycles.
  * *Security*: Ensure keychain storage uses secure access flags. Validate deep links to prevent URL-scheme hijack.
* **PHP & Ruby**:
  * *Rules*: PHP 8+ typed properties/attributes. Ruby active record paradigms.
  * *Security*: In PHP, avoid `unserialize()`, `eval()`, or raw inputs in `header()`. In Ruby, block template injection (SSTI) and parameter mass assignment.
* **Dart / Flutter**:
  * *Rules*: Sound null safety; structure reactive widgets using BLoC or Provider layouts.
