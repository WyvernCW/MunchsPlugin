# ⟦§POLYGLOT_IDIOMS v1.0⟧
> Clean coding paradigms, strict error handling, and type-safety rules for Tier 1 languages.

---

## 1. TypeScript & JavaScript

* **Type Assertions**: Minimize `any` and `as any`. Use `unknown` and guard types with type predicates or type assertion schemas (like `zod`).
* **Optional Chaining**: Do not overuse `?.` to mask null pointer errors; if a variable *must* be present, check for it explicitly and throw a detailed error.
* **Error Handling**: Always reject promises with `Error` instances, never strings. Use `try/catch` with structured logs detailing (what, where, why).

```typescript
// Good Idiomatic Error Handling
try {
  await executeTask();
} catch (error) {
  const err = error instanceof Error ? error : new Error(String(error));
  logger.error("Failed to execute task", { error: err.message, stack: err.stack });
  throw err;
}
```

---

## 2. Python

* **Type Hints**: Explicitly type all function signatures, including parameters and return types. Use `typing.Optional`, `typing.Union`, or `|` syntax.
* **Context Managers**: Always use `with` statements for resource management (files, network sockets, DB connections) to prevent resource leaks.
* **Clean Code**: Follow PEP-8 strictly. Document public classes and functions using docstrings explaining arguments and exceptions.

```python
# Good Idiomatic Python
from typing import List

def calculate_averages(values: List[float]) -> float:
    """Calculates average from a list of floats.
    Raises:
        ValueError: If list is empty.
    """
    if not values:
        raise ValueError("Cannot calculate average of empty list")
    return sum(values) / len(values)
```

---

## 3. Go

* **Error Handling**: Check errors immediately. Never ignore errors (`_`). Return detailed context wrapping errors using `fmt.Errorf("context: %w", err)`.
* **Concurrency**: Always specify goroutine lifetime. Clean up channels and use `sync.WaitGroup` or `context.Context` to manage routine exits.
* **Idiomatic Types**: Use interfaces to define behaviors, not structs, keeping interfaces small and focused (e.g., standard `io.Reader`, `io.Writer`).

```go
// Good Idiomatic Go
func ProcessData(path string) ([]byte, error) {
    data, err := os.ReadFile(path)
    if err != nil {
        return nil, fmt.Errorf("failed to read data file from path %s: %w", path, err)
    }
    return data, nil
}
```
