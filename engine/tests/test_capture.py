"""
capture_tool.py — 5-strategy capture tool with GUI
===================================================
Alt+1  WM_GETTEXT shallow
Alt+2  WM_GETTEXT deep (recursive GetWindow)
Alt+3  EM_GETHANDLE (edit controls)
Alt+4  IAccessible / MSAA via oleacc.dll
Alt+5  Combined — runs all 4, picks longest result
Alt+6  pywinauto UIA (confirmed working on Neo Browser)
Alt+H  Show / Hide the GUI window
Alt+Q  Quit

Output: %APPDATA%\titan_captures.json  (appends)
        %APPDATA%\capture_out.txt      (overwrites)

Build:
    pip install pyinstaller pywin32
    pyinstaller --onefile --noconsole --hidden-import=tkinter ^
        --hidden-import=tkinter.ttk --name capture_tool capture_tool.py
"""

import ctypes
import ctypes.wintypes as wt
import json
import os
import queue
import sys
import threading
import time
import tkinter as tk
from tkinter import scrolledtext

try:
    import win32gui
except ImportError:
    ctypes.windll.user32.MessageBoxW(0, "pip install pywin32", "Error", 0x10)
    sys.exit(1)

# ── Output ────────────────────────────────────────────────────────────
_APPDATA    = os.environ.get("APPDATA", os.path.expanduser("~"))
OUTPUT_JSON = os.path.join(_APPDATA, "titan_captures.json")
OUTPUT_TXT  = os.path.join(_APPDATA, "capture_out.txt")

# ── Hotkeys ───────────────────────────────────────────────────────────
WM_HOTKEY = 0x0312
MOD_ALT   = 0x0001
VK_MAP = {
    1: 0x31,   # Alt+1  capture S1
    2: 0x32,   # Alt+2  capture S2
    3: 0x33,   # Alt+3  capture S3
    4: 0x34,   # Alt+4  capture S4
    5: 0x35,   # Alt+5  combined
    6: 0x36,   # Alt+6  pywinauto UIA
    8: 0x48,   # Alt+H  toggle GUI
    9: 0x51,   # Alt+Q  quit
}

# ── Win32 constants ───────────────────────────────────────────────────
_WM_GETTEXT       = 0x000D
_WM_GETTEXTLENGTH = 0x000E
_EM_GETHANDLE     = 0x00BD
_NATIVE_EDIT_CLS  = {"edit","richedit","richedit20a","richedit20w","richedit50w","msftedit_class"}

