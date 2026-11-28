# FairSwitch design system

Visual reference: the "Arpeggio" Framer agency template (7 mobile screenshots, 2026-11-28). **We use it for feel only**: palette, type mix, rhythm, motion, image mood. We do not reuse its name, wordmark, copy, photos or videos. Every word and image here is ours.

Mobile-first. The reference is a ~430 px-wide phone layout. Desktop keeps the same compositions and gives them more air, never a different design.

---

## 1. What the reference does

| Screen | What we observed | What FairSwitch takes from it |
|---|---|---|
| Hero | Full-bleed aqua photo with soft smoke. 3×3 grid of thin white `+` crosshairs. Medium-weight sans 2-liner, then a **huge high-contrast serif** 2-liner whose second line is indented right and ends in an em-dash. Thick orange **ring bullet** + medium sans line. **Giant orange wordmark** cropped by the bottom edge. Orange **double-bar menu** top-right. Dark **floating CTA** bottom-right (rounded rectangle, not a full pill) | All of it, with our copy: "Pay as you go," / *Own it— forever.* / ○ "Machines that run a public rule you can check." Background = WebGL aqua fluid instead of a photo |
| Collage | Black page. A tall **aqua fluid video column** sits inset ~12% from both sides. Product cards of different sizes overlap it at staggered x positions. A **huge, heavy, white, centered** headline runs *behind* the cards (cards have higher z-index) | Collage of machine cards over our fluid canvas; headline "Machines that play fair today & stay yours tomorrow." |
| Header after hero | Small orange wordmark top-left + menu bars top-right, transparent background over whatever scrolls under it | Same, with mix of solid wordmark (no blend) |
| Case panels | Full-bleed dark photos, about 100 svh each. Top-left: small label → thin 1px divider (full content width) → big bold title → regular subtitle. Panels stack as you scroll | Use-case panels: Solar Home Kits / Shared Freezers / E-bike Batteries |
| Plans | White page. Light-grey photo card with **ring bullet + dark bold title** and a grey paragraph, then a hand holding a card that carries the ring + wordmark | "Operator Plan" card in hand |
| Orange panel | Solid orange block, centered white bold title, white sub-line, white rounded button at the bottom | "Operator Dashboard" panel |

Things the prompt asked for that the screenshots don't show (stats block, tech strip, numbered list, FAQ, closing CTA, footer): we design them in the same language, using the rules below.

---

## 2. Tokens (`web/src/styles/tokens.css`)

### 2.1 Colour

