# ⟦§CONTEXT_DISAMBIGUATION v1.0⟧

id: context_disambiguation
state: active | reasoning | self_correcting
scope: prompt_parsing + implicit_context + technology_selection + chain_of_thought
boot: auto_load | load_skill_integration

---

## ⟦§AGENT_USAGE_GUIDELINES⟧

### How the AI Agent Uses This Reference
The AI agent must load this document at the very beginning of the session during the initialization phase. The agent parses the rules defined here to structure its internal reasoning process. Before committing to any coding task, command execution, or architectural design, the agent must check if the user's prompt is underspecified. If so, it halts direct code generation, opens a Chain of Thought (CoT) block, and evaluates the implicit variables using the schemas and selection strategies described below.

### When to Use This Reference
This reference MUST be used in the following scenarios:
1. **At the start of every session**: To bootstrap the agent's reasoning framework.
2. **When receiving ambiguous prompts**: E.g., "build me a game," "make a database," "create a backend," where no specific language, framework, or runtime parameters are provided.
3. **During architectural planning**: When deciding between Next.js vs Vite, SQLite vs PostgreSQL, or local vs remote state synchronization.
4. **Before executing commands**: To verify that the environment parameters match the chosen stack.

---

```mermaid
graph TD
  Prompt["1. User Prompt (e.g., 'make me a minecraft')"] --> Analyze["2. Parse Scope & Intent"]
  Analyze --> CheckImplicit{"3. Are parameters (language, framework, platform) implicit?"}
  
  CheckImplicit -->|Yes| CoTReasoning["4. Activate Chain of Thought (CoT)"]
  CheckImplicit -->|No| MatchSpecs["5. Align with Explicit Specifications"]
  
  CoTReasoning --> EvalStack["6. Evaluate best technology options (Aesthetic, Performance, Simplicity)"]
  EvalStack --> QueryHistory["7. Cross-reference User Memory & Past Repository Stacks"]
  QueryHistory --> ChooseStack["8. Make Deductive Selection & Document Logic"]
  
  ChooseStack --> DraftCode["9. Generate Modular Architecture & Code"]
  MatchSpecs --> DraftCode
```

---

## 1. Chain of Thought (CoT) Trigger Protocols

When a user prompt is received, do not jump straight into code generation. You MUST execute an internal Chain of Thought reasoning pass when any of the following triggers are met:

- **Constraint Absence**: The user requests a complex application or module but does not specify the programming language, framework, database, or styling rules.
- **Architectural Ambiguity**: The request could be implemented as a simple script, a command-line tool, a lightweight web interface, or a full-scale backend service.
- **Visual Underspecification**: The user requests a visual UI or game but provides no layout tokens, dimensions, color preferences, or responsiveness guidelines.

---

## 2. Inferred Context & Technology Selection

When constraints are absent, you must systematically reason about the best tools for the task. The selection process must balance performance, simplicity, visual appeal, and the user's environment:

| Ambiguity Vector | Implicit Choice Strategy | Default Selection Standard | Rationale |
| :--- | :--- | :--- | :--- |
| **Web Apps / Interactive** | Modern responsive SPA / Next.js / Vite | Vanilla JS + Canvas or React + Vite | Maximizes interactive visual performance, zero compilation setup for the user, runs in any browser. |
| **Simple Visual Games** | Web Canvas / 3D WebGL | HTML5 Canvas + JS or Three.js | Instant deployment, high frame rates, readable math logic. |
| **Scripting / Automation** | Platform-native scripting | Node.js (TS) or Python | Cross-platform, easy dependency management, fast execution. |
| **Database Engines** | In-memory or zero-config local db | SQLite (local) or Local Storage (Web) | Avoids external service installation blockers during initialization. |

---

## 3. Cognitive Walkthrough Examples

### Example A: User says "make me a minecraft"

1. **Implicit Objective**: The user wants a voxel-based 3D block-building sandbox similar to Minecraft.
2. **Missing Variables**: Language (not specified), platform (web, desktop, or mobile?), rendering method (WebGL, canvas, OpenGL?), layout/controls.
3. **Chain of Thought Deduction**:
   - *Option 1 (C++ / OpenGL)*: High performance, but requires massive local compilation setup, complex window managers, and dependency setups. High failure rate.
   - *Option 2 (Java / LWJGL)*: Original game language, but heavy setup.
   - *Option 3 (Python / Ursina)*: Easy to write, but requires python dependencies, libraries configuration, and might lag.
   - *Option 4 (JavaScript / Three.js / WebGL)*: Runs instantly, renders 3D graphics in the browser, easy keyboard/mouse capture, no build process needed to test.
   - *Deduction*: Choose **HTML5/Three.js** or a **three.js WebGL canvas application**. It provides a gorgeous dark-mode glassmorphic voxel interface, instant controls, and loads without local environment blocks.
