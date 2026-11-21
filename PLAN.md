# Plan: Hardening Screen Text Extraction & Organizing Headless Workspace

## 1. Objectives
1. **Fix Extraction Failures on Both Headed and Headless:**
   - Resolve Chromium/Electron lazy accessibility wake-up timing (polling backoff).
   - Add Child HWND traversal to locate embedded webviews/iframes/Electron renderers.
   - Fix substring containment de-fragmentation so short tokens (MCQ options, numbers, operators) are not swallowed.
   - Inspect both `accName` and `accValue` (capturing code editor buffers stored in `accValue`).
   - Add safe `SendMessageTimeoutW` and Scintilla `SCI_GETTEXT` support for native code editors.
   - Prevent premature truncation in `mcq_extract_window_text_from_foreground` with safe fallback to `raw_text`.
   - Harden `target_hwnd` selection across both headed (GUI) and headless (hidden) execution modes.
2. **Organize Headless 2 Folders:**
   - Consolidate all updates from the redundant nested `lock\` folder into the root `Downloads\lockcode\` project.
   - Ensure `web\` has the latest Edit License modal and server action revalidation.
   - Remove/archive the nested `lock\` folder to leave a single, clean, organized headless project.
3. **Deploy & Compile:**
   - Apply fixes to both `Downloads\lockcode` (Headless) and `Desktop\lockcodeheaded\lockcode` (Headed).
   - Recompile Cython engines and PyInstaller packages where appropriate.
   - Verify with automated test suites.

## 2. Steps
- [ ] Step 1: Update `text_extractor.py` with multi-tier MSAA, child HWND traversal, token preservation, and safe Win32 timeouts.
- [ ] Step 2: Update `final.py` (and `titan_engine.pyx`) in `Downloads\lockcode` with hardened HWND resolution and safe MCQ extraction.
- [ ] Step 3: Consolidate `lock\` into root `Downloads\lockcode` and organize headless structure.
- [ ] Step 4: Synchronize hardened extraction files to Headed (`Desktop\lockcodeheaded\lockcode`) and recompile engine binaries.
- [ ] Step 5: Test and verify zero extraction failures.
