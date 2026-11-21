# -*- coding: utf-8 -*-
"""
text_extractor.py — Hardened Native Windows Screen Text Extractor (v1.1.0)
========================================================================
100% PURE TEXT — ZERO OCR, ZERO SCREENSHOTS/IMAGES, ZERO CLIPBOARD.
Extracts live text from active windows (Chromium, Brave, Chrome, Edge,
Electron, VS Code, Monaco, Scintilla, native Win32 apps, IDEs, proctoring browsers) using:
  1. Windows MSAA (oleacc.dll) IAccessible COM hierarchy.
  2. Multi-tier Chromium accessibility wake-up with polling retry.
  3. Child HWND enumeration fallback for hosted webviews and iframes.
  4. Token-safe pre-order containment de-fragmentation (never eats MCQ options or punctuation).
  5. Dual accName + accValue inspection (captures editor buffers stored in accValue).
  6. Non-blocking SendMessageTimeoutW + Scintilla editor support.
"""
import ctypes
import ctypes.wintypes
import win32gui
import win32con
import win32process
import pythoncom
import comtypes
import comtypes.client
import tempfile
import os
import re
import time

# Ensure comtypes generates interface wrappers in a writable temp directory
try:
    _temp_gen = os.path.join(tempfile.gettempdir(), "comtypes_gen")
    os.makedirs(_temp_gen, exist_ok=True)
    comtypes.client.gen_dir = _temp_gen
except Exception:
    pass

from comtypes.client import GetModule

# Pre-load oleacc COM module
try:
    _oleacc_mod = GetModule("oleacc.dll")
    _IAccessible = _oleacc_mod.IAccessible
except Exception:
    _IAccessible = None

OBJID_CLIENT = ctypes.c_long(-4)
ROLE_SYSTEM_DOCUMENT = 15
ROLE_SYSTEM_PANE = 16
ROLE_SYSTEM_GROUPING = 20
ROLE_SYSTEM_TEXT = 42
ROLE_SYSTEM_CLIENT = 10
ROLE_SYSTEM_WINDOW = 9

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

# Win32 SendMessageTimeout constants
SMTO_NORMAL = 0x0000
SMTO_BLOCK = 0x0001
SMTO_ABORTIFHUNG = 0x0002

# Scintilla editor message constants
SCI_GETTEXTLENGTH = 2183
SCI_GETTEXT = 2182


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
        # Filter window chrome titles or stand-alone browser names
        if ln_lower in ("google chrome", "microsoft edge", "brave", "visual studio code", "notepad"):
            continue
        if re.search(r' - (notepad|google chrome|microsoft edge|brave|visual studio code)$', ln_lower):
            continue
        # Filter standard UI accessibility noise
        if ln_lower in UI_CHROME_NOISE:
            continue
        # Filter cryptic automation/XAML IDs (e.g. AQ.Ab8RN6...)
        if re.match(r'^AQ\.[A-Za-z0-9_-]+[.,]*$', ln):
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
    """Ensure thread has access to active interactive desktop and window station."""
    try:
        u32 = ctypes.windll.user32
        hwinsta = u32.OpenWindowStationW("WinSta0", False, 0x037F)
        if hwinsta:
            u32.SetProcessWindowStation(hwinsta)
        hDesk = u32.OpenDesktopW("Default", 0, False, 0x01FF)
        if hDesk:
            u32.SetThreadDesktop(hDesk)
    except Exception:
        pass


def _find_content_nodes(acc_obj, depth=0, max_depth=15):
    """
    Recursively search for content nodes (ROLE_SYSTEM_DOCUMENT=15, ROLE_SYSTEM_PANE=16)
    in IAccessible tree with safe child limit clamping.
    """
    if depth > max_depth or not acc_obj:
        return []
    docs = []
    try:
        role = acc_obj.accRole(0)
        if role == ROLE_SYSTEM_DOCUMENT:
            # Document root found — this is the gold standard for web views
            return [acc_obj]

        count = acc_obj.accChildCount
        if count > 0:
            # Clamp to prevent runaway COM calls on massive DOMs
            count = min(max(0, count), 300)
            children = (comtypes.automation.VARIANT * count)()
            obtained = ctypes.c_long(0)
            hr = ctypes.windll.oleacc.AccessibleChildren(acc_obj, 0, count, children, ctypes.byref(obtained))
            if hr == 0:
                for i in range(obtained.value):
                    v = children[i].value
                    if hasattr(v, "QueryInterface"):
                        try:
                            sub = v.QueryInterface(_IAccessible)
                            sub_docs = _find_content_nodes(sub, depth + 1, max_depth)
                            if sub_docs:
                                docs.extend(sub_docs)
                                # Once a document root is found, return early
                                if len(docs) >= 5:
                                    break
                        except Exception:
                            pass
    except Exception:
        pass
    return docs


