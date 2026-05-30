# ⟦§POLYGLOT_MAINSTREAM v2.0⟧
> Security rules, idiomatic design, and code patterns for mainstream, backend, and mobile languages.

---

## 1. Web Frontend & Scripting (Python, JavaScript, TypeScript)

### A. Python
* **Secure Subprocesses**: Never use `shell=True` in `subprocess.run` or `os.system` as this exposes the machine to Command Injection. Always pass arguments as a structured array.
* **Safe Serialization**: Never load untrusted objects using `pickle.loads` or `yaml.load` (always use `yaml.safe_load`).

```python
import subprocess
import yaml

#  SAFE: Structured array execution without shell evaluation
def run_git_status(repo_path: str) -> str:
    result = subprocess.run(
        ["git", "-C", repo_path, "status"],
        capture_output=True,
        text=True,
        check=True
    )
    return result.stdout

#  SAFE: Loading yaml payloads using safe parser
def load_app_settings(config_yaml: str) -> dict:
    return yaml.safe_load(config_yaml)
```

### B. JavaScript / TypeScript
* **Prototype Pollution Protection**: Avoid blind merges of user-supplied JSON payloads into runtime object prototypes. Sanitize property keys (check for `__proto__`, `constructor`, and `prototype`).
* **XSS Defense**: Sanitize inputs before rendering raw HTML. Never use `dangerouslySetInnerHTML` in React or `.innerHTML` in Vanilla JS without HTML sanitization libraries (like DOMPurify).

```typescript
//  SAFE: Object assign configuration guarding against pollution
export function safeExtend(target: any, source: any): any {
  for (const key in source) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      continue; // Block injection
    }
    if (typeof target[key] === 'object' && typeof source[key] === 'object') {
      safeExtend(target[key], source[key]);
    } else {
      target[key] = source[key];
    }
  }
  return target;
}
```

---

## 2. Low-Level Systems Backend (Go & Rust)

### A. Go
* **Goroutine Leak Protection**: Ensure all launched goroutines are bounded by a cancelable `context.Context` or clear channel exit events.
* **SQL Injection Avoidance**: Never construct SQL query strings via concatenation. Always pass parameters separately to the driver.

```go
//  SAFE: Using parameterized queries to protect against SQLi
func GetUserByID(db *sql.DB, userID string) (*User, error) {
	var user User
	query := "SELECT id, email, role FROM users WHERE id = $1"
	err := db.QueryRow(query, userID).Scan(&user.ID, &user.Email, &user.Role)
	if err != nil {
		return nil, fmt.Errorf("failed to query user: %w", err)
	}
	return &user, nil
}
```

### B. Rust
* **Minimize Unsafe**: Restrict the usage of `unsafe` blocks to high-performance low-level operations. If `unsafe` is used, write extensive assertions explaining the invariant boundary.
* **Integer Casting Safety**: Be careful of lossy conversions using the `as` keyword (e.g. `u64 as u8` will truncate). Use `TryFrom` or `try_into()` to check overflow.

```rust
//  SAFE: Checked cast to prevent integer truncation
pub fn convert_index(val: usize) -> Result<u8, &'static str> {
    u8::try_from(val).map_err(|_| "Index value exceeds 8-bit storage")
}
```

---

## 3. Enterprise JVM Environments (Java, Kotlin, Scala)

### A. Java & Kotlin
* **Safe Deserialization**: Do not parse untrusted byte streams using standard `ObjectInputStream`. Integrate validation filters (`ObjectInputFilter`) to restrict class instantiation.
* **Kotlin Null Safety Interoperability**: When interfacing Kotlin with Java libraries, always mark parameters as nullable (`Type?`) unless the Java API guarantees non-null signatures using `@NonNull`.

```kotlin
//  SAFE: Handling nullable Java outputs in Kotlin
fun processJavaResult(payload: JavaClass?) {
    // Force compile-time null assertion or safe call logic
    val safePayload = payload ?: throw IllegalArgumentException("Payload cannot be null")
    println(safePayload.data)
}
```

---

## 4. Mobile & Web Backend (Swift, Objective-C, PHP, Ruby, Dart)

### A. Swift (Structured Concurrency)
* Enforce compiler task boundaries using `async/await`. Avoid older completion handlers that hide uncaught thread exceptions or cause reference retain loops.

### B. PHP & Ruby
* **PHP**: Secure variable scopes. Never output user data directly using `echo` or `print` without context-specific sanitization (`htmlspecialchars()`).
* **Ruby**: Prevent mass assignment vulnerability in Rails. Always filter incoming request payloads using Strong Parameters.

```ruby
#  SAFE: Ruby on Rails strong parameters configuration
def user_params
  params.require(:user).permit(:username, :email, :password)
end
```
