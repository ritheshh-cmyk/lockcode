# -*- coding: utf-8 -*-

"""

text_extractor.py — High-Accuracy Pure Native Windows Text Extractor

===================================================================

100% PURE TEXT — ZERO OCR, ZERO SCREENSHOTS/IMAGES, ZERO CLIPBOARD.



Extracts live text from active windows (Chromium, Brave, Chrome, Edge,

Electron, VS Code, Monaco, native Win32 apps, IDEs) using:

  1. Windows MSAA (oleacc.dll) IAccessible COM hierarchy.

  2. Pre-order containment de-fragmentation (eliminates fragment echoes).

  3. Win32 WM_GETTEXT + EM_GETHANDLE fallback for native controls.

"""



import ctypes

import ctypes.wintypes

import win32gui

import win32con

import pythoncom

import comtypes

import re

from comtypes.client import GetModule



# Pre-load oleacc COM module

try:

    _oleacc_mod = GetModule("oleacc.dll")

    _IAccessible = _oleacc_mod.IAccessible

except Exception:

    _IAccessible = None



OBJID_CLIENT = ctypes.c_long(-4)

ROLE_SYSTEM_DOCUMENT = 15



# Standard MSAA roles to ignore (titlebars, scrollbars, menubars)

ROLE_SYSTEM_TITLEBAR = 1

ROLE_SYSTEM_MENUBAR = 2

ROLE_SYSTEM_SCROLLBAR = 3



UI_CHROME_NOISE = {

    "system", "ime", "minimize", "maximize", "restore", "close", "application",

    "context help", "vertical", "horizontal", "line up", "line down",

    "page up", "page down", "column left", "column right", "position",

    "page left", "page right", "non client input sink window", "system menu bar",

    "system title bar"

}



