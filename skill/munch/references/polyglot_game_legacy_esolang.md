# ⟦§POLYGLOT_GAME_LEGACY_ESOLANG v2.1⟧
> Architecture patterns, memory rules, and performance tricks for Game Engines, Enterprise Legacy systems, and esoteric languages.

---

## 1. Game Development Engines (C# Unity, C++ Unreal, GDScript, Lua)

### A. C# & Unity Garbage Collection Minimization
* **Object Pooling**: Avoid instantiating and destroying objects dynamically during runtime loops, which causes memory fragmentation and garbage collection spikes. Implement object pooling.
* **Cache Components**: Never call component queries inside updates. Cache component references inside startup methods.

### B. C++ Unreal Engine Garbage Collection
* **GC Property Decoration**: Always mark pointers referencing Unreal objects with property metadata macros. Failing to do so hides reference relationships, leading to dangling pointers and memory corruption.

---

## 2. Sandboxed Game Scripting (Lua)

* **Local Scopes**: Always declare variables using local scopes to prevent namespace pollution and optimize variable access in the Lua register stack.
* **Safe Sandboxing**: When loading user-supplied scripts, override unsafe functions with a restricted, monitored environment.

---

## 3. Legacy Enterprise Software (COBOL, Fortran, Ada)

* **COBOL Data Declarations**: Set strict alignments and sizes using picture clauses. Minimize floating point operations by using packed decimal structures for precision arithmetic.
* **Ada Strong Typing & Tasks**: Utilize Ada's strong typing engine to prevent range errors. When designing concurrency, use task entry points and rendezvous models rather than manual thread locks.
