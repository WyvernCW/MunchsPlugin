# ⟦§POLYGLOT_DATA_FUNCTIONAL v2.0⟧
> Code paradigms, security gates, and parsing configurations for functional programming, databases, and markup/config files.

---

## 1. Pure Functional & Concurrent Programming (Haskell, Elixir, Erlang, Clojure)

### A. Elixir OTP Concurrency & Supervision
* **Let It Crash Philosophy**: Do not trap exits inside worker processes. Let processes crash and configure a robust supervision tree to restart them to a known healthy state.
* **Avoid Shared Mutable State**: Use Elixir Agent or GenServer states strictly. Never update state without passing it through immutable function pipelines.

```elixir
defmodule KeyValueStore do
  use GenServer

  # Client API
  def start_link(default) do
    GenServer.start_link(__MODULE__, default, name: __MODULE__)
  end

  def get(key) do
    GenServer.call(__MODULE__, {:get, key})
  end

  def put(key, value) do
    GenServer.cast(__MODULE__, {:put, key, value})
  end

  # Server Callbacks
  @impl true
  def init(state) do
    {:ok, state}
  end

  @impl true
  def handle_call({:get, key}, _from, state) do
    {:reply, Map.get(state, key), state}
  end

  @impl true
  def handle_cast({:put, key, value}, state) do
    {:noreply, Map.put(state, key, value)}
  end
end
```

### B. Haskell Lazy Evaluation Boundaries
* **Avoid Space Leaks**: Laziness can hold references to large data graphs in memory. Enforce strict evaluation using `$!` or the `BangPatterns` compiler extension when accumulating values in loops.

---

## 2. Databases & Querying (SQL, GraphQL, Cypher, SPARQL)

### A. GraphQL N+1 Query Prevention
* **Batch Loading**: Never resolve nested lists of child properties using inline database calls inside your resolvers. Implement a Batch Loader (like `DataLoader`) to consolidate single queries.

```javascript
//  SAFE: Using DataLoader to batch database calls
const userLoader = new DataLoader(async (keys) => {
  const users = await db.users.findMany({ id: { in: keys } });
  return keys.map(key => users.find(user => user.id === key));
});

const resolvers = {
  Post: {
    author: (post) => userLoader.load(post.authorId) // Single batched SQL query
  }
};
```

### B. Cypher (Graph Databases) Injection Protection
* **Parameterize Graph Queries**: Never concatenate strings to build Cypher statements. Always use parameter maps to pass inputs safely.

---

## 3. Configuration & Infrastructure (Docker, Terraform, YAML, XML)

### A. Docker Root User Mitigation
* **Container Hardening**: Never let containers run as the root user. Always define a custom, unprivileged user and restrict file permissions.

```dockerfile
#  SAFE Dockerfile configuration
FROM node:20-alpine

# Setup workspace and copy dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

COPY . .

# Create unprivileged application user
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
RUN chown -R appuser:appgroup /app
USER appuser

EXPOSE 3000
CMD ["node", "index.js"]
```

### B. XML External Entity (XXE) Injection Prevention
* **Disable External DTDs**: When configuring parser engines (like SAX or DOM in Java), explicitly disable external entity parsing to prevent system file disclosure.