def _walk_preorder_blocks(obj, blocks, depth=0, max_depth=25, max_blocks=3000):
    """
    Pre-order hierarchical traversal with token-safe containment filtering.
    Reads both accName and accValue (e.g. Monaco code buffers stored in accValue).
    Preserves complete sentences, code lines, options, and punctuation
    while automatically discarding fragmented child token echoes.
    """
    if depth > max_depth or len(blocks) >= max_blocks or not obj:
        return

    # Skip non-content UI roles (titlebar=1, menubar=2, scrollbar=3)
    try:
        r = obj.accRole(0)
        if r in (ROLE_SYSTEM_TITLEBAR, ROLE_SYSTEM_MENUBAR, ROLE_SYSTEM_SCROLLBAR):
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

    # Determine best text candidate
    # In Monaco / code editors: name is often "Code editor" while val is the entire code buffer
    t = ""
    if val and len(val) > len(name) and ("\n" in val or len(val) > 30):
        t = val
    elif name and val and name != val:
        # Both exist and differ — if val is not a substring of name, prioritize val or combine
        t = val if len(val) > len(name) else name
    else:
        t = name or val

    if t and t.lower() not in UI_CHROME_NOISE and not re.match(r'^AQ\.[A-Za-z0-9_-]+[.,]*$', t):
        if blocks:
            prev = blocks[-1]
            if t == prev:
                pass  # duplicate, skip
            elif len(t) >= 4 and t in prev:
                # True fragment containment: only skip when t is at least 4 chars long and contained in prev
                pass
            elif prev in t:
                # Expansion: t contains the full version of the previous partial block
                blocks[-1] = t
            else:
                blocks.append(t)
        else:
            blocks.append(t)

    count = 0
    try:
        count = obj.accChildCount
    except Exception:
        pass
    if count > 0:
        count = min(max(0, count), 500)
        children = (comtypes.automation.VARIANT * count)()
        obtained = ctypes.c_long(0)
        try:
            hr = ctypes.windll.oleacc.AccessibleChildren(obj, 0, count, children, ctypes.byref(obtained))
            if hr == 0:
                for i in range(obtained.value):
                    try:
                        v = children[i].value
                        if hasattr(v, "QueryInterface"):
                            _walk_preorder_blocks(v.QueryInterface(_IAccessible), blocks, depth + 1, max_depth, max_blocks)
                        elif isinstance(v, int):
                            ch_name = ""
                            ch_val = ""
                            try:
                                ch_name = (obj.accName(v) or "").strip()
                            except Exception:
                                pass
                            try:
                                ch_val = (obj.accValue(v) or "").strip()
                            except Exception:
                                pass
                            ch_t = ch_val if (ch_val and len(ch_val) > len(ch_name)) else (ch_name or ch_val)
                            if ch_t and ch_t.lower() not in UI_CHROME_NOISE and not re.match(r'^AQ\.[A-Za-z0-9_-]+[.,]*$', ch_t):
                                if blocks:
                                    prev = blocks[-1]
                                    if ch_t == prev:
                                        pass
                                    elif len(ch_t) >= 4 and ch_t in prev:
                                        pass
                                    elif prev in ch_t:
                                        blocks[-1] = ch_t
                                    else:
                                        blocks.append(ch_t)
                                else:
                                    blocks.append(ch_t)
                    except Exception:
                        pass
        except Exception:
            pass


