# ⟦§POLYGLOT_GAME_LEGACY_ESOLANG v1.0 ⟧
> Rules, logic verification patterns, and security constraints for game development, legacy enterprise systems, academic languages, blockchain, and esoteric systems.

---

## 1. Blockchain & Smart Contracts (Solidity, Vyper, Move, Clarity, Michelson, Scilla, Cairo, Plutus, Pact)

* **Solidity & Vyper**:
  * *Rules*: Follow checks-effects-interactions pattern. Watch reentrancy.
  * *Security*: Prevent overflow/underflow (pre-0.8.0), reentrancy attacks, flash loan oracle manipulations, and integer truncation.
* **Move, Cairo, Clarity**:
  * *Rules*: Move resources must be consumed or stored. Cairo verify bounds check variables. Clarity watch transaction gas limitations.

---

## 2. Game Dev & Scripting (GDScript, UnrealScript, Verse, Squirrel, Papyrus, GameMaker Language, Lua)

* **GDScript & UnrealScript & Verse**:
  * *Rules*: Optimize garbage collection calls. Avoid heavy loops in ticks or updates.
  * *Security*: Prevent path traversal in file resource loading.
* **Lua & Squirrel & Papyrus**:
  * *Rules*: Keep global state clean; use local variables inside functions.
  * *Security*: Sandbox lua environments (block `dofile`, `loadstring`, `io` access unless explicitly white-listed).

---

## 3. Legacy Enterprise (COBOL, ABAP, PL/I, RPG, JCL, Smalltalk, Delphi, FoxPro, PowerBuilder, ColdFusion)

* **COBOL, ABAP, RPG, JCL**:
  * *Rules*: COBOL watch numeric data alignment size limits. JCL handle execution parameters safely.
  * *Security*: Prevent parameter overflow in CALL interfaces.
* **Delphi, FoxPro, PowerBuilder, ColdFusion**:
  * *Security*: ColdFusion block SQL concat in `cfquery` tags and unsafe object deserialization.

---

## 4. Historical, Academic, & Esoteric (Brainfuck, Befunge, Malbolge, Whitespace, LOLCODE, Piet, Shakespeare, Chef, ArnoldC)

* **Pascal, Modula-2, Simula, Prolog, Logo, Forth, Tcl, Eiffel, Lisp**:
  * *Rules*: Forth verify stack balance. Prolog maintain recursive base cases. Pascal check heap boundaries.
* **Brainfuck, Befunge, Malbolge, Whitespace, LOLCODE, Piet, Shakespeare, Chef, ArnoldC**:
  * *Rules*: Esolangs require strict syntax constraints. In Brainfuck, enforce pointer boundary limits. In Befunge, check coordinate program pointer routing bounds.
