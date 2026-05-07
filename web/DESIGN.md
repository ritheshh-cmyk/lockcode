---
name: LockApp Admin — License Management Console
colors:
  # ── Backgrounds ──────────────────────────────────────────────
  background:                "#07070f"
  surface:                   "#0d0d1a"
  surface-dim:               "#09090f"
  surface-bright:            "#13131f"
  surface-container-lowest:  "#05050c"
  surface-container-low:     "#0f0f1c"
  surface-container:         "#111120"
  surface-container-high:    "#181828"
  surface-container-highest: "#1e1e30"

  # ── Text ─────────────────────────────────────────────────────
  on-surface:         "#eaeeff"
  on-surface-variant: "#8890aa"
  on-surface-dim:     "#4a5070"

  # ── Borders ──────────────────────────────────────────────────
  outline:         "#252540"
  outline-variant: "#1a1a2e"

  # ── Primary — Cyber Indigo ───────────────────────────────────
  primary:              "#6c8fff"
  on-primary:           "#ffffff"
  primary-container:    "#1a2550"
  on-primary-container: "#a0b4ff"
  primary-dim:          "#4a6edb"
  primary-glow:         "rgba(108, 143, 255, 0.15)"

  # ── Secondary — Violet ───────────────────────────────────────
  secondary:              "#9b7fff"
  on-secondary:           "#ffffff"
  secondary-container:    "#221840"
  on-secondary-container: "#c4b0ff"

  # ── Semantic ─────────────────────────────────────────────────
  success:           "#34d399"
  success-container: "#0a2e22"
  warning:           "#fbbf24"
  warning-container: "#2e2006"
  error:             "#f87171"
  error-container:   "#2e0a0a"

  # ── Cyan — Gemini Key indicator ───────────────────────────────
  tertiary:              "#22d3ee"
  tertiary-container:    "#0a2028"
  on-tertiary-container: "#7ee8f8"

  background-gradient: "radial-gradient(ellipse 80% 50% at 50% -20%, rgba(108,143,255,0.12), transparent)"

typography:
  display-lg:
    fontFamily: "Inter"
    fontSize: 48px
    fontWeight: "700"
    lineHeight: 56px
    letterSpacing: -0.03em

  headline-lg:
    fontFamily: "Inter"
    fontSize: 28px
    fontWeight: "700"
    lineHeight: 36px
    letterSpacing: -0.02em

  headline-md:
    fontFamily: "Inter"
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px

  body-lg:
    fontFamily: "Inter"
    fontSize: 15px
    fontWeight: "400"
    lineHeight: 24px

  body-md:
    fontFamily: "Inter"
    fontSize: 13px
    fontWeight: "400"
    lineHeight: 20px

  label-lg:
    fontFamily: "Inter"
    fontSize: 12px
    fontWeight: "600"
    lineHeight: 16px
    letterSpacing: 0.06em

  label-sm:
    fontFamily: "Inter"
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 14px
    letterSpacing: 0.04em

  mono-key:
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace"
    fontSize: 13px
    fontWeight: "500"
    lineHeight: 20px
    letterSpacing: 0.08em

rounded:
  sm:      0.25rem
  DEFAULT: 0.5rem
  md:      0.75rem
  lg:      1rem
  xl:      1.25rem
  2xl:     1.5rem
  full:    9999px

spacing:
  unit:           8px
  page-padding:   24px
  card-padding:   20px
  card-gap:       12px
  section-gap:    32px
  table-cell-x:   20px
  table-cell-y:   14px
  modal-padding:  28px

elevation:
  level-0: "none"
  level-1: "0 1px 3px rgba(0,0,0,0.4)"
  level-2: "0 4px 16px rgba(0,0,0,0.5)"
  level-3: "0 8px 32px rgba(0,0,0,0.6), 0 0 0 1px rgba(255,255,255,0.04)"
  level-4: "0 16px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(108,143,255,0.15)"
  glow-primary: "0 0 24px rgba(108,143,255,0.3)"
  glow-success: "0 0 16px rgba(52,211,153,0.25)"
  glow-error:   "0 0 16px rgba(248,113,113,0.25)"

