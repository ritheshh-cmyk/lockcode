# Proposal: Apple Theme & Complete Frontend Unified Redesign

## Problem Statement
The frontend of the TITAN Web Platform currently exhibits stark visual and structural mismatches across its key views:
1. `/admin` utilizes a Material 3 dark purple/indigo palette with high-contrast surfaces (`#07070f`, `#b5c4ff`) and Material Symbols.
2. `/history` utilizes a neon cyberpunk cyan/emerald palette (`#090b10`, `#2fd9f4`) with custom glow rings.
3. `/docs` uses legacy inline CSS styling (`#0f1117`) with outdated v2.0 benchmark references and disparate typography.
4. Navigation between sections is fragmented, leaving users disoriented and unable to easily navigate between license administration, key pools, documentation, and token inspection.
5. Mobile views have mismatched bottom bars, lack frosted translucency, and do not conform to Apple Human Interface Guidelines (HIG).

## Proposed Solution
Redesign and unify the entire web frontend into an **Apple Theme** (iOS 26 / macOS Cupertino HIG & Liquid Glass design language):
- **Unified Color System & Dark Materials**: Pure pitch black `#000000` base with elevated frosted glass materials (`bg-white/[0.04]` to `bg-white/[0.08]`), `backdrop-blur-2xl`, and hairline `border-white/[0.08]`.
- **Apple Semantic Accents**: System Blue (`#0A84FF`), System Green (`#30D158`), System Orange (`#FF9F0A`), System Red (`#FF453A`), System Purple (`#BF5AF2`).
- **Cupertino Typography Hierarchy**: `-apple-system, BlinkMacSystemFont, "SF Pro Display", "SF Pro Text", sans-serif` with SF Mono for keys, hashes, and code.
- **Apple Component Standards**:
  - Segmented controls with sliding glass selection.
  - Bento grid stat cards with subtle inner border illumination.
  - Translucent modal sheets with smooth backdrop blur.
  - Unified header bar with direct navigation to Overview, Vault, Token History, API Key Pool, Audit, and Docs.
  - Integrated Token Telemetry tab inside `/admin` so admins can inspect consumption without switching contexts.
  - Modernized `/docs` page matching Apple Developer documentation aesthetics with interactive diagram themes.

## Impact & Scope
- Files touched:
  - `lock/web/app/globals.css` (Apple design tokens, system colors, spring animations)
  - `lock/web/app/layout.tsx` (Apple font definitions, metadata, viewport, favicon)
  - `lock/web/app/admin/page.tsx` (Complete redesign of login screen, dashboard, tables, modals)
  - `lock/web/app/history/page.tsx` (Complete redesign to Apple dark frosted glass)
  - `lock/web/app/docs/page.tsx` (Complete redesign to Apple developer documentation style)
- Zero breaking changes to backend API routes or database schema.
