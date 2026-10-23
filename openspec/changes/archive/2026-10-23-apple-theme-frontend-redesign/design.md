# Technical Design: Apple Theme & Frontend Unified Redesign

## Architecture & Visual Hierarchy

```
[ Root Layout (app/layout.tsx) ]
  • Font Stack: SF Pro Display / SF Pro Text / SF Mono / Inter fallback
  • Dark Mode Base: #000000 with radial specular glow at top
  • Global Tokens: Tailwind v4 @theme with Apple HIG Semantic Variables
       │
       ├──► [ Admin Portal (/admin) ]
       │      • Passcode/FaceID-inspired Auth Screen
       │      • Cupertino macOS Window Chrome Header (Navigation + Action Pills)
       │      • Bento Grid Stat Cards with dynamic colored indicators
       │      • Segmented Filter Controls (Active / Expired / Revoked / All)
       │      • Clean Liquid Glass Data Tables with SF Mono keys & copy triggers
       │      • Frosted Glass Sheets for License Creation & Key Editing
       │      • Integrated Token History Tab
       │
       ├──► [ Token Telemetry (/history) ]
       │      • Liquid Glass Key Inspection Field with SF Symbols search icon
       │      • Metric Pills: Total Tokens, Prompt Tokens, Completion Tokens, Storage Cap
       │      • Collapsible Cupertino Drawers for Prompt and Code Output
       │      • Copy-to-clipboard with subtle haptic-style micro-animation
       │
       └──► [ Ecosystem Documentation (/docs) ]
              • Apple Developer Documentation typography & card architecture
              • Mermaid.js Dark Mode Diagrams with blue/green Apple accent lines
              • Quick copy cheatsheet for hotkeys (F5, F6, F9, Alt+Y)
```

## Apple HIG Design Tokens (`globals.css`)

```css
@theme {
  --color-apple-bg: #000000;
  --color-apple-card: rgba(28, 28, 30, 0.7);
  --color-apple-card-hover: rgba(44, 44, 46, 0.7);
  --color-apple-border: rgba(255, 255, 255, 0.08);
  --color-apple-border-strong: rgba(255, 255, 255, 0.16);
  --color-apple-blue: #0A84FF;
  --color-apple-green: #30D158;
  --color-apple-orange: #FF9F0A;
  --color-apple-red: #FF453A;
  --color-apple-purple: #BF5AF2;
  --color-apple-label: #FFFFFF;
  --color-apple-label-secondary: #8E8E93;
  --color-apple-label-tertiary: #636366;
  
  --font-sf: -apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", "Helvetica Neue", sans-serif;
  --font-sf-mono: "SF Mono", Menlo, Monaco, Consolas, monospace;
}
```

## Animation Curves
Apple uses spring-based timing functions for realistic physical feedback:
- Standard Apple Spring Curve: `cubic-bezier(0.16, 1, 0.3, 1)` (350ms duration)
- Quick Scale Click: `active:scale-[0.98]`
- Frosted Sheet Transitions: `backdrop-blur-2xl` with subtle scale-up on entrance.
