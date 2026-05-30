# ⟦§POLYGLOT_IDIOMS v2.0⟧
> Clean coding paradigms, strict error handling, and type-safety rules for Tier 1 languages.

---

## 1. TypeScript & JavaScript (Advanced Paradigms)

### A. Type Assertions & Schema Validation
* **Avoid `any` and `as any`**: Overusing `any` turns off TypeScript's compiler safety checks, leading to runtime failures. Use `unknown` for unchecked external inputs (like API responses).
* **Guarding Types**: Enforce strict type predicates or parse runtime variables using validation schemas like **Zod**.

```typescript
import { z } from 'zod';

// Define strict validation schemas
export const UserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  role: z.enum(['admin', 'user', 'guest']),
  metadata: z.record(z.string()).optional()
});

export type User = z.infer<typeof UserSchema>;

// Verify and assert unknown payloads
export function validateAndLoadUser(payload: unknown): User {
  const result = UserSchema.safeParse(payload);
  if (!result.success) {
    throw new Error(`Invalid user payload: ${result.error.message}`);
  }
  return result.data; // Safely typed as User
}
```

### B. Error Handling & Exception Flow
* **Structured Exceptions**: Do not throw strings (e.g. `throw "Error"`). Always throw instantiated `Error` objects so stack traces are preserved.
* **Context Preservation**: Wrap catch blocks to log exactly where the failure occurred and preserve the original error message.

```typescript
export async function fetchConfigFile(path: string): Promise<string> {
  try {
    return await fs.promises.readFile(path, 'utf-8');
  } catch (error) {
    const originalError = error instanceof Error ? error : new Error(String(error));
    // Propagate context details
    const wrappedError = new Error(`Failed to load configuration from ${path}: ${originalError.message}`);
    wrappedError.stack = originalError.stack;
    throw wrappedError;
  }
}
```

---

## 2. Python (Type Hints & Resource Integrity)

### A. Strict Type Annotations
* Explicitly annotate all variables, class attributes, function parameters, and return types.
* Leverage typing utilities like `Optional`, `Union`, `Any`, `Callable`, and `Protocol` for structural typing.

```python
from typing import TypedDict, Optional, Union, Protocol

class LogConfig(TypedDict):
    level: str
    format: str

class Logger(Protocol):
    def info(self, msg: str) -> None: ...
    def error(self, msg: str) -> None: ...

def initialize_system(
    config: LogConfig, 
    custom_logger: Optional[Logger] = None
) -> Union[int, str]:
    if custom_logger is not None:
        custom_logger.info("Initializing systems...")
    return "SUCCESS"
```

### B. Context Managers & Resource Management
* Always use `with` statements when handling files, network sockets, DB connections, or thread locks.
* If implementing custom resources, implement the `__enter__` and `__exit__` methods (or `@contextmanager` decorators).

```python
from contextlib import contextmanager
import socket
from typing import Generator

@contextmanager
def open_socket(host: str, port: int) -> Generator[socket.socket, None, None]:
    s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    try:
        s.connect((host, port))
        yield s
    finally:
        s.close()

# Safe usage guarantees closure even if an exception occurs
with open_socket("127.0.0.1", 8080) as sock:
    sock.sendall(b"PING")
```

---

## 3. Go (Error Wrapping & Concurrency Safety)

### A. Explicit Error Checking & Wrapping
* Never ignore returned errors with `_`. Check them immediately.
* Use `%w` within `fmt.Errorf` to wrap errors, preserving original context for error un-wrapping.

```go
package main

import (
	"fmt"
	"os"
)

func ReadConfig(filePath string) ([]byte, error) {
	data, err := os.ReadFile(filePath)
	if err != nil {
		// Wrap error to add context while retaining structural error details
		return nil, fmt.Errorf("failed to open config file at %q: %w", filePath, err)
	}
	return data, nil
}
```

### B. Goroutine Lifetime & Timeout Orchestrations
* Always specify the termination conditions of goroutines to prevent memory and channel leaks.
* Manage timeouts using `context.Context` combined with select statements.

```go
package main

import (
	"context"
	"time"
)

func ProcessAsync(ctx context.Context, data chan string) {
	for {
		select {
		case <-ctx.Done():
			// Exit goroutine safely when context times out or is canceled
			return
		case msg := <-data:
			process(msg)
		}
	}
}
```

---

## 4. Rust (Memory Safety & Pattern Matching)

### A. Safe Match Chains
* Avoid raw indexing and nested `if let` blocks. Use compile-time matched `match` chains or helper combinators (`map`, `and_then`).

```rust
#[derive(Debug)]
pub enum ConfigError {
    FileNotFound,
    InvalidSyntax(String),
}

pub fn parse_config(content: Option<&str>) -> Result<u32, ConfigError> {
    match content {
        Some(text) if text.is_empty() => Err(ConfigError::InvalidSyntax("Empty string".into())),
        Some(text) => text.parse::<u32>().map_err(|e| ConfigError::InvalidSyntax(e.to_string())),
        None => Err(ConfigError::FileNotFound),
    }
}
```

### B. Ownership, References, and Safe Slicing
* Respect the borrow checker. Use slices (`&str`, `&[T]`) instead of consuming allocations (`String`, `Vec<T>`) when reading data.
* Enforce explicit lifetimes when referencing data across structural boundaries.
