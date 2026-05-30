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

## ⟦§LAYOUT_COMPOSITION_PRINCIPLES⟧

### 1. Structural Sidebar & 12-Column Grid
* Use a sidebar layout with a fixed, constrained width (e.g. 260px) utilizing high-contrast, sub-surface container boundaries (`border-right`) rather than heavy drop-shadows.
* Arrange the primary dashboard container as a 12-column template (`grid-template-columns: repeat(12, 1fr)`) with explicit horizontal margin gaps based on an 8px spacing system.
* Configure grid span distributions responsively (e.g. span 12 for mobile viewports, span 6 for tablet/medium containers, and span 4 or 8 for desktop viewports).

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
  * *High Contrast Dark*: Deep charcoal background, crisp white text, and a single neon accent.
  * *Earth Tone*: Warm sand background, olive highlights, charcoal text.

### 3. Noise Overlay & Gradient Meshes
* Layer visual depth using un-tiled SVG fractal noise filters mapped directly over gradient background meshes. Set color matrix values to low visibility boundaries (4% opacity) to add realistic paper/grain texture without interfering with readability.
* Utilize thin, semi-transparent borders in place of visual dividers to frame content cleanly.