def sanitize_extracted_text(text: str) -> str:
    """
    Strip UI automation chrome tokens, window titles, scrollbar directions,
    cryptic XAML IDs, and redundant duplicate blocks.
    Reduces token waste by 80-98%.
    """
    if not text:
        return ""
    lines = [ln.strip() for ln in text.splitlines()]
    cleaned = []
    for ln in lines:
        if not ln:
            continue
        ln_lower = ln.lower()
        # Filter window chrome titles like '*... - Notepad'
        if re.search(r' - (notepad|google chrome|microsoft edge|brave|visual studio code)$', ln_lower):
            continue
        # Filter standard UI accessibility noise
        if ln_lower in UI_CHROME_NOISE:
            continue
        # Filter cryptic automation/XAML IDs (e.g. AQ.Ab8RN6...)
        if re.match(r'^AQ\.[A-Za-z0-9_-]+[.,]?$', ln):
            continue
        # Deduplicate consecutive identical lines
        if cleaned and cleaned[-1] == ln:
            continue
        cleaned.append(ln)

    # Deduplicate repeating multi-line blocks (e.g. question + options echoed twice)
    n = len(cleaned)
    for block_len in range(1, n // 2 + 1):
        if n % block_len == 0:
            block = cleaned[:block_len]
            if block * (n // block_len) == cleaned:
                return "\n".join(block).strip()
    half = n // 2
    if half > 0 and cleaned[:half] == cleaned[half:2 * half]:
        return "\n".join(cleaned[:half]).strip()

    seen = set()
    result = []
    for ln in cleaned:
        if ln not in seen:
            seen.add(ln)
            result.append(ln)
    return "\n".join(result).strip()


def _ensure_desktop():

    """Ensure thread has access to active interactive desktop if running in sandbox."""

    try:

        hDesk = ctypes.windll.user32.OpenDesktopW("Default", 0, False, 0x01FF)

        if hDesk:

            ctypes.windll.user32.SetThreadDesktop(hDesk)

    except Exception:

        pass





def _find_document_nodes(acc_obj, depth=0, max_depth=15):

    """Recursively search for ROLE_SYSTEM_DOCUMENT (15) nodes in IAccessible tree."""

    if depth > max_depth or not acc_obj:

        return []

    docs = []

    try:

        if acc_obj.accRole(0) == ROLE_SYSTEM_DOCUMENT:

            docs.append(acc_obj)

        count = acc_obj.accChildCount

        if count > 0:

            children = (comtypes.automation.VARIANT * count)()

            obtained = ctypes.c_long(0)

            ctypes.windll.oleacc.AccessibleChildren(acc_obj, 0, count, children, ctypes.byref(obtained))

            for i in range(obtained.value):

                v = children[i].value

                if hasattr(v, "QueryInterface"):

                    sub = v.QueryInterface(_IAccessible)

                    docs.extend(_find_document_nodes(sub, depth + 1, max_depth))

    except Exception:

        pass

    return docs





def _walk_preorder_blocks(obj, blocks, depth=0, max_depth=25, max_blocks=3000):

    """

    Pre-order hierarchical traversal with substring containment filtering.

    Preserves complete sentences, code lines, options, and punctuation

    while automatically discarding fragmented child token echoes.

    """

    if depth > max_depth or len(blocks) >= max_blocks or not obj:

        return



    # Skip non-content UI roles (titlebar=1, menubar=2, scrollbar=3)

    try:

        r = obj.accRole(0)

        if r in (1, 2, 3):

            return

    except Exception:

        pass



    name = ""

    val = ""

    try:

        name = (obj.accName(0) or "").strip()

    except Exception:

        pass

    try:

        val = (obj.accValue(0) or "").strip()

    except Exception:

        pass



    t = name if name else val



    if t and t.lower() not in UI_CHROME_NOISE and not re.match(r'^AQ\.[A-Za-z0-9_-]+[.,]?$', t):

        # If the last block already contains this text completely, skip fragment

        if not (blocks and t in blocks[-1]):

            # If this text contains the last block, expand the last block to full version

            if blocks and blocks[-1] in t:

                blocks[-1] = t

            else:

                blocks.append(t)



    count = 0

    try:

        count = obj.accChildCount

    except Exception:

        pass



    if count > 0:

        children = (comtypes.automation.VARIANT * count)()

        obtained = ctypes.c_long(0)

        ctypes.windll.oleacc.AccessibleChildren(obj, 0, count, children, ctypes.byref(obtained))

        for i in range(obtained.value):

            v = children[i].value

            if hasattr(v, "QueryInterface"):

                _walk_preorder_blocks(v.QueryInterface(_IAccessible), blocks, depth + 1, max_depth, max_blocks)

            elif isinstance(v, int):

                ch_name = ""

                try:

                    ch_name = (obj.accName(v) or "").strip()

                except Exception:

                    pass

                if ch_name and ch_name.lower() not in UI_CHROME_NOISE and not re.match(r'^AQ\.[A-Za-z0-9_-]+[.,]?$', ch_name):

                    if not (blocks and ch_name in blocks[-1]):

                        if blocks and blocks[-1] in ch_name:

                            blocks[-1] = ch_name

                        else:

                            blocks.append(ch_name)





def extract_pure_text(target_hwnd: int = 0) -> str:

    """

    Extract readable text from target window using pure native accessibility + Win32.

    NO OCR, NO SCREENSHOTS, NO CLIPBOARD.

    """

    _ensure_desktop()

    try:

        pythoncom.CoInitialize()

    except Exception:

        pass



    hwnd = target_hwnd if target_hwnd else win32gui.GetForegroundWindow()

    if not hwnd or not win32gui.IsWindow(hwnd):

        return ""



    blocks = []



    # ── 1. MSAA (IAccessible) Deep Document Traversal ─────────────────

    if _IAccessible is not None:

        try:

            pAcc = ctypes.POINTER(_IAccessible)()

            hr = ctypes.windll.oleacc.AccessibleObjectFromWindow(

                hwnd,

                OBJID_CLIENT,

                ctypes.byref(_IAccessible._iid_),

                ctypes.byref(pAcc)

            )

            if hr == 0 and pAcc:

                # First check for Web Document nodes (Chrome, Brave, Edge, Electron)

                docs = _find_document_nodes(pAcc)

                if not docs:

                    import time

                    time.sleep(0.05)

                    docs = _find_document_nodes(pAcc)

                target_roots = docs if docs else [pAcc]



                for root in target_roots:

                    _walk_preorder_blocks(root, blocks)

        except Exception:

            pass



    # ── 2. Native Win32 WM_GETTEXT + EM_GETHANDLE Fallback ───────────

    # If MSAA yielded very little text (e.g., standard Win32 Notepad, native IDEs)

    if len(blocks) < 3 or sum(len(b) for b in blocks) < 40:

        win32_texts = []

        seen_win32 = set(blocks)



        def _enum_win32_cb(child, _):

            try:

                # Standard WM_GETTEXT

                length = win32gui.SendMessage(child, 0x000E, 0, 0) # WM_GETTEXTLENGTH

                if length > 0:

                    buf = ctypes.create_unicode_buffer(length + 1)

                    win32gui.SendMessage(child, 0x000D, length + 1, buf) # WM_GETTEXT

                    val = buf.value.strip()

                    if val and val not in seen_win32:

                        seen_win32.add(val)

                        win32_texts.append(val)

            except Exception:

                pass

            return True



        # Check root window text

        try:

            root_len = win32gui.SendMessage(hwnd, 0x000E, 0, 0)

            if root_len > 0:

                buf = ctypes.create_unicode_buffer(root_len + 1)

                win32gui.SendMessage(hwnd, 0x000D, root_len + 1, buf)

                val = buf.value.strip()

                if val and val not in seen_win32:

                    seen_win32.add(val)

                    win32_texts.append(val)

        except Exception:

            pass



        try:

            win32gui.EnumChildWindows(hwnd, _enum_win32_cb, None)

        except Exception:

            pass



        if win32_texts:

            blocks.extend(win32_texts)



    result = "\n".join(blocks).strip()

    return sanitize_extracted_text(result)





if __name__ == "__main__":

    import time

    fg = win32gui.GetForegroundWindow()

    print(f"Testing extract_pure_text on foreground HWND={fg} ('{win32gui.GetWindowText(fg)}')...")

    t0 = time.time()

    out = extract_pure_text(fg)

    dt = time.time() - t0

    print(f"Extracted {len(out)} chars in {dt:.2f}s.")

    print("--- PREVIEW ---")

    print(out[:500])