motion:
  duration-fast:    150ms
  duration-default: 220ms
  duration-slow:    380ms
  easing-standard:  "cubic-bezier(0.4, 0, 0.2, 1)"
  easing-enter:     "cubic-bezier(0, 0, 0.2, 1)"
  easing-exit:      "cubic-bezier(0.4, 0, 1, 1)"

components:
  header:
    backgroundColor: "rgba(13,13,26,0.85)"
    borderBottom: "1px solid #1a1a2e"
    backdropFilter: "blur(20px)"
    height: 60px

  stat-card:
    backgroundColor: "#111120"
    rounded: "{rounded.xl}"
    padding: 20px
    border: "1px solid #252540"

  table-container:
    backgroundColor: "#0f0f1c"
    rounded: "{rounded.2xl}"
    border: "1px solid #252540"

  table-header:
    backgroundColor: "#111120"
    textColor: "#4a5070"
    typography: "{typography.label-lg}"

  table-row-hover:
    backgroundColor: "#111120"

  badge-reg-key:
    backgroundColor: "#1a2550"
    textColor: "#a0b4ff"
    fontFamily: "{typography.mono-key}"
    rounded: "{rounded.md}"
    padding: "4px 10px"

  badge-gemini-set:
    backgroundColor: "#0a2028"
    textColor: "#7ee8f8"
    fontFamily: "{typography.mono-key}"
    rounded: "{rounded.md}"
    padding: "4px 10px"

  badge-gemini-missing:
    backgroundColor: "#2e2006"
    textColor: "#fbbf24"
    border: "1px solid rgba(251,191,36,0.2)"
    rounded: "{rounded.md}"
    padding: "4px 10px"

  status-active:
    backgroundColor: "rgba(52,211,153,0.08)"
    textColor: "#34d399"
    border: "1px solid rgba(52,211,153,0.2)"
    rounded: "{rounded.full}"

  status-revoked:
    backgroundColor: "rgba(248,113,113,0.08)"
    textColor: "#f87171"
    border: "1px solid rgba(248,113,113,0.2)"
    rounded: "{rounded.full}"

  status-expired:
    backgroundColor: "rgba(251,191,36,0.08)"
    textColor: "#fbbf24"
    border: "1px solid rgba(251,191,36,0.2)"
    rounded: "{rounded.full}"

  button-primary:
    backgroundColor: "#6c8fff"
    textColor: "#ffffff"
    rounded: "{rounded.xl}"
    height: 40px
    padding: "0 20px"
    shadow: "0 0 24px rgba(108,143,255,0.3)"

  button-primary-hover:
    backgroundColor: "#4a6edb"
    shadow: "0 0 32px rgba(108,143,255,0.45)"

  button-ghost:
    backgroundColor: "rgba(255,255,255,0.03)"
    textColor: "#8890aa"
    border: "1px solid #252540"
    rounded: "{rounded.xl}"
    height: 40px

  modal-overlay:
    backgroundColor: "rgba(0,0,0,0.7)"
    backdropFilter: "blur(6px)"

  modal-sheet:
    backgroundColor: "#0f0f1c"
    border: "1px solid #252540"
    rounded: "{rounded.2xl}"
    padding: 28px
    shadow: "0 16px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(108,143,255,0.15)"
    maxWidth: 440px

  input-default:
    backgroundColor: "#111120"
    textColor: "#eaeeff"
    border: "1px solid #252540"
    rounded: "{rounded.xl}"
    height: 46px
    padding: "12px 16px"

  input-focus:
    border: "1px solid rgba(108,143,255,0.5)"
    backgroundColor: "#181828"

  input-mono:
    fontFamily: "{typography.mono-key}"
    textColor: "#6c8fff"
    letterSpacing: 0.3em
    fontSize: 18px
    textAlign: center

  login-card:
    backgroundColor: "rgba(13,13,26,0.85)"
    border: "1px solid #252540"
    backdropFilter: "blur(24px)"
    rounded: "{rounded.2xl}"
    padding: 36px
    maxWidth: 360px
    shadow: "0 16px 64px rgba(0,0,0,0.7), 0 0 0 1px rgba(108,143,255,0.15)"

  login-logo:
    background: "linear-gradient(135deg, #6c8fff 0%, #9b7fff 100%)"
    rounded: "{rounded.xl}"
    width: 52px
    height: 52px
    shadow: "0 0 24px rgba(108,143,255,0.3)"

  toast-success:
    backgroundColor: "rgba(52,211,153,0.08)"
    border: "1px solid rgba(52,211,153,0.2)"
    textColor: "#34d399"
    backdropFilter: "blur(16px)"
    rounded: "{rounded.xl}"

  toast-error:
    backgroundColor: "rgba(248,113,113,0.08)"
    border: "1px solid rgba(248,113,113,0.2)"
    textColor: "#f87171"
    backdropFilter: "blur(16px)"
    rounded: "{rounded.xl}"
