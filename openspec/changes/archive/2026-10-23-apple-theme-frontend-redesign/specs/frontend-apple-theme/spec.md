# frontend-apple-theme Specification

## ADDED Requirements

### Requirement: Apple Design Tokens & Global Foundation
The global styles SHALL declare Apple Dark Mode colors, surface materials, SF Pro font stack, and spring animation curves. The root layout SHALL configure dark mode, viewport meta tags, smooth antialiasing, and Apple-compatible typography.

#### Scenario: Global Apple styling applied
- GIVEN any visitor navigating to any route in the web app
- WHEN the page renders
- THEN the background is pure pitch black (`#000000`) with subtle top specular lighting and `-apple-system, BlinkMacSystemFont, "SF Pro Display"` typography.

### Requirement: Operator Admin Console Redesign
The operator admin console SHALL feature an Apple passcode/FaceID authentication aesthetic, macOS window chrome header, segmented filter tabs, Bento grid stat cards, and translucent frosted glass modal sheets.

#### Scenario: Admin dashboard renders with Apple theme
- GIVEN an authenticated admin accessing `/admin`
- WHEN viewing licenses, metrics, and pools
- THEN all stat cards, license tables, and action buttons render with Apple rounded-2xl glass containers and Apple semantic colors (`#0A84FF`, `#30D158`, `#FF453A`).

### Requirement: Token History & Telemetry Redesign
The `/history` page SHALL replace neon green/cyan styling with Apple Dark Frosted Glass, featuring an Apple search bar, Bento metric cards, and collapsible request drawers with 1-click clipboard copy.

#### Scenario: User inspects token consumption
- GIVEN an 8-digit registration key entered on `/history`
- WHEN the user submits the key
- THEN requests are displayed inside Apple-style frosted glass cards with token metrics and collapsible drawers.

### Requirement: Documentation Redesign
The `/docs` page SHALL use modern Tailwind v4 and the Apple theme, replacing inline CSS styles, with Apple keyboard shortcut badges and dark mode diagrams.

#### Scenario: Viewing ecosystem documentation
- GIVEN a visitor navigating to `/docs`
- WHEN the page renders
- THEN all workflow diagrams, hotkeys cheatsheets, and benchmarks are styled with Apple Developer documentation aesthetics.