# ── IAccessible (MSAA) setup ──────────────────────────────────────────
try:
    _oleacc = ctypes.WinDLL("oleacc.dll")
    _ole32  = ctypes.WinDLL("ole32.dll")
    _ole32.CoInitialize(None)

    class _GUID(ctypes.Structure):
        _fields_ = [("D1",ctypes.c_uint32),("D2",ctypes.c_uint16),
                    ("D3",ctypes.c_uint16),("D4",ctypes.c_uint8*8)]

    _IID_IAccessible = _GUID(0x618736E0,0x3C3D,0x11CF,
                              (ctypes.c_uint8*8)(0x81,0x0C,0x00,0xAA,0x00,0x38,0x9B,0x71))

    # vtable slot indices in IAccessible (IUnknown=0-2, IDispatch=3-6, then IAccessible)
    _V_CHILD_COUNT = 8   # get_accChildCount
    _V_CHILD       = 9   # get_accChild
    _V_NAME        = 10  # get_accName
    _V_VALUE       = 11  # get_accValue
    _V_RELEASE     = 2   # Release

    def _vtbl_call(ptr, slot, *args):
        """Call COM vtable method by slot index."""
        vtbl = ctypes.cast(ptr, ctypes.POINTER(ctypes.c_void_p))
        fn   = ctypes.cast(vtbl[slot], ctypes.c_void_p)
        return fn, vtbl

    def _bstr_to_str(bstr_ptr) -> str:
        if not bstr_ptr:
            return ""
        try:
            return ctypes.wstring_at(bstr_ptr)
        except Exception:
            return ""

    def _acc_get_name_value(ptr) -> list:
        """Extract accName and accValue from a raw IAccessible COM pointer."""
        results = []
        VARIANT = (ctypes.c_longlong * 4)()
        VARIANT[0] = 0  # VT_EMPTY / CHILDID_SELF

        # get_accName(CHILDID_SELF, pbstrName)
        bstr = ctypes.c_void_p()
        vtbl = ctypes.cast(ptr, ctypes.POINTER(ctypes.c_void_p))
        try:
            fn_name = ctypes.WINFUNCTYPE(
                ctypes.HRESULT, ctypes.c_void_p,
                ctypes.c_longlong*4, ctypes.POINTER(ctypes.c_void_p)
            )(vtbl[_V_NAME])
            if fn_name(ptr, VARIANT, ctypes.byref(bstr)) == 0 and bstr.value:
                t = _bstr_to_str(bstr.value)
                if t.strip():
                    results.append(t.strip())
        except Exception:
            pass

        # get_accValue(CHILDID_SELF, pbstrValue)
        bstr2 = ctypes.c_void_p()
        try:
            fn_val = ctypes.WINFUNCTYPE(
                ctypes.HRESULT, ctypes.c_void_p,
                ctypes.c_longlong*4, ctypes.POINTER(ctypes.c_void_p)
            )(vtbl[_V_VALUE])
            if fn_val(ptr, VARIANT, ctypes.byref(bstr2)) == 0 and bstr2.value:
                t = _bstr_to_str(bstr2.value)
                if t.strip():
                    results.append(t.strip())
        except Exception:
            pass

        return results

    def _acc_child_count(ptr) -> int:
        vtbl = ctypes.cast(ptr, ctypes.POINTER(ctypes.c_void_p))
        count = ctypes.c_long(0)
        try:
            fn = ctypes.WINFUNCTYPE(
                ctypes.HRESULT, ctypes.c_void_p, ctypes.POINTER(ctypes.c_long)
            )(vtbl[_V_CHILD_COUNT])
            fn(ptr, ctypes.byref(count))
        except Exception:
            pass
        return count.value

    _IACCESSIBLE_OK = True
except Exception:
    _IACCESSIBLE_OK = False


# ════════════════════ STRATEGIES ════════════════════════════════════

def _wm_text(hwnd: int) -> str:
    try:
        n = win32gui.SendMessage(hwnd, _WM_GETTEXTLENGTH, 0, 0)
        if n <= 0:
            return ""
        buf = ctypes.create_unicode_buffer(n + 1)
        ctypes.windll.user32.SendMessageW(hwnd, _WM_GETTEXT, n + 1, buf)
        return buf.value.strip()
    except Exception:
        return ""

def _hwnd_class(hwnd: int) -> str:
    try:
        return win32gui.GetClassName(hwnd).lower()
    except Exception:
        return ""


# — S1: WM_GETTEXT Shallow —
def s1_wm_shallow(hwnd: int) -> dict:
    results = []; scanned = [0]
    def cb(child, _):
        scanned[0] += 1
        t = _wm_text(child)
        if t and len(t) > 2:
            results.append(t)
        return True
    root = _wm_text(hwnd)
    if root and len(root) > 2:
        results.insert(0, root)
    try:
        win32gui.EnumChildWindows(hwnd, cb, None)
    except Exception:
        pass
    text = "\n".join(results).strip()
    return {"strategy":"WM_GETTEXT_Shallow","children_scanned":scanned[0],
            "nodes_found":len(results),"chars":len(text),"text":text}


# — S2: WM_GETTEXT Deep (manual GetWindow recursion) —
def s2_wm_deep(hwnd: int) -> dict:
    GW_CHILD=5; GW_HWNDNEXT=2
    results=[]; visited=set(); tried=[0]

    def walk(h, depth=0):
        if not h or h in visited or tried[0] > 1500 or depth > 15:
            return
        visited.add(h); tried[0] += 1
        cls = _hwnd_class(h)
        t   = _wm_text(h)
        if t and len(t) > 2:
            results.append({"cls":cls,"text":t,"depth":depth})
        child = ctypes.windll.user32.GetWindow(h, GW_CHILD)
        walk(child, depth+1)
        sib = ctypes.windll.user32.GetWindow(h, GW_HWNDNEXT)
        walk(sib, depth)

    root_t = _wm_text(hwnd)
    if root_t and len(root_t) > 2:
        results.append({"cls":_hwnd_class(hwnd),"text":root_t,"depth":0})
    walk(ctypes.windll.user32.GetWindow(hwnd, GW_CHILD), 1)

    results.sort(key=lambda x: len(x["text"]), reverse=True)
    all_text = "\n".join(r["text"] for r in results).strip()
    cls_summary = {}
    for r in results:
        cls_summary[r["cls"]] = cls_summary.get(r["cls"],0)+1

    return {"strategy":"WM_GETTEXT_Deep","nodes_tried":tried[0],
            "nodes_found":len(results),"class_summary":cls_summary,
            "chars":len(all_text),"text":all_text,
            "node_detail":[{"cls":r["cls"],"depth":r["depth"],
                            "len":len(r["text"]),"preview":r["text"][:100]}
                           for r in results[:8]]}


