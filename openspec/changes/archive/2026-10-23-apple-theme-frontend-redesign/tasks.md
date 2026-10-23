# Implementation Tasks: Apple Theme & Frontend Unified Redesign

## 1. Design Tokens & Global Foundation
- [x] 1.1 Update `lock/web/app/globals.css` with Apple theme variables, SF font family, hairline border utilities, and spring curves.
- [x] 1.2 Update `lock/web/app/layout.tsx` to set Apple-style dark background, typography classes, and title/meta tags.

## 2. Token History Page Redesign (`/history`)
- [x] 2.1 Overhaul `lock/web/app/history/page.tsx` from neon cyberpunk to Apple dark frosted glass.
- [x] 2.2 Style Bento metric cards, Cupertino search input, status pills, and collapsible request inspectors.
- [x] 2.3 Verify responsive layout and copy-to-clipboard interactions.

## 3. Ecosystem Documentation Redesign (`/docs`)
- [x] 3.1 Rewrite `lock/web/app/docs/page.tsx` to use modern Tailwind v4 and Apple design standards, removing all legacy inline styles.
- [x] 3.2 Add Apple-styled keyboard shortcut cards, architecture flow diagrams, and model cascade status tables.

## 4. Admin Console & Authentication Redesign (`/admin`)
- [x] 4.1 Redesign authentication gate with Apple security/passcode aesthetics.
- [x] 4.2 Overhaul Dashboard navigation: macOS chrome header, desktop sidebar, and mobile drawer with frosted blur.
- [x] 4.3 Redesign Stat Cards, License Table, Segmented Filters, and Add/Edit Key Modals to Apple HIG standards.
- [x] 4.4 Embed the Token History tab directly within `/admin` so operators can inspect user queries without leaving the console.

## 5. Verification & Production Deployment
- [x] 5.1 Test Next.js production build (`next build --webpack`) with zero errors.
- [x] 5.2 Commit and push changes to GitHub `main` and `master`.
- [x] 5.3 Deploy to Vercel production (`web-phi-taupe-97.vercel.app`) and verify live rendering of `/admin`, `/history`, and `/docs`.