def _query_msaa_from_hwnd(hwnd: int, blocks: list) -> bool:
    """Query IAccessible for a specific HWND, locate document nodes, and walk blocks."""
    if _IAccessible is None or not hwnd or not win32gui.IsWindow(hwnd):
        return False
    try:
        pAcc = ctypes.POINTER(_IAccessible)()
        hr = ctypes.windll.oleacc.AccessibleObjectFromWindow(
            hwnd,
            OBJID_CLIENT,
            ctypes.byref(_IAccessible._iid_),
            ctypes.byref(pAcc)
        )
        if hr == 0 and pAcc:
            # 1. Search for document roots
            docs = _find_content_nodes(pAcc)
            # 2. Chromium lazy accessibility wake-up retry loop:
            # If docs is empty on a web window, Chromium may still be constructing BrowserAccessibilityManager.
            if not docs:
                for backoff in (0.06, 0.12, 0.18):
                    time.sleep(backoff)
                    try:
                        pAccNew = ctypes.POINTER(_IAccessible)()
                        if ctypes.windll.oleacc.AccessibleObjectFromWindow(
                            hwnd, OBJID_CLIENT, ctypes.byref(_IAccessible._iid_), ctypes.byref(pAccNew)
                        ) == 0 and pAccNew:
                            pAcc = pAccNew
                    except Exception:
                        pass
                    docs = _find_content_nodes(pAcc)
                    if docs:
                        break

            target_roots = docs if docs else [pAcc]
            initial_count = len(blocks)
            for root in target_roots:
                _walk_preorder_blocks(root, blocks)
            return len(blocks) > initial_count
    except Exception:
        pass
    return False


def _safe_send_message_timeout(hwnd: int, msg: int, wparam: int, lparam: any, timeout_ms: int = 250):
    """Safe SendMessage with timeout to prevent hanging on unresponsive windows."""
    result = ctypes.c_ulong(0)
    res = ctypes.windll.user32.SendMessageTimeoutW(
        hwnd,
        msg,
        wparam,
        lparam,
        SMTO_ABORTIFHUNG | SMTO_NORMAL,
        timeout_ms,
        ctypes.byref(result)
    )
    return res != 0, result.value


def _extract_scintilla_text(hwnd: int) -> str:
    """Extract text from Scintilla editor controls (Notepad++, Code::Blocks, Geany)."""
    try:
        ok, length = _safe_send_message_timeout(hwnd, SCI_GETTEXTLENGTH, 0, 0, 200)
        if ok and length > 0:
            buf = ctypes.create_string_buffer(length + 1)
            ok2, _ = _safe_send_message_timeout(hwnd, SCI_GETTEXT, length + 1, buf, 300)
            if ok2:
                return buf.value.decode('utf-8', errors='replace').strip()
    except Exception:
        pass
    return ""


def _extract_win32_control_text(hwnd: int) -> str:
    """Safe non-blocking extraction of text from native Win32 controls."""
    try:
        ok, length = _safe_send_message_timeout(hwnd, 0x000E, 0, 0, 200)  # WM_GETTEXTLENGTH
        if ok and length > 0:
            buf = ctypes.create_unicode_buffer(length + 1)
            ok2, _ = _safe_send_message_timeout(hwnd, 0x000D, length + 1, buf, 250)  # WM_GETTEXT
            if ok2 and buf.value:
                return buf.value.strip()
    except Exception:
        pass
    return ""


def _is_valid_target(hwnd: int, my_pid: int) -> bool:
    """Validate whether an HWND is a suitable non-TITAN target window."""
    if not hwnd or not win32gui.IsWindow(hwnd) or win32gui.IsIconic(hwnd) or not win32gui.IsWindowVisible(hwnd):
        return False
    try:
        _, pid = win32process.GetWindowThreadProcessId(hwnd)
        if pid == my_pid:
            return False
        cls = win32gui.GetClassName(hwnd)
        if cls in ("Shell_TrayWnd", "Progman", "WorkerW", "Windows.UI.Core.CoreWindow", "Microsoft.UI.Content.PopupWindowSiteBridge", "Qt5152QWindowIcon"):
            return False
        rect = win32gui.GetWindowRect(hwnd)
        w = rect[2] - rect[0]
        h = rect[3] - rect[1]
        if w < 60 or h < 60:
            return False
        return True
    except Exception:
        return False