| Token | Value | Use |
|---|---|---|
| `--c-signal` | `#FF4A0A` (measured ≈ `#FF4400`) | Wordmark, ring bullets, menu bars, link underlines, ON states, orange panels |
| `--c-signal-ink` | `#B83500` | **Orange text under 24 px on light backgrounds** (5.4:1 on mist). `--c-signal` there is only 3.1–3.4:1 |
| `--c-aqua-1` / `--c-aqua-2` | `#12B3D6` → `#2EC9C4` | Fluid highlights, wire glow, "Grace" state |
| `--c-aqua-deep` | `#0A7FA8` | Base of the hero fluid behind text (the reference's hero is this deep). White on bright aqua is only 2.5:1 |
| `--c-ink` | `#0B0B0C` | Dark sections, primary text on light |
| `--c-graphite-1` / `-2` | `#1B1C1E` / `#2A2B2E` | Dark cards, floating CTA (`rgb(42 43 46 / .88)` + blur) |
| `--c-mist` | `#F3F4F5` | Light page background |
| `--c-fog` | `#E3E5E7` | Dividers on light, light cards |
| `--c-slate-1` / `-2` | `#6E7074` / `#9A9CA0` | Secondary text: `-1` on light (4.5:1), `-2` on dark (7.2:1) |
| `--c-volt` | `#E8FF1A` | **At most two uses**: the "Owned forever" highlight and one proof stat |
| `--c-alert` | `#FF2E1F` | Tamper alert only (always with an icon and text, never colour alone) |
| `--c-line-dark` | `rgb(255 255 255 / .28)` | 1px dividers on photos and dark sections |

Contrast rules (checked):
- `--c-signal` on ink: 5.8:1, fine at any size.
- White on `--c-signal`: 3.4:1, so **large text only** (≥ 24 px, or ≥ 19 px bold). The orange panel uses ≥ 24 px white text, or ink text (5.8:1).
- Body text never sits on bright aqua. On the fluid, text sits over the `--c-aqua-deep` zone, with a 0→35% ink scrim behind it.

### 2.2 Typography

- **Sans**: *Inter Tight* (Google Fonts), weights 400, 500, 700, 800.
- **Serif accent**: *Instrument Serif* 400 (+ italic). Used for 1–2 words per hero or section title, never for paragraphs.
- Load from Google Fonts with `display=swap`, and preload the two hero weights.

| Role | Size | Weight / tracking / leading |
|---|---|---|
| `--fs-wordmark` (hero) | `clamp(5.5rem, 24vw, 22rem)` | 800, −0.06em, 0.8. Bleeds off the bottom (`margin-bottom: -0.18em`) |
| `--fs-display-serif` | `clamp(3.5rem, 15vw, 12rem)` | Instrument Serif 400, −0.03em, 0.9. Second line indented `0.9em` |
| `--fs-mega` (collage / statement) | `clamp(3rem, 13vw, 10rem)` | 800, −0.055em, 0.92 |
| `--fs-h1` | `clamp(2.5rem, 9.5vw, 6.5rem)` | 700, −0.045em, 0.95 |
| `--fs-h2` | `clamp(2rem, 7vw, 4.5rem)` | 700, −0.04em, 1.0 |
| `--fs-lead` (hero sans line, case subtitle) | `clamp(1.5rem, 6.5vw, 3rem)` | 500, −0.035em, 1.05 |
| `--fs-statement` (big grey paragraph) | `clamp(1.75rem, 6vw, 3.75rem)` | 500, −0.035em, 1.1 |
| `--fs-body` | `clamp(1rem, 0.95rem + 0.3vw, 1.125rem)` | 400, −0.01em, 1.5 |
| `--fs-label` (case label, section label) | `clamp(1.05rem, 4.6vw, 1.5rem)` | 500, −0.02em |
| `--fs-micro` (stat labels, braces) | `0.75rem` | 600, +0.08em, UPPERCASE |
| `--fs-stat` | `clamp(3rem, 12vw, 7rem)` | **300**, −0.05em, tabular-nums |

Wordmark: "FairSwitch" in Inter Tight 800, `--c-signal`, no ® (ours isn't registered). The header version is `clamp(1.75rem, 8vw, 2.5rem)`.

### 2.3 Space, layout, shape

- Gutter `--gutter: clamp(1rem, 6.5vw, 4rem)` (the reference's left edge sits at ≈ 6.5% on mobile). Max content width 1440 px.
- Spacing scale (rem): 0.25, 0.5, 0.75, 1, 1.5, 2, 3, 4, 6, 8, 12. Sections use `padding-block: clamp(4rem, 14vw, 10rem)`.
- Grid: 4 columns on mobile, 12 from 64rem. Components use **container queries** (`container-type: inline-size`) rather than viewport media queries.
- Radii: cards `0` (the reference's photo cards are square-cornered); floating CTA and toasts `1.1rem`; orange-panel button `999px`; ring bullet is a circle.
- Hairlines: 1px, `--c-line-dark` on dark, `--c-fog` on light.
- Shadows: none on cards. Floating CTA gets `0 10px 40px rgb(0 0 0 / .35)`.

---

## 3. Motifs

| Motif | Spec |
|---|---|
| **Crosshair grid** | `<CrosshairGrid>`, an absolutely positioned SVG layer with `pointer-events: none`. "+" arms 28 px long, 1.5 px stroke, white at 85%. Columns at `gutter`, `50%`, `100% − gutter`; 3 rows spaced evenly through the hero. Decorative only (`aria-hidden`) |
| **Ring bullet ○** | `<Ring>`: inline SVG circle, `1em × 1em` of the text it precedes, stroke `0.26em` `--c-signal`, aligned to the cap height. Used before key lines and section titles. Variants: `size="lg"` for hero (0.9 em of lead size), `default` |
| **Double-bar menu** | Two bars, `clamp(5rem, 19vw, 7rem)` wide, 5 px tall, 9 px gap, `--c-signal`. It's a `<button aria-expanded aria-controls>` with a 48 px hit area. When open, the bars cross to an × (Framer Motion). It opens a **full-screen menu**: ink background, large rows (`--fs-h1`) with dividers, an orange pixel chevron on each row, and the wordmark top-left |
| **Floating CTA** | Fixed `right/bottom: clamp(.75rem, 3vw, 1.5rem)`. Graphite at 88% with `backdrop-filter: blur(14px)`, radius 1.1rem, padding `1.1em 1.4em`, white `--fs-label`, then a 1.5 px stroke arrow →. **Magnetic hover**: it follows the cursor up to 10 px (spring) on hover-capable pointers only. Labels: "Open app →" (landing), "Pay with USDT →" (device page). Hidden while the full-screen menu is open |
| **Wordmark bleed** | The hero wordmark is the last element, positioned at the bottom with negative margin so its baseline crops ≈ 18%. On desktop it spans the full width (`font-size` tuned so the word fills 100vw) |
| **Collage** | Black section, about 260 svh tall. A sticky fluid canvas column (inset 12% each side, about 100 svh) sits behind. Five cards (aspect ratios 4:5, 1:1, 3:4, 4:5, 3:2) at staggered x positions (left 3%, right 3%, centre…), widths 50–60% on mobile and 26–34% on desktop. The mega headline is centred, white, at `z-index` **below** the cards. Cards parallax at different speeds (−20% … +35%) |
| **Case panels** | `position: sticky; top: 0; height: 100svh` children inside a tall parent, so each panel slides up over the previous one. Photo `object-fit: cover` with an ink gradient on the top 45% for legibility. Top-left stack: `--fs-label` label → 1px full-width divider → `--fs-h1` title → `--fs-lead` subtitle (both white) |
| **Stats block** | Ink background, 2-column grid (4 from 64rem), 1px dividers between cells. Each cell: `--fs-micro` label in slate-2, then the number in `--fs-stat` (weight 300). Live values get a small aqua "live" dot; demo values get a `DEMO` tag in slate. **Never unlabelled** |
| **Tech strip** | Row of text wordmarks (Inter Tight 700, slate-1 on mist), separated by orange "pac-man" circles: an SVG circle with a 60° wedge cut out, rotated differently for each item. It loops as a marquee (paused under reduced motion) |
| **Statement reveal** | Huge ink headline, then a big grey paragraph whose words go slate-2 → ink as the paragraph scrolls through the viewport (`animation-timeline: view()`, per-word spans, JS fallback) |
| **Numbered list** | `{01}` in `--fs-micro` `--c-signal-ink` braces, then the title in `--fs-h2` followed by " —". Short description in slate, and items as a vertical list with hairlines |
| **Text link** | Lowercase, ink or white. A 2px `--c-signal` underline 0.9em wide grows to 100% on hover/focus (200 ms) |
| **Section label** | Lowercase `--fs-label` word, centred, with a 1px underline 2.5em wide, above the section title |
| **Orange panel** | Full `--c-signal` block. Centred white `--fs-h1` title, white `--fs-lead` sub-line (≥ 24 px, for contrast), white pill button with ink text |
| **Closing CTA** | Ink section. Line 1 white `--fs-mega` "Fair machines, every day." Line 2 `--c-signal` "Ownership is next." |
| **Footer rows** | Rows (GitHub, X, Telegram, Docs) in `--fs-h2`, each with a 1px divider and an 8×8-pixel-grid orange chevron (SVG `shape-rendering: crispEdges`) at the right. Contract addresses in a monospace-ish tabular line, linked to OKLink. Pixel-art ↑ back-to-top button |

---

## 4. Device-status language

| State | Word | Treatment |
|---|---|---|
| On | **On** (sans 800) + serif accent "*running*" | Orange text-shadow glow `0 0 .4em rgb(255 74 10 / .45)` |
| Grace | **Grace** | `--c-aqua-1`, slow pulse (opacity 1↔.7, 2.4 s) |
| Locked | **Locked** | `--c-slate-1`, no glow |
| Owned forever | **Owned** + serif "*forever*" | Orange ring around the word, plus a `--c-volt` underline highlight (volt use #1) |

Colour is never the only signal. Each state also has its word, an icon and an `aria-live` announcement on change.

**Circuit diagram** (`/circuit`, ink canvas): wires are 1.5 px slate-2 when the signal is 0. When it's 1 they're `--c-aqua-1` with `filter: drop-shadow(0 0 6px)`, and a dash-offset "pulse" travels along them. The RELAY_ON output turns `--c-signal`. Gates are small rounded NAND glyphs, labelled with their signal numbers.

---

## 5. Motion

| Effect | Implementation | Reduced motion |
|---|---|---|
| Collage parallax | CSS `animation-timeline: view()` on each card (`translate` keyframes). Framer Motion `useScroll` fallback where `CSS.supports('animation-timeline: view()')` is false | Disabled (static positions) |
| Line-by-line text reveal | Lines are split into spans. Fade + 0.6em rise, 60 ms stagger, once, on `view()` entry | Fade only |
| Grey → ink statement | Per-word colour tied to `view()` progress | Shown fully in ink |
| Sticky stacking panels | Pure CSS `position: sticky` | Kept (not motion) |
| Image-card hover zoom | `scale(1.04)` over 600 ms `cubic-bezier(.2,.7,.2,1)`, inside `overflow: clip` | Disabled |
| Link underline grow | `transform: scaleX` from 0.9em to full width | Kept, instant |
| Magnetic CTA | Framer Motion spring (stiffness 300, damping 20) | Disabled |
| Menu open | Clip-path circle expanding from the menu button, rows staggered 40 ms | Instant cross-fade |
| Route changes | View Transitions API (`document.startViewTransition`), shared `view-transition-name` on the wordmark and status word | Cross-fade 150 ms |
| Hero fluid | WebGL fragment shader (2-octave domain-warped noise, aqua palette), 30 fps cap, paused off-screen (IntersectionObserver) and when the tab is hidden. If WebGL is unavailable, falls back to CSS `@property`-animated conic/radial gradients + blur; then to a static gradient | Static frame |
| Smooth scroll | **No Lenis**. Native scroll keeps sticky and scroll-timelines exact and keeps accessibility simple | n/a |

Easing tokens: `--ease-out: cubic-bezier(.2,.7,.2,1)`, `--ease-in-out: cubic-bezier(.65,0,.35,1)`. Durations: 150, 250, 400, 600, 900 ms.

---

## 6. Images

AI-generated, per `docs/IMAGES.md`. Until a file exists, `<Picture>` renders a placeholder: a slot-specific CSS gradient (aqua or studio-black) plus a simple SVG line silhouette of the subject (bulb, freezer, battery…). **Never a broken image.** Real images use `<picture>` with AVIF + WebP at 640/1080/1600/2400 w, `loading="lazy"` except in the hero, and explicit `width`/`height` to prevent layout shift.

---

## 7. CSS architecture

```
@layer reset, tokens, base, components, utilities;
web/src/styles/reset.css     → @layer reset
web/src/styles/tokens.css    → @layer tokens   (custom properties, @property registrations)
web/src/styles/base.css      → @layer base     (typography, focus ring, selection)
web/src/styles/motion.css    → @layer utilities (reveal/parallax keyframes + reduced-motion overrides)
web/src/components/*/X.css   → @layer components
```

- Plain CSS files per component, with BEM-ish class names. No Tailwind.
- Uses: `:has()` (for example `.menu:has([aria-expanded=true])`), container queries, subgrid in the stats and footer grids, `clamp()` everywhere.
- Focus ring: `outline: 2px solid var(--c-signal); outline-offset: 3px` on light; `--c-aqua-1` on orange backgrounds.

---

## 8. Accessibility & performance budget

- Semantic landmarks. One `h1` per route. Accordion = `<details>/<summary>` styled (keyboard-native).
- Hit targets ≥ 44 px. Visible focus everywhere. Wallet and transaction toasts in an `aria-live="polite"` region.
- Lighthouse ≥ 90 for performance and accessibility. Routes are code-split. WebGL and Framer Motion load lazily after first paint. Fonts are subset to Latin. Hero LCP is text, so it doesn't wait on an image.

---

## 9. Page map

| Route | Background rhythm |
|---|---|
| `/` | aqua hero → black collage → dark sticky panels → black stats → mist tech strip → mist "how it works" → mist benefits → light operator card + orange panel → mist FAQ → ink closing → ink footer |
| `/d/:id` | Mist. Big status word, countdown, orange progress bar, `{01}` rule list, "Verify the rule" flow, floating "Pay with USDT →" |
| `/operator` | Orange panel header → mist body, device rows with pixel chevrons, payments history |
| `/circuit` | Ink canvas, interactive gate diagram, addresses with OKLink links |
| `/device/:id` | Ink studio card (virtual device), steps: pin circuit → offline toggle → time slider → tamper |