4. **Action**: Implement a fully functional Three.js voxel build game with block addition, removal, camera rotation, collision detection, and texture styling.

### Example B: User says "build a todo system"

1. **Implicit Objective**: The user needs a persistent task management interface.
2. **Missing Variables**: Database type, frontend, styling, auth.
3. **Chain of Thought Deduction**:
   - They didn't ask for a server-side DB. Setting up Postgres/MySQL will cause installation friction.
   - *Deduction*: Create a premium frontend (Vite/React or pure HTML/JS) styling it with a glassmorphic dashboard palette and storing state in `localStorage` or SQLite.

---

## 4. Cross-Project Stack Mapping Integration

Before choosing a technology stack, check the **Global Codebase DNA Registry** in [persistent_memory.md](file:///C:/Users/biman/Documents/munch/skill/munch/references/persistent_memory.md):

- If the user's active codebase uses **TypeScript & Node.js**, prioritize creating helpers or scripts in TypeScript.
- If the current codebase uses **Python**, do not generate a Node.js utility unless requested.
- Maintain syntactic consistency across projects to leverage the user's existing environment configurations.

---

## 5. Reasoning Transparency

When writing the output, explicitly share a 2-3 bullet point summary of your Chain of Thought logic in the response header. Explain *why* you made specific technological choices for the implicit requirements, making your decisions transparent to the user.

---

## 6. Deep Voxel Sandbox Design Specification

When the user asks for a game like Minecraft, the implementation must match these standards:

### A. Rendering Pipeline (Three.js WebGL)
- **Scene Initialization**:
  ```javascript
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x1a1a1a);
  const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
  const renderer = new THREE.WebGLRenderer({ antialias: true });
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.shadowMap.enabled = true;
  document.body.appendChild(renderer.domElement);
  ```
- **Chunk Management**:
  - Store blocks in a 3D matrix map (`Map<string, number>`) using keys like `x,y,z`.
  - Instantiate block geometries dynamically using a merged mesh or InstancedMesh to keep draw calls low ($O(1)$ scaling for static blocks).
- **Collision Math**:
  - Implement basic axis-aligned bounding box (AABB) collision checks between the player camera bounds and surrounding block matrices.

### B. Controls & Event Listeners
- **Pointer Lock Controls**: Enable locking the mouse on click to capture mouse movement (`movementX`, `movementY`) for looking around:
  ```javascript
  document.addEventListener('click', () => {
    document.body.requestPointerLock();
  });
  ```
- **Movement Listeners**: Capture keyboard events (`W`, `A`, `S`, `D`, `Space`, `Shift`) to compute velocity vectors.
- **Raycasting for Editing**: Use a `THREE.Raycaster` projecting from the center of the camera to find which block face is intersected.
  - On **Left Click**: Remove block.
  - On **Right Click**: Add block matching the clicked face normal.

---

## 7. Responsive Voxel Design Interface Rules

Ensure visual controls overlay has a sleek dark-glass container layout:
- CSS Backdrop blur: `backdrop-filter: blur(12px)`.
- Base Spacing: 8px grid intervals.
- Colors: HSL neutral dark scales.

---

## 8. Context-Aware Prompt Parser (Algorithm & Logic)

The agent runs the following internal state-machine logic to parse commands:

```javascript
class PromptParser {
  constructor(rawPrompt) {
    this.prompt = rawPrompt.toLowerCase();
    this.inferredStack = {
      language: null,
      runtime: null,
      uiType: null,
      database: null
    };
  }

  analyze() {
    // Detect implicit keywords
    if (this.prompt.includes("game") || this.prompt.includes("minecraft") || this.prompt.includes("3d")) {
      this.inferredStack.language = "javascript";
      this.inferredStack.runtime = "browser";
      this.inferredStack.uiType = "threejs-canvas";
    } else if (this.prompt.includes("script") || this.prompt.includes("automate")) {
      this.inferredStack.language = "typescript";
      this.inferredStack.runtime = "node";
      this.inferredStack.uiType = "cli";
    } else {
      this.inferredStack.language = "html/js";
      this.inferredStack.runtime = "browser";
      this.inferredStack.uiType = "responsive-spa";
    }
    return this.inferredStack;
  }
}
```

---

## 9. Comprehensive Technology Decision Playbook

This section details how the agent must choose specific toolsets in ambiguous tasks:

1. **Vite vs Next.js**:
   - Use Vite for single-page standalone interactive assets or lightweight frontends that are run locally.
   - Use Next.js for multi-page complex enterprise dashboards requiring server-side rendering or API gateways.
2. **SQLite vs Postgres**:
   - Always choose SQLite for local configurations to eliminate complex database daemon runtime requirements.
3. **HTML5 Canvas vs SVG**:
   - Choose HTML5 Canvas for dynamic visual engines (above 100+ entities).
   - Choose SVG for clean structural layout components or charts.

---

## 10. Execution Flow & Compilation Target Verification

Before shipping:
- Validate if compiler options match.
- If in a node environment, inspect `tsconfig.json`.
- If compiling on WSL2/Ubuntu, verify Node engine versions match target environment specifications.

---

## 11. Code Template Guidelines & Layout Standards

All generated applications must include:
- A clear responsive layout system (12-column grid or CSS flexbox).
- Dynamic visual feedback loops (micro-animations on mouse hover/action).
- Accessible key navigation.

---

## 12. Voxel Collision Math & Physics Specification

For 3D games:
- Compute gravitational constant $g = 9.8 m/s^2$.
- Apply drag and friction on ground collisions.
- Manage jump velocity checks.

---

## 13. Dynamic State Managers and Redux Options

When managing state across complex interactive systems:
- Prioritize lightweight stores (e.g. Zustand) for small interactive web apps.
- Implement full Redux toolkit matrices only for applications requiring complex telemetry.

---

## 14. Performance Boundary Mapping

Define clear performance ceilings:
- Max frame count for WebGL layers: 60fps.
- Target latency for interactive events: < 16ms.

---

## 15. Cross-Project Analogy Execution

- Retrieve the user model.
- Read active design constraints.
- Inject historical style preferences to bypass onboarding steps.

---

## 16. Structural System Auditing

- Run threat modeling profiles.
- Enforce input scrub sanitizers.
- Verify security sandbox boundaries.

---

## 17. Multi-User Integration Guidelines

If the application requires communication overlays:
- Propose standard WebSockets or SSE (Server-Sent Events) channels.
- Use clean event listeners to handle dynamic peer messages.

---

## 18. Local Storage Synchronization Details

- Cache local state graphs securely in browser `localStorage`.
- Sync and compress JSON snapshots.

---

## 19. Algorithmic Scaling Playbooks

- Profile loops.
- Prevent infinite recursion locks.

---

## 20. Code Verification Gate Checklists

Run this gate:
1. Are all implicit parameters parsed?
2. Has CoT been recorded?
3. Has the target language been selected with reason?
4. Are files structured cleanly?

---

## 21. Voxel Chunk Generation Algorithms

Voxel games need procedural world generators. Use Perlin or Simplex noise algorithms to generate random hills, valleys, and block configurations:

```javascript
class NoiseGenerator {
  constructor(seed) {
    this.seed = seed;
  }
  noise2D(x, z) {
    // Generate pseudorandom height value based on input coordinate offsets
    const val = Math.sin(x * 0.1) * Math.cos(z * 0.1) * 2;
    return Math.floor(val + 4);
  }
}
```

---

## 22. Keyboard Navigation Accessibility Standards

When constructing HTML overlays:
- Ensure tabIndex is configured correctly.
- Add focus ring outline parameters.
- Provide key hooks for `Escape` to close modal contexts.

---

## 23. Audio Effects & Sound Telemetry

For interactive games:
- Prioritize Web Audio API for dynamic synthesized signals.
- Limit audio resources loading to prevent UI frame dropouts.

---

## 24. Graphics Options & Quality Scales

Provide setting panels to alter render quality:
- Low: Disable shadow rendering, drop render distance bounds.
- High: Enable shadow mapping, anti-aliasing features.

---

## 25. Thread Management with Web Workers

For heavy calculations (e.g. terrain rendering maps, pathfinding matrices):
- Offload tasks to browser Web Workers to prevent rendering freezes on the UI thread.

---

## 26. Custom Shader Integration

If rendering specialized textures:
- Write lightweight WebGL Vertex and Fragment shaders in GLSL.

---

## 27. Network Sync Telemetry

- Measure ping rates.
- Adjust interpolation matrices for remote player coordinates.

---

## 28. Event Bus Routing Systems

Ensure clean component decoupled communication:
```javascript
class EventBus {
  constructor() {
    this.listeners = {};
  }
  on(event, callback) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(callback);
  }
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(cb => cb(data));
    }
  }
}
```

---

## 29. Style Prefab Collections

Save visual configurations for fast mockups:
- Glassmorphic panels.
- Dark theme backgrounds.
- High-contrast buttons.

---

## 30. User Interaction Telemetry Tracking

- Track click counts, frame rendering metrics, and UI response latency.
- Save analytics to the memory model to optimize layout design choices.

---

## 31. CSS Grid Responsive Breakpoints

```css
.container {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: 24px;
}
@media (max-width: 768px) {
  .container {
    grid-template-columns: 1fr;
    gap: 16px;
  }
}
```

---

## 32. Memory Compact Serialization Specifications

When storing snapshots of high-load data structures:
- Compress data logs using runs of coordinates.
- Run serialization logic asynchronously.

---

## 33. Asset Prefetching Schedules

- Prioritize preloading core assets (textures, scripts).
- Run background caching of secondary resources.

---

## 34. Custom ROM Build Command Wrappers

If building firmware setups:
- Intercept build environments and set GCC flags correctly.

---

## 35. Webpack & Vite Bundler Optimization

- Enforce code-splitting patterns.
- Strip dead tree code dependencies automatically.

---

## 36. Local Storage Caching Strategies

- Implement item expire markers.
- Auto-clear legacy versions when schema upgrades occur.

---

## 37. Thread Safety in Concurrent Databases

- Enforce write locks during sqlite write sweeps.
- Resolve read requests from cache pools.

---

## 38. Exception Interception Layers

- Register global window error catchers.
- Report debug messages to localized console overlays.

---

## 39. Semantic Layout Templates

Always structure pages using semantic elements:
- `<header>`
- `<main>`
- `<nav>`
- `<footer>`

---

## 40. Interactive Voxel Edit History

Provide undo and redo logs for block placements:
- Store operations in a command history stack array.

---

## 41. Vector Math Operations

Include specialized vector classes for coordinate geometry transformations:
```javascript
class Vector3D {
  constructor(x, y, z) {
    this.x = x;
    this.y = y;
    this.z = z;
  }
  add(v) {
    return new Vector3D(this.x + v.x, this.y + v.y, this.z + v.z);
  }
  distance(v) {
    return Math.sqrt((this.x - v.x)**2 + (this.y - v.y)**2 + (this.z - v.z)**2);
  }
}
```

---

## 42. WebGL Context Recovery Systems

- Capture `webglcontextlost` events.
- Reload meshes and rebuild textures dynamically.

---

## 43. Multi-Touch Controls Mapping

For mobile platforms:
- Track touch start, move, and end events.
- Implement virtual joystick modules on screen canvas layers.

---

## 44. CSS Animation Bezier Constants

```css
:root {
  --ease-in-out-spring: cubic-bezier(0.68, -0.6, 0.32, 1.6);
  --ease-out-back: cubic-bezier(0.34, 1.56, 0.64, 1);
}
```

---

## 45. DB Engine Optimization Frameworks

- Run optimization queries (`VACUUM` in SQLite).
- Re-index tables after massive modifications.

---

## 46. Command Invocation Guards

- Validate user identity parameters.
- Verify path validity parameters.

---

## 47. Automated UI/UX Audit Checks

- Verify WCAG contrast levels.
- Check font size baselines.

---

## 48. Build Output Analysis Routines

- Scan for bundle sizing.
- Log asset maps.

---

## 49. Cross-Session Workspace Redirection

- Check the original directory root.
- Route commands using the translated workspace paths.

---

## 50. Final Verification Cycle Checklists

Before saving state:
1. Did the build pipeline compile cleanly?
2. Has the user confirmed the architecture?
3. Has the log summary been exported successfully?
4. Are all references aligned?

---

**§STATUS: ACTIVE v1.0 | ANTI_REGRESSION: ∞ON | COGNITIVE_REASONING: FULL**