def _resolve_target_window(target_hwnd: int = 0) -> int:
    """
    Intelligently resolve the true target window:
    1. If target_hwnd is valid, visible, and not our own process, use it.
    2. Else try GetForegroundWindow() if it is not our own process or a shell window.
    3. Else fallback to enumerating interactive desktop windows in Z-order.
    """
    _ensure_desktop()
    my_pid = os.getpid()

    if target_hwnd and _is_valid_target(target_hwnd, my_pid):
        return target_hwnd

    fg = win32gui.GetForegroundWindow()
    if fg and _is_valid_target(fg, my_pid):
        return fg

    # Topmost search across active interactive desktop (Z-order)
    candidates = []
    def _enum_top(h, _):
        if _is_valid_target(h, my_pid):
            title = win32gui.GetWindowText(h)
            if title:
                candidates.append(h)
        return True

    try:
        u32 = ctypes.windll.user32
        hdesk = u32.OpenDesktopW("Default", 0, False, 0x01FF)
        if hdesk:
            win32gui.EnumDesktopWindows(hdesk, _enum_top, 0)
        else:
            win32gui.EnumWindows(_enum_top, None)
        if candidates:
            return candidates[0]
    except Exception:
        pass

    return 0


def extract_pure_text(target_hwnd: int = 0) -> str:
    """
    Extract readable text from target window using pure native accessibility + Win32.
    NO OCR, NO SCREENSHOTS, NO CLIPBOARD.
    """
    _ensure_desktop()

    com_initialized = False
    try:
        pythoncom.CoInitialize()
        com_initialized = True
    except Exception:
        pass

    try:
        hwnd = _resolve_target_window(target_hwnd)
        if not hwnd or not win32gui.IsWindow(hwnd):
            return ""

        blocks = []

        # ── 1. MSAA (IAccessible) Deep Traversal on Root Window ───────
        root_success = _query_msaa_from_hwnd(hwnd, blocks)

        # ── 2. Child HWND Traversal for Embedded WebViews / Iframes ──
        # If the root HWND yielded < 3 blocks or < 40 chars, check child windows.
        # This handles cases where Chrome/Electron hosts the webview in a child HWND.
        current_len = sum(len(b) for b in blocks)
        if len(blocks) < 3 or current_len < 40:
            child_hwnds = []
            def _find_children(c, _):
                child_hwnds.append(c)
                return True
            try:
                win32gui.EnumChildWindows(hwnd, _find_children, None)
            except Exception:
                pass

            for child in child_hwnds:
                cls_name = win32gui.GetClassName(child).lower()
                # Scintilla editors (Notepad++, IDEs)
                if "scintilla" in cls_name:
                    sc_txt = _extract_scintilla_text(child)
                    if sc_txt and sc_txt not in blocks:
                        blocks.append(sc_txt)
                # Query MSAA on child windows that might host webviews
                elif any(k in cls_name for k in ("chrome", "widget", "render", "document", "view", "panel", "content")):
                    _query_msaa_from_hwnd(child, blocks)
                    if sum(len(b) for b in blocks) > 100:
                        break

        # ── 3. Native Win32 WM_GETTEXT Fallback ───────────────────────
        current_len = sum(len(b) for b in blocks)
        if len(blocks) < 3 or current_len < 40:
            seen_win32 = set(blocks)
            win32_texts = []

            # Check root window text
            root_txt = _extract_win32_control_text(hwnd)
            if root_txt and root_txt not in seen_win32:
                seen_win32.add(root_txt)
                win32_texts.append(root_txt)

            # Check all children with non-blocking timeout
            def _enum_win32_cb(child, _):
                txt = _extract_win32_control_text(child)
                if txt and txt not in seen_win32:
                    seen_win32.add(txt)
                    win32_texts.append(txt)
                return True

            try:
                win32gui.EnumChildWindows(hwnd, _enum_win32_cb, None)
            except Exception:
                pass

            if win32_texts:
                blocks.extend(win32_texts)

        result = "\n".join(blocks).strip()
        return sanitize_extracted_text(result)

    finally:
        if com_initialized:
            try:
                pythoncom.CoUninitialize()
            except Exception:
                pass


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