# — S3: EM_GETHANDLE —
def s3_em(hwnd: int) -> dict:
    results=[]; edit_count=[0]
    def cb(child, _):
        if _hwnd_class(child) in _NATIVE_EDIT_CLS:
            edit_count[0] += 1
            t = _wm_text(child)
            if t:
                results.append(t); return True
            try:
                hmem = ctypes.windll.user32.SendMessageW(child, _EM_GETHANDLE, 0, 0)
                if hmem:
                    ptr = ctypes.windll.kernel32.LocalLock(hmem)
                    if ptr:
                        v = ctypes.wstring_at(ptr).strip()
                        ctypes.windll.kernel32.LocalUnlock(hmem)
                        if v: results.append(v)
            except Exception:
                pass
        return True
    try:
        win32gui.EnumChildWindows(hwnd, cb, None)
    except Exception:
        pass
    text = "\n".join(results).strip()
    return {"strategy":"EM_GETHANDLE","edit_controls":edit_count[0],
            "nodes_found":len(results),"chars":len(text),"text":text}


# — S4: IAccessible (MSAA) —
def s4_iaccessible(hwnd: int) -> dict:
    if not _IACCESSIBLE_OK:
        return {"strategy":"IAccessible_MSAA","error":"oleacc unavailable",
                "chars":0,"text":""}

    texts = []; nodes=[0]

    def traverse(ptr, depth=0):
        if not ptr or nodes[0] > 500 or depth > 12:
            return
        nodes[0] += 1
        for t in _acc_get_name_value(ptr):
            if len(t) > 2:
                texts.append(t)
        count = _acc_child_count(ptr)
        if count > 0:
            vtbl = ctypes.cast(ptr, ctypes.POINTER(ctypes.c_void_p))
            try:
                fn = ctypes.WINFUNCTYPE(
                    ctypes.HRESULT, ctypes.c_void_p,
                    ctypes.c_longlong*4, ctypes.POINTER(ctypes.c_void_p)
                )(vtbl[_V_CHILD])
                for i in range(1, min(count+1, 64)):
                    VARIANT = (ctypes.c_longlong*4)()
                    VARIANT[0] = i
                    child_ptr = ctypes.c_void_p()
                    if fn(ptr, VARIANT, ctypes.byref(child_ptr)) == 0 and child_ptr.value:
                        traverse(child_ptr.value, depth+1)
                        # Release child
                        try:
                            vtbl2 = ctypes.cast(child_ptr.value, ctypes.POINTER(ctypes.c_void_p))
                            rel = ctypes.WINFUNCTYPE(ctypes.c_ulong, ctypes.c_void_p)(vtbl2[_V_RELEASE])
                            rel(child_ptr.value)
                        except Exception:
                            pass
            except Exception:
                pass

    root_ptr = ctypes.c_void_p()
    hr = _oleacc.AccessibleObjectFromWindow(
        hwnd, 0xFFFFFFFC,
        ctypes.byref(_IID_IAccessible),
        ctypes.byref(root_ptr)
    )
    if hr == 0 and root_ptr.value:
        traverse(root_ptr.value)
        try:
            vtbl = ctypes.cast(root_ptr.value, ctypes.POINTER(ctypes.c_void_p))
            rel = ctypes.WINFUNCTYPE(ctypes.c_ulong, ctypes.c_void_p)(vtbl[_V_RELEASE])
            rel(root_ptr.value)
        except Exception:
            pass
    else:
        return {"strategy":"IAccessible_MSAA","hr_hex":hex(hr & 0xFFFFFFFF),
                "error":"AccessibleObjectFromWindow failed — browser may block MSAA",
                "chars":0,"text":""}

    text = "\n".join(texts).strip()
    return {"strategy":"IAccessible_MSAA","nodes_traversed":nodes[0],
            "nodes_found":len(texts),"chars":len(text),"text":text}