---

## Brand & Style

LockApp Admin is a **precision SaaS control surface** — built for one operator who needs instant, clear control over license lifecycle and API credential management. The aesthetic is **Dark Operative**: deep space-black backgrounds, sharp data hierarchy, and cool indigo-violet accents that signal authority without decoration.

The emotional register is **confident and silent**. There is no marketing copy, no illustrations, no onboarding clutter. Every pixel exists because a decision was made there. The interface communicates "you are in control" through density, precision typography, and the faint indigo glow that traces primary actions against the void.

The philosophy is **information-dense but never claustrophobic** — generous row heights, clear column separation, and padded modals prevent the density from feeling hostile. The page carries a single radial glow at the top-center (indigo at 12% opacity) that grounds the whole layout without competing with content.

---

## Colors

The strategy is **monochromatic depth with surgical accent**. The background stack is built from eight near-identical dark navy shades creating believable Z-axis separation without shadows. A single accent family — Cyber Indigo (#6c8fff) through Spectral Violet (#9b7fff) — carries all primary actions and interactive affordances.

- **Abyss Black** (#07070f) — Page background. The void everything floats above.
- **Deep Navy** (#0d0d1a) — Primary surface. Cards, modals, panels sit here.
- **Slate Stack** (#111120 → #1e1e30) — Progressive container hierarchy from table background through hover states, each 8% lighter than the last.
- **Cyber Indigo** (#6c8fff) — Primary action. Add Key button, reg-key badges, input focus rings, and primary CTAs. Glows softly on interactive elements.
- **Spectral Violet** (#9b7fff) — Secondary gradient terminus. Logo mark gradient endpoint.
- **Gemini Cyan** (#22d3ee) — Reserved exclusively for the Gemini API key indicator. Communicates "AI credential" at a glance.
- **Emerald Active** (#34d399) — Active license status. Warm green reads as alive, not clinical.
- **Amber Warning** (#fbbf24) — Unassigned Gemini key badge. Signals "attention needed" without panic.
- **Coral Error** (#f87171) — Revoked and expired license states.
- **Ghost Text** (#8890aa) — Table headers, secondary labels, timestamps. Legible but subordinate.
- **Silhouette Text** (#4a5070) — Disabled states and inactive placeholders.

All status elements use ultra-low opacity fills (8%) with matching 20% border strokes — semantic signals without dominating the table.

---

## Typography

**Inter** handles all prose and UI text. **JetBrains Mono** handles all credential values, license keys, and machine IDs. The monospace choice communicates "this is data, not copy" — a critical distinction for a tool managing API keys.

- **Hierarchy through weight, not size.** Headings use 700 weight. Table column headers use 600 weight with +0.06em letter-spacing and uppercase — they read as field separators, not headings.
- **Table body lives at 13px.** Dense enough for a professional tool; comfortable for extended sessions.
- **Registration key display uses 18px mono with +0.3em letter-spacing.** The 8-digit code is ceremonial in the modal input — large, spaced, unmistakable.
- **Stat card numbers render at 48px / weight 700.** Immediately readable as the at-a-glance summary layer.

---

## Layout & Spacing

Strict vertical rhythm on an **8px base grid**. All spacing values are multiples of 8.

- **Page:** 24px horizontal padding. Single column, max-width 1280px, centered.
- **Stats strip:** Three equal cards, 12px gap, responsive (1-col mobile / 3-col desktop).
- **Table:** Full-width. 20px horizontal / 14px vertical cell padding. Consistent ~52px row height allows inline language selectors.
- **Modals:** 440px max-width. Vertically centered. 28px internal padding. Inputs stack with 16px vertical gap.
- **Header:** Sticky 60px. Logo mark left, Add Key button right. 1px bottom border at 3% white opacity.

The page background carries one `radial-gradient` bloom — indigo at 12% opacity, centered at `50% -20%` — creating the impression of a distant light source, adding depth without real shadows.

---

## Elevation & Depth

Depth is achieved through **background color progression, not drop shadows**. The Z-axis stack:

1. **Level 0 — Abyss** (#07070f): Page background.
2. **Level 1 — Surface** (#0d0d1a): Main content surface.
3. **Level 2 — Container** (#111120): Table body, stat cards.
4. **Level 3 — Hover** (#181828): Table row hover state — appears to lift on mouseover.
5. **Level 4 — Modal** (#0f0f1c + `level-4` shadow): Floats clearly above all content via deep box-shadow and a 1px indigo-tinted border.

**Glows replace traditional shadows for interactive feedback.** The primary button emits a `rgba(108,143,255,0.3)` halo on hover. The active stat card emits a `rgba(52,211,153,0.25)` emerald pulse. These micro-glows communicate live state in a way static shadows cannot.

---

## Component Behaviors

**Login screen:** A centered `login-card` with a radial indigo glow behind it. The logo mark is a `rounded-xl` square with an indigo→violet gradient. Single password input and submit button. No decoration, no links.

**Stat strip:** Three cards. Each has: uppercase label top, huge stat number center, semantic icon right at 40% opacity. A 2px left-border accent line in the card's semantic color (emerald/coral/amber). Border brightens 20% on hover.

**License table:** The core UI surface. Columns: Key → Label → Gemini Key → Lang → Status → Time → Actions.
- **Key** column always uses `badge-reg-key`: indigo background, mono font.
- **Gemini Key** shows `badge-gemini-set` (cyan, truncated to 16 chars) or `badge-gemini-missing` (amber "⚠ Not set"). Admin immediately sees which licenses need attention.
- **Lang** column: inline `lang-select` dropdown, saves on change — no separate edit mode.
- **Action icons** appear at 60% opacity default; 100% on row hover. Each has its own hover tint: indigo for key update, coral for revoke, cyan for reset, gray for delete.

**Add Key modal:** Fields stack vertically — Registration Key (large mono with live digit counter), Customer Label, Gemini API Key (cyan-tinted mono input), Language select, Duration (days + hours side-by-side). On success, form replaces itself with "Key Created" confirmation and a copyable key pill.

**Update Gemini Key modal:** Minimal single-field modal. Reg key shown as indigo pill identifier at top. One cyan-styled mono input. Save button in indigo→violet gradient.

**Toasts:** Fixed top-right. Slide in from right at 220ms ease-out. Auto-dismiss at 3s. Glass styling with appropriate semantic color. Never stack — one at a time.

---

## Shape Language

Corners are **generously but consistently rounded** — modern SaaS, not bubbly consumer.

- **Page cards and table container:** `rounded-2xl` (1.5rem). Friendly but structured.
- **Buttons and inputs:** `rounded-xl` (1.25rem). Slightly softer, creating visual sub-hierarchy within the page.
- **Status pills and key badges:** `rounded-full` (9999px). Pill shape clearly signals "tag, not container."
- **Action icon buttons:** `rounded-md` (0.75rem). Compact squares, approachable.

The matching `rounded-xl` on both buttons and inputs creates a cohesive interactive sub-system — every element the user can click or type in feels visually related.

---

## Motion

Two primary speeds. One easing. No bounce.

- **Fast (150ms):** Row hover, icon opacity, input border on focus.
- **Default (220ms):** Button hover, modal fade, toast slide-in.
- **Slow (380ms):** Modal backdrop blur only.

Easing is always `cubic-bezier(0.4, 0, 0.2, 1)` — the Material standard curve. The interface feels **responsive, not playful**. No spring animations, no overshoot, no personality flourishes. This is a tool. It responds to intent.
