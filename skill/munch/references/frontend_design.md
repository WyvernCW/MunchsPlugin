# Frontend Design Supporting Skill: Distinctive Layouts and Compositions
License: Complete terms in LICENSE.txt

This skill guides the creation of distinctive, production-grade frontend interfaces that avoid generic "AI slop" aesthetics. Implement real working code with exceptional attention to aesthetic details and creative choices.

---

## ⟦§VISUAL_COMPOSITION⟧
Master the followings to build breathtaking, balanced, and structural visual canvases:

1. **Centered Composition**: The primary focal element is placed exactly at the visual center. Best for clean heroes, landing landing pages, and minimal dashboards.
2. **Symmetrical Balance**: Mirroring elements on the left and right sides of a central axis. Creates stability, formality, and a sense of refinement.
3. **Asymmetrical Balance**: Balancing elements of different visual weights (e.g., a large text block on the left balanced by a small, vibrant interactive element on the right). Dynamic and engaging.
4. **Radial Composition**: Focus radiates outward from a central point. Draws attention deeply into the center element.
5. **Diagonal Composition**: Organizing visual flow along a diagonal line. Directs the eye across the canvas, feeling fast, energetic, and modern.
6. **Triangular Composition**: Placing focal elements to form a stable triangle. Solid, grounded, and structurally sound.
7. **L-Shape Composition**: Elements arranged along the vertical and horizontal edges, forming an "L". Great for structural frame designs.
8. **Z-Pattern**: Natural scanning path for image-rich layouts. Eyes move: Top-left → Top-right → Bottom-left → Bottom-right.
9. **F-Pattern**: The standard scanning path for text-heavy layouts (like articles or blogs). Top horizontal → Lower horizontal → Vertical stem.
10. **Rule of Thirds**: Overlaying a 3x3 grid and placing key elements on intersection points or gridlines for natural asymmetry.
11. **Golden Ratio**: The 1:1.618 ratio. Use for calculating layouts, container sizes, typography scaling, and spacing.
12. **Golden Spiral**: A logarithmic spiral derived from the Golden Ratio. Placing focal points along the spiral's convergence.
13. **Framing**: Framing the primary object with borders, layouts, or surrounding components to heighten focus.
14. **Leading Lines**: Subtle visual lines or alignments pointing the user's eye directly to a conversion target or CTA.
15. **Negative Space**: Allowing elements ample empty space (whitespace) to breathe, elevating readability and luxury.
16. **Foreground-Middleground-Background**: Layering content using z-index, scale, blur, and opacity to construct depth.
17. **Visual Hierarchy**: Guiding priority by size, weight, color contrast, and vertical positioning.
18. **Contrast Composition**: Creating focal anchors by contrasting color temperature, scale, shape, or texture.
19. **Repetition**: Reusing components, shapes, and patterns to establish cohesiveness and rhythm.
20. **Rhythm**: Systematic repetition of elements with variations in spacing or size, introducing movement.
21. **Proximity**: Placing related elements closer together, signaling connection (Gestalt principles).
22. **Alignment**: Aligning elements to standard axes to create neatness, logic, and structure.
23. **Scale Composition**: Drastically exaggerating the scale of certain elements (like hero headings) to establish dominance.
24. **Layered Composition**: Overlapping elements (like text on top of floating shapes) to present a rich, textured depth.
25. **Modular Composition**: Designing with highly structured, self-contained modular components.
26. **Organic Composition**: Breaking from rigid lines to use fluid, asymmetrical curves, and freeform shapes.
27. **Grid Composition**: Adapting layout strictly along structural columns and rows.

---

## ⟦§UI_UX_LAYOUT⟧
Choose layouts intentionally based on the user's task and desired tone:

### General Page Layouts
* **Single Column**: Linear layout centered on the screen. Best for blogs, articles, and simple forms.
* **Two Column**: split screen or main-content + sidebar layout. Ideal for docs, applications, and dashboards.
* **Three Column**: Main content flanked by left navigation and right inspector panels.
* **Multi Column**: Grid-like distribution of text or products.
* **Full Width**: Spans 100% of the viewport width. Good for immersive media platforms.
* **Boxed**: Constrained to a maximum width (e.g., 1200px) with centered alignment. Clean and predictable.
* **Split Screen**: Screen split 50/50 vertically. Perfect for logins, dual-features, or high-impact storytelling.
* **Sidebar Layout**: Fixed left/right column for navigation, leaving the rest of the canvas for workspace.
* **Top Navigation**: Clean header nav layout, leaving maximum vertical space.
* **Bottom Navigation**: Crucial for mobile apps, placing main routes within direct thumb reach.
* **Dashboard Layout**: Information density dashboard using cards, grids, and modular visualization blocks.
* **Card-Based**: Chunking information into visual containers. Highly adaptable and responsive.
* **Magazine**: Editorial layout using massive typography, columns, and variable image scales.
* **Masonry**: Brick-layer style (like Pinterest), packing items of varying heights efficiently.
* **Hero**: A large visual section at the top of a page with an impact header and call-to-action (CTA).
* **Landing Page**: Goal-oriented single page designed for conversions (Hero → Features → Proof → CTA).
* **Long Scroll**: Storytelling layouts with scroll-triggered animations.
* **One Page**: Simple scroll-spy navigation where all sections live on one page.
* **Wizard / Stepper**: Breaking complex processes into linear step-by-step layouts.
* **Form Layout**: Clean labels, clear groupings, and single-column inputs for high conversion.
* **List Layout**: Linear stack of items. Excellent for logs, feeds, and directory panels.
* **Table Layout**: Structured tabular data with clean headers, sorting, and pagination.
* **Feed Layout**: Continuous vertical scroll of items (social media streams).
* **Chat Layout**: Alternating message bubbles/blocks with a pinned bottom input panel.
* **Profile Layout**: Header card showing identity stats, followed by personal feed/details tabs.
* **Settings Layout**: Categorized side-tabs with quick toggle controls and preferences.
* **Gallery**: Grid of media cards designed for browsing images/video.
* **Portfolio**: Clean showcases combining work items with large, high-impact headings.
* **Pricing**: Side-by-side comparative feature cards highlighting the "Popular" plan.
* **E-commerce Product**: Large image carousel on one side, product details/purchase controls on the other.
* **Checkout**: Split checkout with inputs on the left, order summary card on the right.
* **Search Results**: Left-side filters, right-side dynamic result cards or listings.
* **Map-Based**: split screen layout with interactive map on one half, location listings on the other.
* **Kanban**: Horizontal columns representing stages of workflow, containing cards.
* **Calendar**: Grid of dates showing scheduled items, events, and agendas.
* **Timeline**: Vertical or horizontal line indicating sequential milestones.

### Grid Systems
* **Manuscript Grid**: The single large column with generous margins.
* **Column Grid**: 12-column layouts for desktop, scaling down to 8 or 4 for smaller devices.
* **Modular Grid**: Grid with both column and row constraints creating uniform content blocks.
* **Baseline Grid**: Spacing based strictly on typography line-heights, locking elements to a vertical rhythm.
* **Hierarchical Grid**: Custom coordinates based strictly on element importance.
* **Fluid Grid**: Scalable percentage-based grid.
* **Fixed Grid**: Rigid pixel-based sizing.
* **Responsive Grid**: Flexbox/Grid layouts configured via media query breakpoints.
* **CSS Grid**: Modern grid layouts utilizing `display: grid`.
* **Flexbox Layout**: Flexible 1D alignment utilizing `display: flex`.

---

## ⟦§LAYOUT_COMPOSITION_TEMPLATES⟧

### 1. The Dynamic Dashboard & Sidebar (Vanilla CSS)
Use this setup to create a structural 12-column dashboard layout with a responsive sidebar frame:

```css
:root {
  /* System Design Tokens - HSL Tailored */
  --bg-primary: hsl(220, 15%, 8%);
  --bg-secondary: hsl(220, 15%, 12%);
  --border-subtle: hsla(0, 0%, 100%, 0.08);
  --text-main: hsl(0, 0%, 94%);
  --text-muted: hsl(220, 10%, 65%);
  --accent: hsl(190, 90%, 50%);
  --font-family-display: 'Plus Jakarta Sans', sans-serif;
  --font-family-body: 'DM Sans', sans-serif;
  --spacing-base: 8px;
}

body {
  background-color: var(--bg-primary);
  color: var(--text-main);
  font-family: var(--font-family-body);
  margin: 0;
  display: flex;
  height: 100vh;
  overflow: hidden;
}

/* Sidebar Layout */
.sidebar {
  width: 260px;
  background-color: var(--bg-secondary);
  border-right: 1px solid var(--border-subtle);
  display: flex;
  flex-direction: column;
  padding: calc(var(--spacing-base) * 3);
  box-sizing: border-box;
}

.sidebar-title {
  font-family: var(--font-family-display);
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.02em;
  margin-bottom: calc(var(--spacing-base) * 4);
}

/* Dashboard Workspace Grid */
.workspace {
  flex: 1;
  display: grid;
  grid-template-rows: 70px 1fr;
  overflow-y: auto;
}

.header {
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 calc(var(--spacing-base) * 4);
}

.grid-12 {
  display: grid;
  grid-template-columns: repeat(12, 1fr);
  gap: calc(var(--spacing-base) * 3);
  padding: calc(var(--spacing-base) * 4);
}

/* Card-Based Layout Items */
.card {
  background-color: var(--bg-secondary);
  border: 1px solid var(--border-subtle);
  border-radius: 8px;
  padding: calc(var(--spacing-base) * 3);
  grid-column: span 12;
  transition: border-color 0.25s cubic-bezier(0.4, 0, 0.2, 1);
}

.card:hover {
  border-color: var(--accent);
}

@media (min-width: 768px) {
  .card-medium-6 { grid-column: span 6; }
}

@media (min-width: 1200px) {
  .card-large-4 { grid-column: span 4; }
  .card-large-8 { grid-column: span 8; }
}
```

---

## ⟦§FRONTEND_AESTHETICS⟧
Avoid "AI Slop" — standard templates, purple gradient overlays, default Inter fonts, and unopinionated UI layouts.

### 1. Typography Selection
* **DO NOT** default to Inter, Roboto, Arial, or system-sans.
* **DO** select a bold, expressive font pairing based on tone:
  * *Refined Luxury*: Playfair Display / Outfit
  * *Tech/Minimalist*: Space Mono / DM Sans
  * *Retro/Brutalist*: Syne / JetBrains Mono
  * *Modern Editorial*: Cormorant Garamond / Plus Jakarta Sans

### 2. Colors & Contrast
* **DO NOT** use generic gradients, neon purples, or uncalibrated dark modes.
* **DO** design a focused palette with HSL. Match theme with intention:
  * *High Contrast Dark*: Deep charcoal (`#121212`), crisp white, and a single neon accent.
  * *Earth Tone*: Warm sand background (`#F5F2EB`), olive highlights, charcoal text.

### 3. Noise Overlay & Gradient Meshes
Avoid flat solid colors by layering SVG noise filters inside backgrounds.

```html
<!-- SVG Grain Overlay Filter -->
<svg style="display: none;">
  <filter id="noise-overlay">
    <feTurbulence type="fractalNoise" baseFrequency="0.8" numOctaves="4" stitchTiles="stitch"/>
    <feColorMatrix type="matrix" values="0 0 0 0 0   0 0 0 0 0   0 0 0 0 0  0 0 0 0.04 0"/>
  </filter>
</svg>

<style>
.grain-bg {
  position: relative;
}
.grain-bg::before {
  content: "";
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  width: 100%; height: 100%;
  filter: url(#noise-overlay);
  pointer-events: none;
  z-index: 1;
}
</style>
```