# — S5: Combined (all 4, pick longest) —
def s5_combined(hwnd: int) -> dict:
    r1 = s1_wm_shallow(hwnd)
    r2 = s2_wm_deep(hwnd)
    r3 = s3_em(hwnd)
    r4 = s4_iaccessible(hwnd)
    best = max([r1,r2,r3,r4], key=lambda r: r["chars"])
    return {"strategy":"Combined_Best","winner":best["strategy"],
            "chars":best["chars"],"text":best["text"],
            "all_lengths":{r["strategy"]:r["chars"] for r in [r1,r2,r3,r4]}}



# — S6: pywinauto UIAutomation with auto-focus —
def s6_uia(hwnd: int) -> dict:
    """
    Uses pywinauto's UIA backend (IUIAutomation COM interface).
    Before scanning, injects focus into Chrome_RenderWidgetHostHWND via
    AttachThreadInput so the accessibility tree is fully populated
    without requiring the user to manually click the page.
    """
    try:
        import pythoncom
        import win32api
        import win32process
        from pywinauto import Application
    except ImportError as e:
        return {"strategy":"pywinauto_UIA","error":f"missing dep: {e}",
                "chars":0,"text":""}

    try:
        pythoncom.CoInitialize()
    except Exception:
        pass

    try:
        # ── Step 1: auto-focus the Chrome render widget ──────────────
        render_hwnd = None
        found = []
        def _cb(child, _):
            try:
                if win32gui.GetClassName(child) == 'Chrome_RenderWidgetHostHWND':
                    found.append(child)
            except Exception:
                pass
            return True
        try:
            win32gui.EnumChildWindows(hwnd, _cb, None)
        except Exception:
            pass
        render_hwnd = found[0] if found else None
        target = render_hwnd or hwnd

        try:
            ctypes.windll.user32.SetForegroundWindow(hwnd)
            fg_tid  = win32process.GetWindowThreadProcessId(target)[0]
            cur_tid = win32api.GetCurrentThreadId()
            if fg_tid and fg_tid != cur_tid:
                ctypes.windll.user32.AttachThreadInput(cur_tid, fg_tid, True)
                ctypes.windll.user32.SetFocus(target)
                ctypes.windll.user32.AttachThreadInput(cur_tid, fg_tid, False)
            else:
                ctypes.windll.user32.SetFocus(target)
        except Exception:
            pass

        time.sleep(0.10)   # let UIA tree populate after focus

        # ── Step 2: UIA text extraction ──────────────────────────────
        app    = Application(backend='uia').connect(handle=hwnd)
        window = app.window(handle=hwnd)
        elems  = window.descendants(control_type="Text")

        texts = []
        for el in elems:
            try:
                t = el.window_text()
                if t and t.strip() and "Chrome Legacy Window" not in t:
                    texts.append(t.strip())
            except Exception:
                pass

        # ── Step 3: MCQ section filter ───────────────────────────────
        raw = "\n".join(texts)
        return {"strategy":"pywinauto_UIA",
                "render_hwnd_found": render_hwnd is not None,
                "text_nodes_found": len(texts),
                "chars": len(raw),
                "text": raw}

    except Exception as e:
        return {"strategy":"pywinauto_UIA","error":str(e),"chars":0,"text":""}
    finally:
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass


STRATEGIES = {1:s1_wm_shallow, 2:s2_wm_deep, 3:s3_em,
              4:s4_iaccessible, 5:s5_combined, 6:s6_uia}


# ════════════════════ MCQ FILTER ════════════════════════════════════

def _mcq_filter(text: str) -> str:
    lines = text.split("\n"); filtered=[]; in_q=False
    for line in lines:
        if line.strip().lower() == "select the correct answer":
            in_q = True
        if in_q:
            filtered.append(line)
            if line.strip().lower() == "confirmation":
                break
    result = "\n".join(filtered if in_q else lines).strip()
    if "Clicking the 'Submit'" in result:
        result = result[:result.index("Clicking the 'Submit'")]
    return result


# ════════════════════ FILE OUTPUT ═══════════════════════════════════

def save(entry: dict) -> None:
    # JSON — append
    records = []
    if os.path.exists(OUTPUT_JSON):
        try:
            with open(OUTPUT_JSON,"r",encoding="utf-8") as f:
                records = json.load(f)
            if not isinstance(records, list):
                records = []
        except Exception:
            records = []
    records.append(entry)
    with open(OUTPUT_JSON,"w",encoding="utf-8") as f:
        json.dump(records, f, indent=2, ensure_ascii=False)

    # TXT — overwrite
    lines = [
        f"=== TITAN Capture [{entry.get('timestamp','')}] ==",
        f"Hotkey   : {entry.get('hotkey','')}",
        f"Strategy : {entry.get('strategy','')}",
        f"Window   : {entry.get('window_title','')}",
        f"Class    : {entry.get('window_class','')}",
        f"Chars    : {entry.get('chars',0)}",
        "",
        "--- CAPTURED TEXT ---",
        entry.get("filtered_text","") or "(empty)",
        "",
        "--- RAW (first 600) ---",
        entry.get("text","")[:600],
        "="*50,"",
    ]
    with open(OUTPUT_TXT,"w",encoding="utf-8") as f:
        f.write("\n".join(lines))


# ════════════════════ CAPTURE RUNNER ════════════════════════════════

def run_capture(sid: int) -> dict:
    u32   = ctypes.windll.user32
    hwnd  = u32.GetForegroundWindow()
    try:
        title = win32gui.GetWindowText(hwnd)
        cls   = win32gui.GetClassName(hwnd)
    except Exception:
        title = cls = "unknown"

    result = STRATEGIES[sid](hwnd)
    raw    = result.get("text","")
    filt   = _mcq_filter(raw)

    entry = {
        "timestamp":     time.strftime("%Y-%m-%dT%H:%M:%S"),
        "hotkey":        f"Alt+{sid}",
        "window_title":  title,
        "window_class":  cls,
        "hwnd_hex":      f"{hwnd:#010x}",
        **result,
        "filtered_chars": len(filt),
        "filtered_text":  filt,
        "success":        len(raw) > 10,
    }
    save(entry)
    return entry


# ════════════════════ GUI ════════════════════════════════════════════

class App(tk.Tk):
    STATUS_COLORS = {"ready":"#4CAF50","capturing":"#FF9800","ok":"#2196F3","empty":"#f44336"}
    LABELS = {
        1:"Alt+1 — WM_GETTEXT Shallow",
        2:"Alt+2 — WM_GETTEXT Deep",
        3:"Alt+3 — EM_GETHANDLE",
        4:"Alt+4 — IAccessible MSAA",
        5:"Alt+5 — Combined Best",
        6:"Alt+6 — pywinauto UIA (⭐ best for Neo Browser)",
    }

    def __init__(self, q: queue.Queue):
        super().__init__()
        self._q = q
        self.title("TITAN Capture")
        self.geometry("480x360")
        self.resizable(True, True)
        self.attributes("-topmost", True)
        self.configure(bg="#1e1e1e")
        self._build_ui()
        self.after(150, self._poll)

    def _build_ui(self):
        hdr = tk.Frame(self, bg="#1e1e1e")
        hdr.pack(fill=tk.X, padx=8, pady=(8,2))

        self._dot = tk.Label(hdr, text="●", font=("Segoe UI",14),
                             fg=self.STATUS_COLORS["ready"], bg="#1e1e1e")
        self._dot.pack(side=tk.LEFT)

        self._status = tk.Label(hdr, text="  Ready — press Alt+1…5 to capture",
                                font=("Segoe UI",10), fg="#cccccc", bg="#1e1e1e")
        self._status.pack(side=tk.LEFT)

        self._strategy = tk.Label(self, text="", font=("Segoe UI",9),
                                  fg="#888888", bg="#1e1e1e")
        self._strategy.pack(anchor=tk.W, padx=10)

        self._chars = tk.Label(self, text="", font=("Segoe UI",9),
                               fg="#888888", bg="#1e1e1e")
        self._chars.pack(anchor=tk.W, padx=10)

        sep = tk.Frame(self, height=1, bg="#333333")
        sep.pack(fill=tk.X, padx=8, pady=4)

        self._txt = scrolledtext.ScrolledText(
            self, height=12, font=("Consolas",9),
            bg="#252526", fg="#d4d4d4", relief=tk.FLAT,
            insertbackground="#ffffff", wrap=tk.WORD,
        )
        self._txt.pack(fill=tk.BOTH, expand=True, padx=8, pady=(0,8))

        footer = tk.Frame(self, bg="#1e1e1e")
        footer.pack(fill=tk.X, padx=8, pady=(0,6))
        tk.Label(footer, text=f"JSON → {OUTPUT_JSON}",
                 font=("Segoe UI",8), fg="#555555", bg="#1e1e1e").pack(anchor=tk.W)
        tk.Label(footer, text="Alt+6=UIA(best)  Alt+H show/hide  Alt+Q exit",
                 font=("Segoe UI",8), fg="#444444", bg="#1e1e1e").pack(anchor=tk.W)

    def _poll(self):
        try:
            while True:
                msg, data = self._q.get_nowait()
                if msg == "capturing":
                    self._dot.config(fg=self.STATUS_COLORS["capturing"])
                    self._status.config(text=f"  Capturing... ({self.LABELS.get(data,'?')})")
                    self._strategy.config(text="")
                    self._chars.config(text="")
                elif msg == "result":
                    ok      = data.get("success", False)
                    chars   = data.get("chars", 0)
                    strat   = data.get("strategy", "")
                    text    = data.get("filtered_text", "") or data.get("text", "")
                    winner  = data.get("winner","")  # for combined

                    color = self.STATUS_COLORS["ok"] if ok else self.STATUS_COLORS["empty"]
                    self._dot.config(fg=color)
                    status_txt = f"  {'✓' if ok else '✗'} {chars} chars captured"
                    self._status.config(text=status_txt)
                    self._strategy.config(text=f"Strategy: {strat}" +
                                          (f"  |  Winner: {winner}" if winner else ""))
                    self._chars.config(text=f"Filtered: {data.get('filtered_chars',0)} chars  |  "
                                           f"Window: {data.get('window_class','')}")
                    self._txt.delete("1.0", tk.END)
                    self._txt.insert(tk.END, text if text else "(empty — nothing readable from this window)")
                elif msg == "toggle":
                    if self.winfo_viewable():
                        self.withdraw()   # hide
                    else:
                        self.deiconify()  # show
                        self.lift()
                        self.attributes("-topmost", True)
                elif msg == "quit":
                    self.destroy()
                    return
        except queue.Empty:
            pass
        self.after(150, self._poll)


# ════════════════════ HOTKEY THREAD ═════════════════════════════════

def hotkey_loop(q: queue.Queue):
    u32 = ctypes.windll.user32
    for hk_id, vk in VK_MAP.items():
        u32.RegisterHotKey(None, hk_id, MOD_ALT, vk)

    msg = wt.MSG()
    while u32.GetMessageW(ctypes.byref(msg), None, 0, 0) != 0:
        if msg.message == WM_HOTKEY:
            sid = msg.wParam
            if sid == 9:   # Alt+Q — quit
                for hk_id in VK_MAP:
                    u32.UnregisterHotKey(None, hk_id)
                q.put(("quit", None))
                break
            if sid == 8:   # Alt+H — toggle GUI
                q.put(("toggle", None))
            elif sid in STRATEGIES:
                q.put(("capturing", sid))
                try:
                    entry = run_capture(sid)
                    q.put(("result", entry))
                except Exception as e:
                    q.put(("result", {"strategy":"error","chars":0,
                                      "text":str(e),"success":False,
                                      "filtered_text":str(e),"filtered_chars":0,
                                      "window_class":"","winner":""}))
        u32.TranslateMessage(ctypes.byref(msg))
        u32.DispatchMessageW(ctypes.byref(msg))


# ════════════════════ MAIN ═══════════════════════════════════════════

if __name__ == "__main__":
    q = queue.Queue()
    t = threading.Thread(target=hotkey_loop, args=(q,), daemon=True)
    t.start()
    app = App(q)
    app.mainloop()
