# -*- coding: utf-8 -*-
# TITAN - Combined Coding + MCQ Assistant
# API keys + language injected at runtime via stdin pipe from launcher (never written to disk)

import sys
try:
    # 2 is the value used previously in this project (COINIT_MULTITHREADED)
    sys.coinit_flags = 2
except Exception:
    pass
import warnings
import requests
import pythoncom
from PyQt5.QtWidgets import (QApplication, QWidget, QVBoxLayout, QHBoxLayout, QTextEdit,
    QLabel)
from PyQt5.QtCore import Qt, QTimer, QThread, pyqtSignal
from pynput import keyboard
import threading
import ctypes
from collections import deque
import json
import logging
import re
import pyautogui
import time
import random
import win32gui
import win32con
import win32api
import urllib3
import configparser
import os


# ═══════════════════════════════════════════════════
# CODING ASSISTANT
# ═══════════════════════════════════════════════════
# Ensure the Python COM threading model is set before importing pythoncom or creating Qt objects.
# COINIT_MULTITHREADED = 0x0; some libraries expect multithreaded COM. Setting coinits flags
# before pythoncom import can avoid RPC_E_CHANGED_MODE errors.
warnings.filterwarnings("ignore", message="Apply externally defined coinit_flags")

# Disable SSL warnings
urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

# Configure logging (disabled by default for silent exe builds)
logging.basicConfig(level=logging.WARNING, format='%(asctime)s - %(levelname)s - %(message)s')
# Disable all logging output by default so the app/exe runs silently.
logging.disable(logging.CRITICAL)

API_CONFIG_FILE_NAME = "gemini.ini"  # used only for SSL verify setting

# ── Runtime credentials (populated from stdin pipe on startup) ──
# These are the ONLY place keys exist in TITAN's RAM.
# Never read from disk. Wiped automatically when process exits.
_RUNTIME_API_KEYS: list = []
_RUNTIME_LANGUAGE: str  = "Java"
_RUNTIME_MODEL: str     = "gemini"

# Default prompts (overridden by gemini.ini [prompts] section)
_DEFAULT_CODING_PROMPT = (
    "You are a {language} competitive programming expert.\n"
    "OUTPUT RULES (STRICT — violating any rule is a failure):\n"
    "  1. Output ONLY the raw compilable {language} source code. Nothing else.\n"
    "  2. ZERO inline comments. ZERO explanatory comments. Not a single // or /* or #.\n"
    "  3. NO markdown fences (no ``` or ```java etc.). Raw code only.\n"
    "  4. NO prose, NO explanation, NO preamble, NO summary after the code.\n"
    "  5. If template/header/footer is provided, preserve it exactly — fill only the missing logic.\n"
    "  6. If whitelist code is given, USE it. If blacklist code is listed, AVOID those constructs.\n"
    "  7. Handle ALL edge cases. Code MUST pass every hidden test case.\n"
    "  8. Use efficient algorithms (O(n log n) or better). Match exact I/O format.\n"
)

_DEFAULT_MCQ_PROMPT = (
    "You are an expert MCQ solver with deep knowledge in computer science, "
    "mathematics, reasoning, aptitude, and general knowledge.\n\n"
    "INSTRUCTIONS (follow EXACTLY):\n"
    "1. Read the question and ALL four options carefully.\n"
    "2. Think step-by-step: identify the concept, apply the relevant formula/logic, "
    "   evaluate each option, and eliminate wrong ones.\n"
    "3. Your reasoning MUST be brief (2-4 sentences max).\n"
    "4. On the VERY LAST line of your response, write EXACTLY:\n"
    "   Answer: <number>\n"
    "   where <number> is 1, 2, 3, or 4 corresponding to the correct option.\n"
    "5. Do NOT write anything after the Answer line. No explanation, no period, nothing.\n\n"
    "EXAMPLE OUTPUT:\n"
    "Binary search requires a sorted array and runs in O(log n). "
    "Option 2 states O(log n) which is correct.\n"
    "Answer: 2\n"
)


def _read_credentials_from_stdin() -> tuple[list, str, str]:
    """
    Read JSON credentials written by launcher via stdin pipe.
    Returns (api_keys, language, model). Falls back to empty list / Java / gemini if stdin
    is not a pipe (dev mode) or if parsing fails.

    Why stdin:
    - No file ever written to disk
    - Not visible in Task Manager (unlike CLI args)
    - Not visible in Process Explorer (unlike env vars)
    - Launcher's RAM is separate from TITAN's RAM — launcher dying doesn't
      wipe our copy of the key.
    """
    try:
        # Only read if stdin is a pipe (not a tty / console)
        if not sys.stdin.isatty():
            raw = sys.stdin.buffer.read().decode("utf-8").strip()
            if raw:
                data = json.loads(raw)
                raw_key = data.get("gemini_key", "").strip()
                lang = data.get("language",   "Java").strip() or "Java"
                model_str = data.get("model", "gemini").strip() or "gemini"
                # Support comma-separated keys from license server
                keys = [k.strip() for k in raw_key.split(",") if k.strip()]
                return keys, lang, model_str
    except Exception:
        pass
    # Dev-mode fallback: no launcher → check env var
    env_key_raw = os.getenv("GEMINI_API_KEY", "").strip()
    env_lang = os.getenv("GEMINI_LANG", "Java").strip()
    env_model = os.getenv("GEMINI_MODEL", "gemini").strip()
    env_keys = [k.strip() for k in env_key_raw.split(",") if k.strip()]
    return env_keys, env_lang, env_model

def get_coding_prompt(language: str = "Java") -> str:
    """Return hardcoded coding system prompt with runtime language injected."""
    return _DEFAULT_CODING_PROMPT.replace("{language}", language or "Java")


def get_mcq_prompt() -> str:
    """Return hardcoded MCQ system prompt."""
    return _DEFAULT_MCQ_PROMPT

def set_window_exclude_from_capture(hwnd):
    """Best-effort: hide window from screen capture APIs.
    Uses WDA_EXCLUDEFROMCAPTURE (17) on Win10 2004+, falls back to
    WDA_MONITOR (1) on older builds, and silently no-ops if neither works.
    """
    try:
        SetWindowDisplayAffinity = ctypes.windll.user32.SetWindowDisplayAffinity
        # Try WDA_EXCLUDEFROMCAPTURE first (cleanest — window is usable but invisible to capture)
        if not SetWindowDisplayAffinity(hwnd, 0x00000011):
            # Fallback: WDA_MONITOR — shows black in screenshots
            SetWindowDisplayAffinity(hwnd, 0x00000001)
    except Exception:
        pass


# Device verification and license checks removed.
# The application now runs without performing MAC/device verification.

# ── win32gui helpers ─────────────────────────────────────────────────────────

_WM_GETTEXT       = 0x000D
_WM_GETTEXTLENGTH = 0x000E


def _win32_get_hwnd_text(hwnd: int) -> str:
    """
    Read text from any window handle via WM_GETTEXT - pure Win32, no COM/UIAutomation.
    Safe from UIAutomation-based anti-cheat detection.
    """
    try:
        SMTO_ABORTIFHUNG = 0x0002
        timeout = 50  # ms
        
        res_len = ctypes.c_ulonglong() if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong()
        ret = ctypes.windll.user32.SendMessageTimeoutW(
            hwnd, _WM_GETTEXTLENGTH, 0, 0, SMTO_ABORTIFHUNG, timeout, ctypes.byref(res_len)
        )
        
        if ret == 0 or res_len.value <= 0:
            return ""
            
        length = int(res_len.value)
        buf = ctypes.create_unicode_buffer(length + 1)
        
        res_text = ctypes.c_ulonglong() if ctypes.sizeof(ctypes.c_void_p) == 8 else ctypes.c_ulong()
        ret = ctypes.windll.user32.SendMessageTimeoutW(
            hwnd, _WM_GETTEXT, length + 1, ctypes.cast(buf, ctypes.c_void_p), SMTO_ABORTIFHUNG, timeout, ctypes.byref(res_text)
        )
        
        if ret == 0:
            return ""
            
        return buf.value.strip()
    except Exception:
        return ""


def _win32_collect_texts(hwnd: int, min_len: int = 2) -> list[str]:
    """
    Walk a window's child hierarchy via EnumChildWindows and collect
    all non-empty WM_GETTEXT values. Returns ordered list.
    """
    results: list[str] = []

    def _enum_cb(child_hwnd: int, _param) -> bool:
        try:
            text = _win32_get_hwnd_text(child_hwnd)
            if text and len(text) > min_len:
                results.append(text)
        except Exception:
            pass
        return True  # continue enumeration

    try:
        win32gui.EnumChildWindows(hwnd, _enum_cb, None)
    except Exception:
        pass
    return results



def _uia_extract_texts(hwnd: int, control_types=("Text", "Edit")) -> str:
    """
    Shared UIA text extraction engine used by BOTH code and MCQ paths.

    Strategy:
      1. Locate Chrome_RenderWidgetHostHWND (if Chrome-based)
      2. Inject soft focus (AttachThreadInput + SetFocus + PostMessage click)
         — zero cursor movement, zero hardware events, zero anti-cheat surface
      3. 200ms wait for Chrome to populate UIA accessibility tree asynchronously
      4. pywinauto UIA scan for all Text + Edit controls (covers Monaco/CodeMirror)

    Works for: Chrome, Electron, HackerRank, Codility, HackerEarth, NeoBrowser,
               and any Chromium-based lockdown browser that exposes UIA.
    """
    try:
        import win32process
        from pywinauto import Application
    except ImportError as e:
        raise RuntimeError(f"Missing dependency: {e}")

    try:
        pythoncom.CoInitialize()
    except Exception:
        pass

    try:
        if not hwnd:
            hwnd = win32gui.GetForegroundWindow()
        if not hwnd:
            return ""

        # ── 1. Find Chrome_RenderWidgetHostHWND ───────────────────────
        render_found = []
        def _cb(child, _):
            try:
                if win32gui.GetClassName(child) == 'Chrome_RenderWidgetHostHWND':
                    render_found.append(child)
            except Exception:
                pass
            return True
        try:
            win32gui.EnumChildWindows(hwnd, _cb, None)
        except Exception:
            pass
        render_hwnd = render_found[0] if render_found else None
        target      = render_hwnd or hwnd

        # ── 2. Virtual focus wake — zero OS foreground-window side effects ───
        #
        #    Strategy (3-message sequence, all PostMessage = queued, non-blocking):
        #
        #    a) WM_ACTIVATE(WA_ACTIVE) → parent frame hwnd
        #       Tells the browser window "you are now active." Chrome's message
        #       loop sets its internal focus state. No OS SetForegroundWindow call.
        #
        #    b) WM_SETFOCUS → Chrome_RenderWidgetHostHWND
        #       Tells the render widget "keyboard focus is now here." This alone
        #       wakes the UIA accessibility provider for that content area.
        #
        #    c) WM_LBUTTONDOWN/UP → Chrome_RenderWidgetHostHWND at (10,10)
        #       Belt-and-suspenders: some browser builds need a synthetic click
        #       to flush their UIA dirty-state. PostMessage is queue-based —
        #       no SendInput, no hardware event, no anti-cheat signal.
        #
        #    None of these three messages call SetForegroundWindow or modify
        #    the OS foreground-window record. Proctored browsers (HackerRank,
        #    NeoBrowser, TalView, iMocha) monitor that record via
        #    EVENT_SYSTEM_FOREGROUND hook — our messages never trigger it.
        WA_ACTIVE   = 1
        WM_ACTIVATE = 0x0006
        WM_SETFOCUS = 0x0007
        try:
            # a) Activate the parent frame
            win32gui.PostMessage(hwnd, WM_ACTIVATE, WA_ACTIVE, 0)
            # b) Give keyboard focus to the render widget (or frame if no render)
            focus_target = render_hwnd or hwnd
            win32gui.PostMessage(focus_target, WM_SETFOCUS, 0, 0)
            # c) Synthetic click to flush UIA dirty state
            if render_hwnd:
                lparam = (10 << 16) | 10   # MAKELPARAM(x=10, y=10)
                win32gui.PostMessage(render_hwnd, win32con.WM_LBUTTONDOWN,
                                     win32con.MK_LBUTTON, lparam)
                win32gui.PostMessage(render_hwnd, win32con.WM_LBUTTONUP, 0, lparam)
        except Exception:
            pass

        # Wait for UIA accessibility tree to populate asynchronously
        time.sleep(0.20)

        # ── 3. pywinauto UIA scan ─────────────────────────────────────
        app    = Application(backend='uia').connect(handle=hwnd)
        window = app.window(handle=hwnd)

        text_items = []
        for ct in control_types:
            try:
                elems = window.descendants(control_type=ct)
                for el in elems:
                    try:
                        t = el.window_text()
                        if t and t.strip() and "Chrome Legacy Window" not in t:
                            text_items.append(t.strip())
                    except Exception:
                        pass
            except Exception:
                pass

        return "\n".join(text_items)

    except Exception as e:
        raise RuntimeError(f"UIA extraction failed: {e}")
    finally:
        try:
            pythoncom.CoUninitialize()
        except Exception:
            pass


def extract_window_text_from_foreground(target_hwnd: int = 0) -> str:
    """
    Extract visible text from the specified window (or foreground if target_hwnd=0).
    No OCR. No clipboard. No vision model. No COM UIAutomation at the top level.

    Strategy:
      1. WM_GETTEXT via EnumChildWindows — fast, works for all native Win32 apps
         (VS Code native, Eclipse, NetBeans, IntelliJ, Notepad, etc.)
      2. MSAA fallback — 50ms wait then a second WM_GETTEXT pass
      3. UIA via pywinauto — for Chrome/Electron/lockdown browsers
         (HackerRank, Codility, HackerEarth, NeoBrowser) using the same
         pipeline as MCQ extraction. Reads Text + Edit controls to cover
         Monaco editor (contenteditable div exposed as UIA Edit control).
    """
    try:
        hwnd = target_hwnd if target_hwnd else win32gui.GetForegroundWindow()
        if not hwnd:
            return ""

        # ── Strategy 1: WM_GETTEXT ─────────────────────────────────────
        texts = _win32_collect_texts(hwnd, min_len=2)
        text  = "\n".join(texts).strip()

        if len(text) > 30:
            return text

        # ── Strategy 2: MSAA 50ms wake + WM_GETTEXT retry ─────────────
        try:
            _oleacc = ctypes.windll.oleacc
            ppvObj  = ctypes.c_void_p()
            _oleacc.AccessibleObjectFromWindow(
                hwnd,
                ctypes.c_uint(0xFFFFFFFC),   # OBJID_CLIENT
                ctypes.byref(ctypes.create_string_buffer(16)),
                ctypes.byref(ppvObj),
            )
            time.sleep(0.05)
            texts2 = _win32_collect_texts(hwnd, min_len=1)
            text2  = "\n".join(texts2).strip()
            if len(text2) > len(text):
                text = text2
        except Exception:
            pass

        if len(text) > 30:
            return text

        # ── Strategy 3: UIA (same engine as MCQ) ──────────────────────
        # Fires for Chrome-based editors. Scans both Text controls (labels,
        # paragraphs) and Edit controls (Monaco/CodeMirror contenteditable).
        try:
            uia_text = _uia_extract_texts(hwnd, control_types=("Text", "Edit"))
            if uia_text and len(uia_text.strip()) > len(text):
                return uia_text.strip()
        except Exception:
            pass

        return text

    except Exception as e:
        return f"Error: {e}"



class CodeExtractThread(QThread):
    finished = pyqtSignal(str)
    error = pyqtSignal(str)

    def __init__(self, target_hwnd: int = 0):
        super().__init__()
        self._target_hwnd = target_hwnd  # pre-captured non-TITAN hwnd from HWNDTracker

    def run(self):
        # Use the same UIA engine as MCQ extraction.
        # _uia_extract_texts does SwitchToThisWindow(target_hwnd) inside the
        # thread — this forces the browser/editor back to foreground before
        # reading it, solving the TITAN-HUD-text-capture bug permanently.
        # Edit controls cover Monaco/CodeMirror (Chrome contenteditable).
        # Text controls cover problem statement paragraphs and labels.
        try:
            text = _uia_extract_texts(
                self._target_hwnd,
                control_types=("Text", "Edit")
            )
            self.finished.emit(text.strip())
        except Exception as e:
            self.error.emit(str(e))

class CodeChatbotThread(QThread):
    """Thread to send a prompt to a generative model (if api_key provided) or return a local fallback."""
    response_ready = pyqtSignal(str)
    error_occurred = pyqtSignal(str)
    MAX_429_RETRIES = 1
    BASE_429_BACKOFF_SECONDS = 1

    MODEL_FALLBACKS = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest",
    ]

    def __init__(self, prompt, api_keys=None):
        super().__init__()
        self.prompt = prompt
        self.api_keys = list(api_keys or [])

    def _strip_code_comments(self, code: str) -> str:
        """Post-processing safety net: remove comment lines the AI added despite instructions.

        Strips:
          - Single-line //  comments (Java, C, C++, JS)
          - Single-line #   comments (Python, bash) — but NOT shebang lines
          - Block   /* … */ comments (single or multi-line)
          - Block   <!-- … --> comments (HTML/XML)
          Empty lines left by removed comments are collapsed (max 1 consecutive blank).
        """
        if not code:
            return code

        import re as _re

        # Remove /* ... */ blocks (greedy=False so we don't eat across blocks)
        code = _re.sub(r'/\*.*?\*/', '', code, flags=_re.DOTALL)

        # Remove <!-- ... --> blocks
        code = _re.sub(r'<!--.*?-->', '', code, flags=_re.DOTALL)

        result_lines = []
        for line in code.splitlines():
            stripped = line.lstrip()

            # Drop pure // comment lines
            if stripped.startswith('//'):
                continue

            # Drop pure # comment lines (keep shebangs like #!/usr/bin/env)
            if stripped.startswith('#') and not stripped.startswith('#!'):
                continue

            # Drop trailing // inline comments (but only if outside strings — simple heuristic)
            # Only strip if the comment is preceded by code (not inside a string literal).
            if '//' in line:
                # Rough check: don't strip if inside a string (contains " or ' before //)
                before_comment = line[:line.index('//')]
                quote_count = before_comment.count('"') + before_comment.count("'")
                if quote_count % 2 == 0:  # even = not inside string
                    line = before_comment.rstrip()

            result_lines.append(line)

        # Collapse consecutive blank lines to maximum 1
        collapsed = []
        prev_blank = False
        for line in result_lines:
            is_blank = not line.strip()
            if is_blank and prev_blank:
                continue
            collapsed.append(line)
            prev_blank = is_blank

        return '\n'.join(collapsed).strip()


    def _extract_response_text(self, response):
        try:
            response_data = response.json()
        except Exception:
            return None

        # OpenAI format check
        if "choices" in response_data and isinstance(response_data["choices"], list) and len(response_data["choices"]) > 0:
            msg = response_data["choices"][0].get("message", {})
            if "content" in msg:
                return str(msg["content"]).strip()

        candidates = response_data.get("candidates") or response_data.get("candidateResponses")
        if candidates and isinstance(candidates, list) and len(candidates) > 0:
            first = candidates[0]
            content = first.get("content") or first.get("message") or {}
            if isinstance(content, dict):
                parts = content.get("parts")
                if parts and isinstance(parts, list) and len(parts) > 0:
                    texts = []
                    for p in parts:
                        if isinstance(p, dict):
                            t = p.get("text")
                            if t:
                                texts.append(t)
                        elif isinstance(p, str):
                            texts.append(p)
                    if texts:
                        return "\n".join(texts).strip()

        try:
            answer = response_data.get("candidates", [])[0].get("content", {}).get("parts", [])[0].get("text", "")
            return answer.strip() if answer else None
        except Exception:
            return None

    def _retry_after_seconds(self, response, attempt_index):
        try:
            retry_after = response.headers.get("Retry-After")
            if retry_after and str(retry_after).isdigit():
                return min(int(retry_after), 30)
        except Exception:
            pass

        return min(self.BASE_429_BACKOFF_SECONDS * (2 ** attempt_index), 30)

    def run(self):
        try:
            if self.api_keys:
                system_prompt = get_coding_prompt(_RUNTIME_LANGUAGE)

                headers = {"Content-Type": "application/json"}
                
                if _RUNTIME_MODEL != "gemini":
                    base_endpoint = "https://integrate.api.nvidia.com/v1/chat/completions"
                    data = {
                        "model": _RUNTIME_MODEL,
                        "messages": [
                            {"role": "system", "content": system_prompt},
                            {"role": "user", "content": "Solve this exact problem strictly:\n\n" + self.prompt}
                        ],
                        # Tested optimal: temp=0.0 gives fastest deterministic code output (~2-3s)
                        "temperature": 0.0,
                        "top_p": 1.0,
                        "max_tokens": 2000
                    }
                    model_fallbacks = [_RUNTIME_MODEL]
                else:
                    data = {
                        "contents": [
                            {"role": "user", "parts": [{"text": "Solve this exact problem strictly:\n\n" + self.prompt}]}
                        ],
                        "systemInstruction": {"parts": [{"text": system_prompt}]},
                        "generationConfig": {
                            "temperature": 0.0,
                            "topP": 1.0,
                            "maxOutputTokens": 4000
                        }
                    }
                    model_fallbacks = self.MODEL_FALLBACKS

                last_error = None
                for api_key in self.api_keys:
                    key_failed = False
                    
                    if _RUNTIME_MODEL != "gemini":
                        headers["Authorization"] = f"Bearer {api_key}"
                        req_params = {}
                    else:
                        req_params = {"key": api_key}

                    for model_short in model_fallbacks:
                        if _RUNTIME_MODEL == "gemini":
                            base_endpoint = f"https://generativelanguage.googleapis.com/v1beta/models/{model_short}:generateContent"

                        try:
                            # NIM models (Llama/Minimax) need longer read timeout than Gemini
                            _timeout = (5, 90) if _RUNTIME_MODEL != "gemini" else (3, 10)
                            response = HTTP_SESSION.post(base_endpoint, headers=headers, params=req_params, json=data, timeout=_timeout, verify=SSL_VERIFY)
                            if response is not None:
                                logging.debug(f"Generative API response status ({model_short}): {response.status_code}")

                            if response and response.status_code == 200:
                                answer = self._extract_response_text(response)
                                if answer:
                                    clean = self._strip_code_comments(answer)
                                    self.response_ready.emit(clean)
                                    return

                            status_code = getattr(response, 'status_code', 'N/A')
                            if status_code == 404:
                                last_error = f"Model not available: {model_short}"
                                continue

                            if status_code == 429:
                                retry_success = False
                                for attempt_idx in range(self.MAX_429_RETRIES):
                                    wait_seconds = self._retry_after_seconds(response, attempt_idx)
                                    time.sleep(wait_seconds)
                                    retry_response = HTTP_SESSION.post(base_endpoint, headers=headers, params=req_params, json=data, timeout=(3, 10), verify=SSL_VERIFY)
                                    if retry_response and retry_response.status_code == 200:
                                        answer = self._extract_response_text(retry_response)
                                        if answer:
                                            clean = self._strip_code_comments(answer)
                                            self.response_ready.emit(clean)
                                            return
                                        retry_success = True
                                        break
                                    if getattr(retry_response, 'status_code', 'N/A') != 429:
                                        response = retry_response
                                        status_code = getattr(response, 'status_code', 'N/A')
                                        retry_success = True
                                        break
                                if not retry_success and status_code == 429:
                                    last_error = f"Rate limit (429) for key ...{api_key[-4:]}, rotating."
                                    key_failed = True
                                    break

                            if status_code in (401, 403):
                                last_error = f"Auth error ({status_code}) for key ...{api_key[-4:]}, rotating."
                                key_failed = True
                                break

                            body = None
                            try:
                                body = response.text
                            except Exception:
                                body = '<unreadable>'
                            msg = f"API Error (Status {status_code}). Check model, API key, and internet."
                            logging.error(f"Full error: {msg}; body={body}")
                            self.error_occurred.emit(msg)
                            return
                        except requests.exceptions.RequestException as e:
                            last_error = f"Network error: {str(e)[:100]}"
                            continue
                        except Exception as e:
                            last_error = f"Request failed: {str(e)[:100]}"
                            continue
                    if key_failed:
                        continue

                self.error_occurred.emit(last_error or "All API keys exhausted. Verify your license key is valid.")
                return

            fallback = "No API keys found. Contact admin to verify your license."
            self.error_occurred.emit(fallback)
        except Exception as e:
            self.error_occurred.emit(str(e))





# ═══════════════════════════════════════════════════
# MCQ ASSISTANT
# ═══════════════════════════════════════════════════
# pyright: reportAttributeAccessIssue=false, reportIncompatibleMethodOverride=false

# Suppress UserWarnings
warnings.simplefilter('ignore', UserWarning)

# Use only the requested model.
MODEL_CANDIDATES = [
    "gemini-2.5-flash-lite",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
]

# Retry strategy for transient throttling/server issues
MAX_RETRIES = 1
BASE_BACKOFF_SECONDS = 1.0
ROUTE_COOLDOWN_503_SECONDS = 45.0
ROUTE_COOLDOWN_429_SECONDS = 20.0
REQUEST_TIMEOUT_SECONDS = 6
SEND_DEBOUNCE_MS = 350
CURSOR_MOVE_DURATION_SECONDS = 0.08
EDGE_PADDING = 10
POSITIONS_FILE_NAME = "option_positions.json"
# API_CONFIG_FILE_NAME already defined at module level above — no duplicate needed

# Create a persistent HTTP session for connection reuse (reduces latency)
HTTP_SESSION = requests.Session()
HTTP_SESSION.headers.update({"Content-Type": "application/json"})

# #6: ssl_verify — read from INI, defaults False (corporate proxy bypass)
def _load_ssl_verify():
    _p = configparser.ConfigParser()
    for _loc in [
        os.path.join(os.path.dirname(os.path.abspath(sys.executable if getattr(sys,'frozen',False) else __file__)), API_CONFIG_FILE_NAME),
        os.path.join(os.getcwd(), API_CONFIG_FILE_NAME),
    ]:
        if os.path.exists(_loc):
            _p.read(_loc, encoding="utf-8")
            break
    val = _p.get("gemini", "ssl_verify", fallback="false").strip().lower()
    return val not in ("false", "0", "no", "off")

SSL_VERIFY = _load_ssl_verify()




def mcq_extract_window_text_from_foreground(target_hwnd: int = 0) -> str:
    """
    Extract MCQ question text using the shared UIA engine, then apply
    MCQ-specific section filtering to isolate the question and options.
    target_hwnd: pre-captured HWND (0 = auto-detect inside _uia_extract_texts).
    """
    # Shared UIA engine handles: Chrome_RenderWidgetHostHWND detection,
    # focus injection, PostMessage click wake, 200ms wait, pywinauto scan.
    # Only "Text" controls needed for MCQ (labels/paragraphs, not code editors).
    raw_text = _uia_extract_texts(target_hwnd, control_types=("Text",))
    text_lines = raw_text.split("\n")

    # ── MCQ section filter ────────────────────────────────────────────
    # Isolate the question block, stripping navigation/timer noise.
    section_start_markers = [
        "select the correct answer",
        "choose the correct option",
        "choose the correct answer",
        "select one",
        "select the right answer",
    ]
    section_end_markers = [
        "confirmation",
        "next question",
        "previous question",
        "time remaining",
    ]

    filtered_lines      = []
    is_question_section = False
    for line in text_lines:
        line_lower = line.strip().lower()
        if not is_question_section:
            for marker in section_start_markers:
                if marker in line_lower:
                    is_question_section = True
                    break
        if is_question_section:
            hit_end = False
            for marker in section_end_markers:
                if line_lower == marker or line_lower.startswith("clicking the"):
                    hit_end = True
                    break
            if hit_end:
                break
            filtered_lines.append(line)

    if not is_question_section:
        filtered_lines = text_lines

    result_text = "\n".join(filtered_lines).strip()

    # Remove trailing noise from submission prompts
    for noise in ["Clicking the 'Submit'", "Clicking the Submit", "Click Submit"]:
        if noise in result_text:
            result_text = result_text[:result_text.index(noise)]
            break

    return result_text.strip()


class McqExtractThread(QThread):
    finished = pyqtSignal(str)
    error    = pyqtSignal(str)

    def __init__(self, target_hwnd: int = 0):
        super().__init__()
        self._target_hwnd = target_hwnd  # pre-captured before any Qt UI updates

    def run(self):
        # UIA via pywinauto — COM initialised inside the extraction function
        try:
            text = mcq_extract_window_text_from_foreground(self._target_hwnd)
            self.finished.emit(text)
        except Exception as e:
            self.error.emit(str(e))


class McqChatbotThread(QThread):
    response_ready = pyqtSignal(str, str)  # (answer_text, digit)
    option_ready = pyqtSignal(str)
    error_occurred = pyqtSignal(str)
    _cached_model_candidates = []
    _model_cache_built = False
    _preferred_route = None  # tuple(api_version, model_name)
    _preferred_api_key = None
    _route_cooldowns = {}  # (api_version, model_name) -> monotonic timestamp
    _api_key_cooldowns = {}  # api_key -> monotonic timestamp
    
    def __init__(self, prompt, api_keys):
        super().__init__()
        self.prompt = prompt
        self.api_keys = list(api_keys or [])

    def _extract_api_error_message(self, response):
        try:
            payload = response.json()
            err = payload.get("error", {}) if isinstance(payload, dict) else {}
            if isinstance(err, dict):
                msg = err.get("message")
                if msg:
                    return str(msg)
        except Exception:
            pass
        try:
            return response.text[:500]
        except Exception:
            return "<unreadable>"

    def _calculate_backoff(self, response, attempt_index):
        retry_after = response.headers.get("Retry-After")
        if retry_after:
            try:
                return max(0.0, float(retry_after))
            except ValueError:
                pass
        return BASE_BACKOFF_SECONDS * (2 ** attempt_index)

    def _normalize_answer(self, raw_text):
        """
        Normalize model output into one of: '1', '2', '3', '4'.
        Most robust strategy: Check explicit answer declarations FIRST.
        """
        if not raw_text:
            return None

        text = str(raw_text).strip()
        if not text:
            return None

        original_text = text
        text_lower = text.lower()

        # Letter-to-digit mapping
        letter_map = {
            "a": "1",
            "b": "2",
            "c": "3",
            "d": "4",
        }
        
        word_map = {
            "one": "1",
            "two": "2",
            "three": "3",
            "four": "4",
            "first": "1",
            "second": "2",
            "third": "3",
            "fourth": "4",
        }

        # ============================================================
        # PRIORITY 1: Explicit answer declarations (HIGHEST PRIORITY)
        # Focus on LAST 200 chars which should contain the final answer
        # ============================================================
        last_portion = text_lower[-200:] if len(text_lower) > 200 else text_lower
        
        # Check for explicit answer statements in last portion
        answer_patterns = [
            "answer: ",
            "answer is ",
            "the answer is ",
            "correct answer: ",
            "correct answer is ",
            "the correct option is ",
            "correct option: ",
        ]
        
        for pattern in answer_patterns:
            if pattern in last_portion:
                # Get the LAST occurrence in the last portion
                idx = last_portion.rfind(pattern)
                after_pattern = last_portion[idx + len(pattern):].strip()
                
                # Extract first digit or letter found
                for char in after_pattern:
                    if char in ("1", "2", "3", "4"):
                        return char
                    if char.lower() in letter_map:
                        return letter_map[char.lower()]
                    # Stop at punctuation/boundary
                    if char in ".!?\n":
                        break

        # ============================================================
        # PRIORITY 2: Patterns with explicit option/choice references
        # ============================================================
        for digit in ("1", "2", "3", "4"):
            # "option 1", "option a", "choice 2", "choice d"
            patterns = [
                f"option {digit}",
                f"choice {digit}",
                f"option {letter_map.get(chr(ord('a') + int(digit) - 1))}",  # option a, b, c, d
            ]
            for pattern in patterns:
                if pattern in text_lower:
                    return digit

        # ============================================================
        # PRIORITY 3: Fast path for exact single token
        # ============================================================
        if text in ("1", "2", "3", "4"):
            return text
        
        # Check exact word mapping matches
        if text_lower in word_map:
            return word_map[text_lower]

        # ============================================================
        # PRIORITY 4: Last sentence analysis (likely contains answer)
        # ============================================================
        # Split by sentence breaks and analyze the last non-empty sentence
        sentences = [s.strip() for s in text_lower.replace(".", "\n").replace("!", "\n").replace("?", "\n").split("\n")]
        sentences = [s for s in sentences if s]  # Remove empty
        
        if sentences:
            last_sentence = sentences[-1]
            
            # Check for digits in last sentence
            for char in last_sentence:
                if char in ("1", "2", "3", "4"):
                    return char
            
            # Check for letters in last sentence
            for char in last_sentence:
                if char.lower() in letter_map:
                    return letter_map[char.lower()]

        # ============================================================
        # PRIORITY 5: Word-based token search across entire text
        # ============================================================
        tokens = text_lower.split()
        
        for token in tokens:
            # Clean token
            clean_token = token.strip(".,!?;:()[]{}").lower()
            
            # Check if it's a digit
            if clean_token in ("1", "2", "3", "4"):
                return clean_token
            
            # Check if it's a mapped word
            if clean_token in word_map:
                return word_map[clean_token]
            
            # Check if it's a single letter
            if len(clean_token) == 1 and clean_token in letter_map:
                return letter_map[clean_token]

        # ============================================================
        # PRIORITY 6: Scan original text for any digit (last resort)
        # ============================================================
        for char in original_text:
            if char in ("1", "2", "3", "4"):
                return char

        return None


    def _build_prompt(self, strict=False):
        base_prompt = (
            "Analyze this multiple choice question step by step.\n"
            "Consider each option carefully before deciding.\n"
            "End your response with the answer on its own line in this exact format:\n"
            "Answer: <number>\n"
            "where <number> is 1, 2, 3, or 4.\n"
        )

        if strict:
            base_prompt = (
                "Answer this MCQ. Reply with ONLY the option number.\n"
                "Format: Answer: <number>\n"
                "No explanation needed.\n"
            )

        return f"{base_prompt}\n\nQuestion:\n{self.prompt}"


    def _extract_answer_text(self, response_data):
        """
        Extract plain text from Gemini response format.
        """
        texts = []
        if not isinstance(response_data, dict):
            return ""

        # OpenAI format check
        if "choices" in response_data and isinstance(response_data["choices"], list) and len(response_data["choices"]) > 0:
            msg = response_data["choices"][0].get("message", {})
            if "content" in msg:
                return str(msg["content"]).strip()

        candidates = response_data.get("candidates", [])
        if not isinstance(candidates, list):
            return ""

        for candidate in candidates:
            if not isinstance(candidate, dict):
                continue
            content = candidate.get("content", {})
            if not isinstance(content, dict):
                continue
            parts = content.get("parts", [])
            if not isinstance(parts, list):
                continue
            for part in parts:
                if isinstance(part, dict):
                    t = part.get("text")
                    if t:
                        texts.append(str(t).strip())

        return "\n".join(texts).strip()

    def _build_model_candidates(self):
        if McqChatbotThread._model_cache_built and McqChatbotThread._cached_model_candidates:
            return list(McqChatbotThread._cached_model_candidates)

        McqChatbotThread._cached_model_candidates = list(MODEL_CANDIDATES)
        McqChatbotThread._model_cache_built = True
        return list(MODEL_CANDIDATES)

    def _extract_mcq_answer_line(self, text: str) -> str:
        """Post-processor: scan from the END of the AI response and return only the
        'Answer: N' line.  This makes the system immune to long explanations:
        no matter how much the model writes, we only surface the answer line.
        Falls back to the full text if no Answer: line is found (so _normalize_answer
        can still do its best-effort extraction).
        """
        if not text:
            return text
        import re as _re
        # Search from the bottom of the response for the last Answer: N line
        match = None
        for line in reversed(text.splitlines()):
            m = _re.search(r'answer\s*:\s*([1-4])', line.strip(), _re.IGNORECASE)
            if m:
                match = m.group(0).strip().capitalize()  # "Answer: 2"
                # Normalise capitalisation to "Answer: N"
                match = _re.sub(r'(?i)answer\s*:', 'Answer:', match)
                break
        return match if match else text

    def _send_request(self, api_key, api_version, model_name, prompt_text):
        if _RUNTIME_MODEL != "gemini":
            base_endpoint = "https://integrate.api.nvidia.com/v1/chat/completions"
            data = {
                "model": _RUNTIME_MODEL,
                "messages": [
                    {"role": "system", "content": get_mcq_prompt()},
                    {"role": "user", "content": prompt_text}
                ],
                # Tested optimal: temp=0.0 + max_tokens=300 → ~2.2s response for MCQ
                "temperature": 0.0,
                "top_p": 1.0,
                "max_tokens": 300
            }
            headers = {"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}
            # NIM models need longer read timeout (Minimax can take 60-90s)
            return HTTP_SESSION.post(base_endpoint, headers=headers, json=data, timeout=(5, 90), verify=SSL_VERIFY)

        base_endpoint = f"https://generativelanguage.googleapis.com/{api_version}/models/{model_name}:generateContent"
        data = {
            "contents": [
                {"role": "user", "parts": [{"text": prompt_text}]}
            ],
            "systemInstruction": {"parts": [{"text": get_mcq_prompt()}]},
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 2000,
                "topP": 1
            }
        }

        headers = {"Content-Type": "application/json"}

        return HTTP_SESSION.post(
            base_endpoint,
            headers=headers,
            params={"key": api_key},
            json=data,
            timeout=REQUEST_TIMEOUT_SECONDS,
            verify=SSL_VERIFY
        )

    def _build_api_keys(self):
        """Return API keys from runtime credentials (stdin pipe) + optional env var.
        Supports comma-separated keys in both sources for multi-key rotation."""
        merged_keys = []
        seen = set()

        # Flatten comma-separated keys from self.api_keys
        raw_keys = []
        for k in self.api_keys:
            raw_keys.extend(sub.strip() for sub in k.split(",") if sub.strip())

        # Also flatten from env var
        env_raw = os.getenv("GEMINI_API_KEY", "")
        if env_raw:
            raw_keys.extend(sub.strip() for sub in env_raw.split(",") if sub.strip())

        for api_key in raw_keys:
            if api_key and api_key not in seen:
                seen.add(api_key)
                merged_keys.append(api_key)
        return merged_keys

    def _build_routes(self, model_candidates):
        now = time.monotonic()
        hot_routes = []
        cooled_routes = []
        seen = set()

        def add_route(key):
            if key in seen:
                return
            seen.add(key)
            cooldown_until = McqChatbotThread._route_cooldowns.get(key, 0.0)
            if cooldown_until > now:
                cooled_routes.append(key)
            else:
                hot_routes.append(key)

        if McqChatbotThread._preferred_route:
            add_route(McqChatbotThread._preferred_route)

        if _RUNTIME_MODEL != "gemini":
            add_route(("v1", _RUNTIME_MODEL))
        else:
            for model_name in model_candidates:
                # Gemini uses v1beta API
                add_route(("v1beta", model_name))

        # Try healthy routes first; if all are cooling, still attempt cooled routes as fallback.
        return hot_routes + cooled_routes

    def _set_route_cooldown(self, route, seconds):
        McqChatbotThread._route_cooldowns[route] = time.monotonic() + max(0.0, float(seconds))

    def _clear_route_cooldown(self, route):
        if route in McqChatbotThread._route_cooldowns:
            del McqChatbotThread._route_cooldowns[route]

    def _set_api_key_cooldown(self, api_key, seconds):
        McqChatbotThread._api_key_cooldowns[api_key] = time.monotonic() + max(0.0, float(seconds))

    def _clear_api_key_cooldown(self, api_key):
        if api_key in McqChatbotThread._api_key_cooldowns:
            del McqChatbotThread._api_key_cooldowns[api_key]

    def _build_api_key_order(self, api_keys):
        now = time.monotonic()
        hot_keys = []
        cooled_keys = []
        seen = set()

        def add_key(api_key):
            if not api_key or api_key in seen:
                return
            seen.add(api_key)
            cooldown_until = McqChatbotThread._api_key_cooldowns.get(api_key, 0.0)
            if cooldown_until > now:
                cooled_keys.append(api_key)
            else:
                hot_keys.append(api_key)

        if McqChatbotThread._preferred_api_key:
            add_key(McqChatbotThread._preferred_api_key)

        for api_key in api_keys:
            add_key(api_key)

        return hot_keys + cooled_keys
    
    def run(self):
        try:
            api_keys = self._build_api_keys()
            if not api_keys:
                self.error_occurred.emit(
                    f"No API keys found. Contact admin to verify your license is active."
                )
                return

            response = None
            model_candidates = self._build_model_candidates()
            candidate_count = len(model_candidates)

            if not model_candidates:
                self.error_occurred.emit(
                    "No compatible models available for this Gemini API key. "
                    "Check your API key at https://aistudio.google.com/apikey"
                )
                return

            # Try cached best route first, then fall back to discovered keys and model candidates.
            last_transient_error_detail = None
            last_error_status = None
            for api_key in self._build_api_key_order(api_keys):
                if not api_key:
                    continue

                switch_to_next_key = False
                for api_version, model_name in self._build_routes(model_candidates):
                    route = (api_version, model_name)
                    prompt_text = self._build_prompt(strict=False)

                    for attempt in range(MAX_RETRIES + 1):
                        try:
                            response = self._send_request(api_key, api_version, model_name, prompt_text)
                        except requests.exceptions.Timeout:
                            self.error_occurred.emit("API timeout - request took too long")
                            return
                        except requests.exceptions.ConnectionError as exc:
                            self.error_occurred.emit(f"Connection error: {exc}")
                            return
                        except Exception as exc:
                            self.error_occurred.emit(f"Network error: {exc}")
                            return

                        if response.ok:
                            McqChatbotThread._preferred_api_key = api_key
                            McqChatbotThread._preferred_route = (api_version, model_name)
                            self._clear_api_key_cooldown(api_key)
                            self._clear_route_cooldown(route)
                            break

                        last_error_status = response.status_code

                        if response.status_code in (401, 403):
                            self._set_api_key_cooldown(api_key, ROUTE_COOLDOWN_429_SECONDS)
                            last_transient_error_detail = self._extract_api_error_message(response)
                            break

                        if response.status_code == 503:
                            # Model endpoint is overloaded; cool it down and switch route quickly.
                            self._set_route_cooldown(route, ROUTE_COOLDOWN_503_SECONDS)
                            last_transient_error_detail = self._extract_api_error_message(response)
                            break

                        if response.status_code == 429:
                            self._set_api_key_cooldown(api_key, ROUTE_COOLDOWN_429_SECONDS)
                            self._set_route_cooldown(route, ROUTE_COOLDOWN_429_SECONDS)
                            last_transient_error_detail = self._extract_api_error_message(response)
                            switch_to_next_key = True
                            break

                        if response.status_code in (500, 502, 503, 504) and attempt < MAX_RETRIES:
                            sleep_seconds = self._calculate_backoff(response, attempt)
                            time.sleep(sleep_seconds)
                            continue

                        break

                    if response is not None and response.ok:
                        break

                    # 404 may mean unavailable model for this key; try next route/key.
                    if response is not None and response.status_code == 404:
                        continue

                    # A 429 means this key is rate-limited; move to the next key immediately.
                    if switch_to_next_key:
                        break

                    # For auth failures, immediately try the next key.
                    if response is not None and response.status_code in (401, 403):
                        break

                    # For non-404 hard failures, stop early and show details.
                    if response is not None and response.status_code not in (500, 502, 503, 504):
                        break

                if response is not None and response.ok:
                    break

                if switch_to_next_key:
                    continue

            # If cached route became invalid, force refresh candidates for next request.
            if response is not None and response.status_code in (400, 403, 404):
                McqChatbotThread._model_cache_built = False
                McqChatbotThread._cached_model_candidates = []
                if response.status_code in (403, 404):
                    McqChatbotThread._preferred_route = None
                    McqChatbotThread._preferred_api_key = None

            if response is None:
                self.error_occurred.emit("No response from API")
                return

            # Enhanced error handling after retries/fallback attempts.
            if not response.ok:
                error_detail = self._extract_api_error_message(response)
                if response.status_code == 429:
                    key_count = len(self._build_api_keys())
                    self.error_occurred.emit(
                        f"Rate limit exceeded — all {key_count} API key(s) exhausted. "
                        "Wait ~60s or add more keys (comma-separated) in the admin panel."
                    )
                    return
                if response.status_code in (401, 403):
                    self.error_occurred.emit(
                        "Authentication or permission error from Gemini API. "
                        f"API says: {error_detail}"
                    )
                    return
                if response.status_code == 404:
                    self.error_occurred.emit(
                        "No compatible model found for the available API keys "
                        f"(checked {candidate_count} models). API says: {error_detail}"
                    )
                    return
                if response.status_code >= 500:
                    if response.status_code == 503 and last_transient_error_detail:
                        self.error_occurred.emit(
                            "Gemini API is temporarily overloaded (503). "
                            f"API says: {last_transient_error_detail}. "
                            "The app will auto-skip overloaded routes for a short cooldown."
                        )
                        return
                    self.error_occurred.emit(f"Server error ({response.status_code}) - Gemini API temporarily unavailable")
                    return

                self.error_occurred.emit(f"API error {response.status_code}: {error_detail}")
                return

            # Parse response JSON
            try:
                response_data = response.json()
            except Exception as ex:
                self.error_occurred.emit(f"Invalid JSON response: {ex}")
                return
            
            # Parse response text and normalize it to digit 1..4 for cursor movement.
            try:
                full_answer_text = self._extract_answer_text(response_data)
                # Post-process: strip explanation, keep only the "Answer: N" line for extraction
                answer_line = self._extract_mcq_answer_line(full_answer_text)
                digit = self._normalize_answer(answer_line)
                if digit:
                    self.option_ready.emit(digit)
                    self.response_ready.emit(full_answer_text, digit)
                    return

                # One strict retry with a narrower instruction before giving up.
                strict_text = self._build_prompt(strict=True)
                try:
                    strict_response = self._send_request(api_key, api_version, model_name, strict_text)
                    if strict_response is not None and strict_response.ok:
                        try:
                            strict_data = strict_response.json()
                            full_strict_text = self._extract_answer_text(strict_data)
                            # Post-process strict retry too
                            strict_answer_line = self._extract_mcq_answer_line(full_strict_text)
                            strict_digit = self._normalize_answer(strict_answer_line)
                            if strict_digit:
                                self.option_ready.emit(strict_digit)
                                self.response_ready.emit(full_strict_text, strict_digit)
                                return
                        except Exception:
                            pass
                except Exception:
                    pass

                self.error_occurred.emit("Could not determine a valid option. Please retry.")
                return
                
            except Exception as ex:
                self.error_occurred.emit(f"Response parsing error: {ex}")
        except Exception as e:
            self.error_occurred.emit(str(e))


# ═══════════════════════════════════════════════════
# UNIFIED UI - Auto-selects mode based on hotkey
# F5: Capture & send to Coding AI
# F4: Capture & send to MCQ AI
# F6: Type next line (code) | F9: Paste ALL instantly
# F2: Hide | F3: Stealth | Alt+T: Exit
# ═══════════════════════════════════════════════════
class UnifiedChatbotUI(QWidget):
    window_text_ready = pyqtSignal(str)
    set_output_signal = pyqtSignal(str)
    handle_response_signal = pyqtSignal(str)
    handle_error_signal = pyqtSignal(str)

    # Safe thread-crossing signals for triggers
    trigger_code_signal = pyqtSignal()
    trigger_mcq_signal = pyqtSignal()
    trigger_line_signal = pyqtSignal()
    trigger_paste_signal = pyqtSignal()
    trigger_hide_signal = pyqtSignal()
    trigger_stealth_signal = pyqtSignal()
    trigger_quit_signal = pyqtSignal()
    flash_key_hint_signal = pyqtSignal(str)

    def __init__(self, api_keys=None):
        super().__init__()
        self.api_keys = list(api_keys or [])
        self.mode = None  # 'code' or 'mcq'
        self.response_lines = []
        self.current_line_index = 0
        self.accumulated_text = ""
        self._processing = False        # True while extract+AI cycle is running
        self._typing_in_progress = False # True while F6 line is being typed
        self._paste_in_progress = False  # True while F9 paste is running
        # Continuously-updated cache of the last foreground window that is NOT
        # TITAN itself. Used by both F5 and Alt+Y so the HWND is always fresh
        # and can never race-condition to TITAN's own HUD window.
        self._last_target_hwnd = 0
        self.setup_ui()
        self.window_text_ready.connect(self._on_window_text)
        self.set_output_signal.connect(self.output.setText)
        self.handle_response_signal.connect(self._handle_code_response)
        self.handle_error_signal.connect(self._handle_error)

        # Connect trigger signals to their handlers
        self.trigger_code_signal.connect(self.capture_for_code)
        self.trigger_mcq_signal.connect(self.capture_for_mcq)
        self.trigger_line_signal.connect(self.type_next_line)
        self.trigger_paste_signal.connect(self.paste_all_code)
        self.trigger_hide_signal.connect(self.toggle_visibility)
        self.trigger_stealth_signal.connect(self.toggle_stealth_mode)
        self.trigger_quit_signal.connect(self._quit_app)
        self.flash_key_hint_signal.connect(self._flash_key_hint)
        self._start_hwnd_tracker()


    def setup_ui(self):
        self.setWindowTitle("")
        W, H = 360, 420
        self.setFixedSize(W, H)
        self.setWindowFlags(
            Qt.FramelessWindowHint |
            Qt.WindowStaysOnTopHint |
            Qt.Tool |
            Qt.WindowDoesNotAcceptFocus
        )
        self.setAttribute(Qt.WA_TranslucentBackground)

        # ── Position: bottom-right of screen ──
        screen = QApplication.primaryScreen().geometry()

        taskbar_margin = 50
        self.move(screen.width() - W - 18, screen.height() - H - taskbar_margin)

        # ── Main container with dark glass styling ──
        self.container = QWidget(self)
        self.container.setObjectName("hud")
        self.container.setGeometry(0, 0, W, H)
        self.container.setStyleSheet("""
            QWidget#hud {
                background-color: rgba(12, 12, 18, 210);
                border: 1px solid rgba(0, 255, 255, 60);
                border-radius: 12px;
            }
        """)

        layout = QVBoxLayout(self.container)
        layout.setContentsMargins(14, 10, 14, 10)
        layout.setSpacing(6)

        # ── Header row: status dot + title ──
        header = QHBoxLayout()
        header.setSpacing(8)

        self.label = QLabel("TITAN", self.container)
        self.label.setStyleSheet("""
            color: rgba(0, 255, 255, 220);
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 3px;
            background: transparent;
            border: none;
        """)
        header.addWidget(self.label)
        header.addStretch()
        layout.addLayout(header)

        # ── Hidden text input (still used by backend) ──
        self.text_input = QTextEdit(self.container)
        self.text_input.setVisible(False)
        self.text_input.setEnabled(True)

        # ── Main output area ── (scrollable, syntax-highlighted)
        self.output = QTextEdit(self.container)
        self.output.setReadOnly(True)
        self.output.setAcceptRichText(True)        # enables HTML colour output
        self.output.setVerticalScrollBarPolicy(Qt.ScrollBarAsNeeded)
        self.output.setSizePolicy(
            self.output.sizePolicy().horizontalPolicy(),
            __import__('PyQt5.QtWidgets', fromlist=['QSizePolicy']).QSizePolicy.Expanding
        )
        self.output.setStyleSheet("""
            QTextEdit {
                background-color: rgba(20, 20, 30, 180);
                color: #e0e0e0;
                border: 1px solid rgba(0, 255, 255, 25);
                border-radius: 8px;
                font-family: 'Consolas', 'Cascadia Code', monospace;
                font-size: 12px;
                padding: 8px;
                selection-background-color: rgba(0, 255, 255, 80);
            }
            QScrollBar:vertical {
                background: rgba(0,0,0,40);
                width: 6px;
                border-radius: 3px;
            }
            QScrollBar::handle:vertical {
                background: rgba(0, 255, 255, 80);
                border-radius: 3px;
                min-height: 20px;
            }
            QScrollBar::handle:vertical:hover {
                background: rgba(0, 255, 255, 140);
            }
            QScrollBar::add-line:vertical, QScrollBar::sub-line:vertical { height: 0; }
        """)
        self.output.setPlaceholderText("Waiting for command...")
        layout.addWidget(self.output, stretch=1)   # stretch=1 lets it grow

        self.is_stealth = False
        self._stealth_level = 0  # cycles: 0=opaque, 1=dim, 2=near-invisible

        self.response_lines = []
        self.current_line = 0

        # ─ Ghost key-intercept state removed ─
        self._ghost_mode = False   # kept as False-sentinel so F9 guard still compiles
        self._ghost_text = ""
        self._ghost_original_text = ""
        self._ghost_pos = 0
        self._ghost_lock = threading.Lock()
        self._ghost_listener = None

        # ── Footer with hotkeys ──
        self.footer = QLabel(
            "F5 Code | F4 MCQ | F6 Line | F2 Hide | F3 Stealth | Alt+T Exit",
            self.container
        )
        self.footer.setAlignment(Qt.AlignCenter)
        self.footer.setWordWrap(True)
        self.footer.setStyleSheet("""
            color: rgba(176, 190, 197, 120);
            font-size: 9px;
            letter-spacing: 1px;
            background: transparent;
            border: none;
            padding-top: 2px;
        """)
        layout.addWidget(self.footer)

        pyautogui.PAUSE = 0

        self.is_hidden = False
        self.old_pos = None

        self.start_global_key_listener()
        # Guardian is started in showEvent — after the native HWND is
        # finalized (Qt.WA_TranslucentBackground may recreate it at show).

    def _quit_app(self):
        """Emergency kill — wipe RAM credentials then hard-exit.

        Overwrites both runtime globals with inert values before os._exit()
        so sensitive material cannot be recovered from a process dump.
        """
        global _RUNTIME_API_KEYS, _RUNTIME_LANGUAGE
        # Secure wipe: overwrite list contents, then replace reference
        try:
            for i in range(len(_RUNTIME_API_KEYS)):
                _RUNTIME_API_KEYS[i] = "\x00" * 64
        except Exception:
            pass
        _RUNTIME_API_KEYS = []
        _RUNTIME_LANGUAGE = ""
        self.stop_ghost_mode()  # stop auto-typing before dying
        import os as _os
        _os._exit(0)            # hard-kill: no atexit, no gc, no lingering threads

    def mousePressEvent(self, event):
        if event.button() == Qt.LeftButton:
            self.old_pos = event.globalPos()

    def mouseMoveEvent(self, event):
        if self.old_pos is not None:
            delta = event.globalPos() - self.old_pos
            self.move(self.x() + delta.x(), self.y() + delta.y())
            self.old_pos = event.globalPos()

    def mouseReleaseEvent(self, event):
        self.old_pos = None

    def showEvent(self, event):
        super().showEvent(event)
        hwnd = int(self.winId())
        # Cache HWND here — guaranteed to be the final native handle.
        # (Qt.WA_TranslucentBackground can recreate the HWND at first show;
        #  caching in setup_ui would store a stale handle, breaking SetWindowPos)
        self._zorder_hwnd_cache = hwnd
        set_window_exclude_from_capture(hwnd)
        # Force-hide from taskbar via Win32 extended window styles.
        try:
            GWL_EXSTYLE = -20
            WS_EX_APPWINDOW = 0x00040000
            WS_EX_TOOLWINDOW = 0x00000080
            style = ctypes.windll.user32.GetWindowLongW(hwnd, GWL_EXSTYLE)
            style = (style | WS_EX_TOOLWINDOW) & ~WS_EX_APPWINDOW
            ctypes.windll.user32.SetWindowLongW(hwnd, GWL_EXSTYLE, style)
        except Exception:
            pass
        # Start the Z-order guardian once — after the HWND is valid.
        if not getattr(self, '_guardian_started', False):
            self._guardian_started = True
            self._start_zorder_guardian()

    def hide_window(self):
        """Hide window using Qt — keeps Qt's isVisible() in sync."""
        self.hide()          # Qt-native: updates isVisible() correctly
        self.is_hidden = True

    def show_window(self):
        """Show window on top WITHOUT stealing focus."""
        self.show()           # Qt-native: updates isVisible() correctly
        # Re-assert TOPMOST without activating
        hwnd = getattr(self, '_zorder_hwnd_cache', 0) or int(self.winId())
        if hwnd:
            win32gui.SetWindowPos(
                hwnd,
                win32con.HWND_TOPMOST,
                0, 0, 0, 0,
                win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE
            )

    def toggle_visibility(self):
        if self.is_hidden:
            self.show_window()
            self.is_hidden = False
            # If stealth fully hid it (opacity near zero) bring it back readable
            if self.windowOpacity() < 0.15:
                self.setWindowOpacity(1.0)
                self._stealth_level = 0
                self.is_stealth = False
        else:
            self.hide_window()
            # is_hidden already set True inside hide_window()

    def toggle_stealth_mode(self):
        """Cycle opacity: 100% → 15% → 5% → 100%."""
        levels = [1.0, 0.15, 0.05]
        self._stealth_level = (self._stealth_level + 1) % len(levels)
        opacity = levels[self._stealth_level]
        self.setWindowOpacity(opacity)
        self.is_stealth = self._stealth_level != 0

    # ── Z-order guardian (root fix for GUI behind browsers) ────────
    def _start_zorder_guardian(self):
        """Install a SetWinEventHook on EVENT_SYSTEM_FOREGROUND.

        Root cause of GUI disappearing behind browsers:
          Windows maintains a TOPMOST Z-list. When a browser window gains
          focus it calls SetWindowPos/SetForegroundWindow internally, which
          can place it above us in the topmost Z-list. A timer counter-
          asserting every N ms is both detectable and racy.

        Root fix:
          SetWinEventHook(EVENT_SYSTEM_FOREGROUND) fires at the OS level
          the INSTANT any window becomes foreground. Our callback fires
          before the next paint cycle and re-asserts HWND_TOPMOST so the
          visual result is: we are always on top after any focus change.

        Why this is stealth-safe:
          - Zero polling / zero background timer
          - SetWinEventHook is the standard API used by IMEs, screen
            readers, accessibility tools, and Windows itself
          - The callback fires at most once per user focus-change (rare)
          - SWP_NOACTIVATE means we never steal focus from the browser
        """
        import ctypes.wintypes as _wt

        _self = self

        # ── CRITICAL: cache HWND as a plain int on the main thread. ──
        # winId() is a Qt method — calling it from ANY background thread
        # is undefined behaviour and causes crashes (seen after F2 hide:
        # hiding the window triggers EVENT_SYSTEM_FOREGROUND which runs
        # _on_fg_change on the guardian thread, which previously called
        # winId() off-thread → segfault / access violation).
        # A QWidget's native HWND never changes after creation, so a
        # one-time cache is safe for the process lifetime.
        _our_hwnd = int(self.winId())          # main-thread call — safe
        _self._zorder_hwnd_cache = _our_hwnd  # keep reference on self too

        _WinEventProc = ctypes.WINFUNCTYPE(
            None,
            ctypes.c_void_p,  # hWinEventHook
            _wt.DWORD,        # event
            _wt.HWND,         # hwnd — the new foreground window
            _wt.LONG,         # idObject
            _wt.LONG,         # idChild
            _wt.DWORD,        # dwEventThread
            _wt.DWORD,        # dwmsEventTime
        )

        def _on_fg_change(hHook, event, hwnd, idObject, idChild, dwThread, dwTime):
            try:
                if _self.is_hidden:
                    return
                # Use cached int — NO Qt calls from background thread
                our_hwnd = _self._zorder_hwnd_cache
                if not our_hwnd or hwnd == our_hwnd:
                    return  # we became foreground — nothing to do
                # Re-assert topmost without stealing focus
                ctypes.windll.user32.SetWindowPos(
                    our_hwnd,
                    win32con.HWND_TOPMOST,
                    0, 0, 0, 0,
                    win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE,
                )
            except Exception:
                pass

        _cb = _WinEventProc(_on_fg_change)
        # MUST hold a Python reference or ctypes GC will free the callback
        # mid-execution and crash the process.
        _self._zorder_cb_ref = _cb

        def _guardian_thread():
            EVENT_SYSTEM_FOREGROUND = 0x0003
            WINEVENT_OUTOFCONTEXT   = 0x0002   # callback on our thread
            hook = ctypes.windll.user32.SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND,
                None,   # hmodWinEventProc (not in-process)
                _cb,
                0, 0,   # all processes, all threads
                WINEVENT_OUTOFCONTEXT,
            )
            _self._zorder_hook = hook

            # Windows message pump — required to receive OUTOFCONTEXT callbacks
            msg = _wt.MSG()
            while ctypes.windll.user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
                ctypes.windll.user32.TranslateMessage(ctypes.byref(msg))
                ctypes.windll.user32.DispatchMessageW(ctypes.byref(msg))

            if hook:
                ctypes.windll.user32.UnhookWinEvent(hook)

        t = threading.Thread(target=_guardian_thread, daemon=True,
                             name="ZOrderGuardian")
        t.start()

    # ── Key indicator flash ────────────────────────────────────
    def _flash_key_hint(self, key_name: str):
        """Flash the triggered key name in the HUD title for 1.2 s.

        Only operates on the label — never shows or hides the window.
        Visibility is controlled exclusively by F2 / ..h.
        Z-order re-assertion only happens if HUD is already visible.
        """
        # Only re-assert topmost if already visible (don't pop hidden HUD)
        if not getattr(self, 'is_hidden', False):
            self._ensure_topmost_if_visible()
        self.label.setText(f"▊ {key_name} ▊")
        self.label.setStyleSheet("""
            color: rgba(255, 215, 0, 255);
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 3px;
            background: transparent;
            border: none;
        """)
        QTimer.singleShot(1200, self._restore_label)

    def _restore_label(self):
        self.label.setText("TITAN")
        self.label.setStyleSheet("""
            color: rgba(0, 255, 255, 220);
            font-size: 13px;
            font-weight: bold;
            letter-spacing: 3px;
            background: transparent;
            border: none;
        """)

    def _ensure_topmost_if_visible(self):
        """Re-assert HWND_TOPMOST only when the window is visible.
        Uses the cached HWND so it is safe to call from any context.
        Never steals focus (SWP_NOACTIVATE always set).
        """
        if getattr(self, 'is_hidden', True):
            return
        try:
            hwnd = getattr(self, '_zorder_hwnd_cache', 0)
            if not hwnd:
                hwnd = int(self.winId())  # fallback — safe only on main thread
            if hwnd:
                ctypes.windll.user32.SetWindowPos(
                    hwnd,
                    win32con.HWND_TOPMOST,
                    0, 0, 0, 0,
                    win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE,
                )
        except Exception:
            pass

    # ── Magic sequence triggers ────────────────────────────────────
    # Typed patterns that work even when proctoring software blocks
    # Alt/Ctrl/F-keys. Both systems coexist: old hotkeys AND new
    # sequences fire the same actions.
    _SEQ_PREFIX = ".."
    _SEQ_TIMEOUT_MS = 800
    _SEQ_TRIGGERS = {
        "..c": "CODE_CAPTURE",
        "..m": "MCQ_CAPTURE",
        "..g": "GHOST_ON",
        "..s": "GHOST_STOP",
        "..h": "TOGGLE_HUD",
        "..t": "STEALTH",
        "..l": "LINE_BY_LINE",
        "..p": "PASTE_ALL",
        "..q": "QUIT",
    }

    def _start_hwnd_tracker(self):
        """Background thread: polls GetForegroundWindow every 100ms and caches
        the last window that is NOT TITAN's own HUD. This guarantees capture_for_code
        and capture_for_mcq always have a valid non-TITAN target HWND, eliminating
        the race condition where Qt repaints steal focus before GetForegroundWindow
        can be called at trigger time.
        """
        def _track():
            while True:
                try:
                    fg = win32gui.GetForegroundWindow()
                    # Only cache if it's a real visible non-TITAN window
                    if fg and fg != getattr(self, '_zorder_hwnd_cache', 0):
                        self._last_target_hwnd = fg
                except Exception:
                    pass
                time.sleep(0.1)

        t = threading.Thread(target=_track, daemon=True, name="HWNDTracker")
        t.start()

    def _fire_sequence_action(self, action):
        """Dispatch a magic-sequence action to the correct handler.
        Uses defined pyqtSignal.emit() for thread-safe cross-thread delivery.
        """
        dispatch = {
            "CODE_CAPTURE": self.trigger_code_signal.emit,
            "MCQ_CAPTURE":  self.trigger_mcq_signal.emit,
            "TOGGLE_HUD":   self.trigger_hide_signal.emit,
            "STEALTH":      self.trigger_stealth_signal.emit,
            "LINE_BY_LINE": self.trigger_line_signal.emit,
            "PASTE_ALL":    self.trigger_paste_signal.emit,
            "QUIT":         self.trigger_quit_signal.emit,
        }
        handler = dispatch.get(action)
        if handler:
            handler()

    def _cleanup_trigger_chars(self, count):
        """Backspace away the trigger chars so they don't stay in the text field."""
        time.sleep(0.02)
        ctrl = keyboard.Controller()
        for _ in range(count):
            ctrl.press(keyboard.Key.backspace)
            ctrl.release(keyboard.Key.backspace)
            time.sleep(0.008)

    def _raw_key_poller_thread(self):
        import ctypes
        import time
        
        VK_F2 = 0x71
        VK_F3 = 0x72
        VK_F4 = 0x73   # MCQ trigger (replaces Alt+Y)
        VK_F5 = 0x74
        VK_F6 = 0x75
        VK_F8 = 0x77
        VK_F9 = 0x78
        VK_MENU = 0x12
        VK_T = 0x54

        state = {VK_F2: False, VK_F3: False, VK_F4: False, VK_F5: False,
                 VK_F6: False, VK_F8: False, VK_F9: False, VK_T: False}
        
        def is_pressed(vk):
            return (ctypes.windll.user32.GetAsyncKeyState(vk) & 0x8000) != 0

        while True:
            try:
                alt_down = is_pressed(VK_MENU)
                for vk in list(state.keys()):
                    pressed = is_pressed(vk)
                    if pressed and not state[vk]:
                        state[vk] = True
                        if vk == VK_F2:
                            self.trigger_hide_signal.emit()
                        elif vk == VK_F3:
                            self.trigger_stealth_signal.emit()
                            self.flash_key_hint_signal.emit("F3 Stealth")
                        elif vk == VK_F4:
                            # F4: MCQ trigger (no Alt modifier needed — standalone key)
                            self.trigger_mcq_signal.emit()
                            self.flash_key_hint_signal.emit("F4 MCQ")
                        elif vk == VK_F5:
                            self.trigger_code_signal.emit()
                            self.flash_key_hint_signal.emit("F5 Code")
                        elif vk == VK_F6:
                            self.trigger_line_signal.emit()
                            self.flash_key_hint_signal.emit("F6 Line")
                        elif vk == VK_F8:
                            # F8 without ghost mode: no-op (ghost removed)
                            pass
                        elif vk == VK_F9:
                            self.trigger_paste_signal.emit()
                            self.flash_key_hint_signal.emit("F9 Paste")
                        elif vk == VK_T:
                            if alt_down:
                                self.trigger_quit_signal.emit()
                    elif not pressed and state[vk]:
                        state[vk] = False
            except Exception:
                pass
            time.sleep(0.02)

    def start_global_key_listener(self):
        import threading
        t = threading.Thread(target=self._raw_key_poller_thread, daemon=True, name="RawKeyPoller")
        t.start()
        
        self.alt_pressed = False
        seq_buffer = deque(maxlen=len(self._SEQ_PREFIX) + 1)
        seq_last_time = [0.0]

        def on_press(key):
            # ── 1. Existing hotkeys (F-keys, Alt combos) ──
            try:
                pass # Handled by _raw_key_poller_thread
            except AttributeError:
                pass

            # ── 2. Magic sequence detection ──
            try:
                ch = key.char
                if ch is None:
                    return
            except AttributeError:
                return

            now = time.time() * 1000
            if now - seq_last_time[0] > self._SEQ_TIMEOUT_MS:
                seq_buffer.clear()
            seq_last_time[0] = now
            seq_buffer.append(ch)

            current = "".join(seq_buffer)
            for trigger, action in self._SEQ_TRIGGERS.items():
                if current.endswith(trigger):
                    threading.Thread(
                        target=self._cleanup_trigger_chars,
                        args=(len(trigger),),
                        daemon=True,
                    ).start()
                    seq_buffer.clear()
                    self._fire_sequence_action(action)
                    return

        def on_release(key):
            if key == keyboard.Key.alt_l or key == keyboard.Key.alt_r:
                self.alt_pressed = False

        listener = keyboard.Listener(on_press=on_press, on_release=on_release)
        listener.daemon = True
        listener.start()

    # ── Ghost key-intercept mode (F7 activate / F8 stop) ─────────────────
    # No suppress=True — zero AV/anti-cheat signatures.
    # Non-suppressing listener detects keypresses, then immediately
    # Backspace (delete user char) + type AI char. Net effect: AI char
    # appears instead of what user typed.

    def activate_ghost_mode(self):
        """F7: Activate key-intercept ghost mode.
        Each keypress the user makes is replaced with the next AI answer char.
        Backspace passes through normally. F8 / answer exhaustion stops.
        """
        if self._ghost_mode:
            return

        raw = self.output.toPlainText().strip()
        answer = self._extract_code_for_typing(raw) if raw else ""
        if not answer:
            self.set_output_signal.emit("[Ghost] No answer loaded yet. Press F5 first.")
            return

        self._ghost_text = answer
        self._ghost_original_text = raw
        with self._ghost_lock:
            self._ghost_pos = 0
        self._ghost_mode = True
        self.set_output_signal.emit(
            f"[Ghost ON ─ {len(answer)} chars] Type any keys → AI answer appears. F8 = stop."
        )

        _ctrl = keyboard.Controller()

        def _on_ghost_press(key):
            """Non-suppressing callback — runs on the listener thread."""
            try:
                if not self._ghost_mode:
                    return False  # stop listener

                # F8 → stop ghost mode
                if key == keyboard.Key.f8:
                    QTimer.singleShot(0, self.stop_ghost_mode)
                    return False

                # Backspace → let it pass through (non-suppressing), don't advance
                if key == keyboard.Key.backspace:
                    return

                # Skip all modifier/special keys — don't advance AI pointer
                if isinstance(key, keyboard.Key):
                    return

                # F-keys handled by global listener, skip here
                # Printable key → replace with AI char
                with self._ghost_lock:
                    pos = self._ghost_pos
                    if pos >= len(self._ghost_text):
                        QTimer.singleShot(0, self.stop_ghost_mode)
                        return False
                    self._ghost_pos += 1

                ch = self._ghost_text[pos]

                def _replace(c):
                    """Delete user's char, type AI char instead."""
                    import time as _t
                    _t.sleep(0.012)  # ensure user's char is committed first
                    try:
                        # Delete what user just typed
                        _ctrl.press(keyboard.Key.backspace)
                        _ctrl.release(keyboard.Key.backspace)
                        _t.sleep(0.005)
                        # Type AI char
                        if c == '\n':
                            _ctrl.press(keyboard.Key.enter)
                            _ctrl.release(keyboard.Key.enter)
                        elif c == '\t':
                            _ctrl.press(keyboard.Key.tab)
                            _ctrl.release(keyboard.Key.tab)
                        else:
                            _ctrl.type(c)
                    except Exception:
                        pass

                threading.Thread(target=_replace, args=(ch,), daemon=True).start()

            except Exception:
                pass  # never crash the listener thread

        # Non-suppressing listener — no AV signatures
        self._ghost_listener = keyboard.Listener(
            on_press=_on_ghost_press,
            suppress=False
        )
        self._ghost_listener.daemon = True
        self._ghost_listener.start()

    def stop_ghost_mode(self):
        """F8 / auto: Stop ghost key-intercept and restore original answer text."""
        if not self._ghost_mode and self._ghost_listener is None:
            return

        self._ghost_mode = False

        with self._ghost_lock:
            self._ghost_pos = 0

        gl = self._ghost_listener
        self._ghost_listener = None
        if gl is not None:
            try:
                if gl.is_alive():
                    gl.stop()
            except Exception:
                pass

        original = self._ghost_original_text
        self._ghost_text = ""
        self._ghost_original_text = ""
        self.set_output_signal.emit(original if original else "[Ghost OFF ─ keyboard restored]")


    def _ensure_topmost_if_visible(self):
        """Re-assert Z-order only when the HUD is already visible.
        Never shows a hidden window — visibility is F2/..h only."""
        if getattr(self, 'is_hidden', False):
            return
        self.show_window()

    # ── CODING MODE (F5) ──
    def capture_for_code(self):
        """Run silently — never pops the HUD. Results stored internally.
        Double-trigger guard: if already processing, ignore the second press.
        """
        if getattr(self, '_processing', False):
            return
        self._processing = True
        self.mode = 'code'

        # Use the continuously-cached last non-TITAN foreground window.
        # This is immune to the Qt-repaint focus-steal race condition that
        # caused GetForegroundWindow() at trigger time to return TITAN's own HUD.
        target_hwnd = self._last_target_hwnd

        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for Code AI...")
        self.extract_thread = CodeExtractThread(target_hwnd)
        self.extract_thread.finished.connect(self._on_capture_done)
        self.extract_thread.error.connect(self._on_extract_error)
        self.extract_thread.start()

    # ── MCQ MODE (Alt+Y) ──
    def capture_for_mcq(self):
        """Run silently — never pops the HUD. Results stored internally.
        Double-trigger guard: if already processing, ignore the second press.
        """
        if getattr(self, '_processing', False):
            return
        self._processing = True
        self.mode = 'mcq'

        # Same cached HWND — guaranteed non-TITAN, always fresh.
        target_hwnd = self._last_target_hwnd

        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for MCQ AI...")
        self.extract_thread = McqExtractThread(target_hwnd)
        self.extract_thread.finished.connect(self._on_capture_done)
        self.extract_thread.error.connect(self._on_extract_error)
        self.extract_thread.start()

    def _on_window_text(self, text):
        self.text_input.setPlainText(text)

    def _on_capture_done(self, text):
        self.accumulated_text = text or ""
        self.text_input.setPlainText(self.accumulated_text)
        text_to_send = self.accumulated_text.strip()
        if not text_to_send:
            # Update HUD silently (visible only if already shown)
            self._processing = False
            self.text_input.setDisabled(False)
            self._ensure_topmost_if_visible()
            self.output.setText("❌ Nothing captured. Ensure the target window is active and contains text.")
            return

        self._ensure_topmost_if_visible()
        self.output.setText("2/3 ⏳ Sending to AI... (press F2 to view response when ready)")
        self.text_input.setDisabled(True)

        if self.mode == 'code':
            self.worker = CodeChatbotThread(text_to_send, self.api_keys)
            self.worker.response_ready.connect(self.handle_response_signal.emit)
            self.worker.error_occurred.connect(self.handle_error_signal.emit)
        else:
            self.worker = McqChatbotThread(text_to_send, self.api_keys)
            self.worker.response_ready.connect(self._handle_mcq_response)
            self.worker.option_ready.connect(self._move_cursor)
            self.worker.error_occurred.connect(self.handle_error_signal.emit)

        self.worker.start()

    # ── Response Handlers ──
    def _handle_code_response(self, response):
        """Store AI response silently. HUD shows it when user presses F2."""
        self._processing = False
        self._ensure_topmost_if_visible()
        clean = (response or "").strip()
        self.output.setText(f"3/3 ✅ AI Response Ready — press F2 to view:\n\n{clean}" if clean else "❌ No response received.")
        self.text_input.setDisabled(False)
        self.response_lines = self._extract_code_for_typing(clean).splitlines()
        self.current_line_index = 0
        self._typing_in_progress = False  # reset F6 guard

    def _handle_mcq_response(self, answer_text, digit):
        """Store MCQ answer silently. HUD shows it when user presses F2."""
        self._processing = False
        self._ensure_topmost_if_visible()
        display = f"3/3 ✅ MCQ Answer Ready — press F2 to view:\n\n{answer_text}\n\n✓ Selected: Option {digit}"
        self.output.setText(display)
        self.text_input.clear()
        self.text_input.setDisabled(False)

    def _on_extract_error(self, error_text: str):
        """Extraction failed (e.g. no window, COM error). Reset guard and show message."""
        self._processing = False
        self.output.setText(f"⚠ Capture failed: {error_text}\nEnsure the target window is active.")
        self.text_input.setDisabled(False)

    def _handle_error(self, error_text: str):
        # Store error silently — user sees it when they open the HUD.
        self._processing = False
        self._typing_in_progress = False
        self._ensure_topmost_if_visible()
        display = f"⚠ {error_text}" if error_text else "⚠ Unknown error — please retry."
        self.output.setText(display)
        self.text_input.setDisabled(False)


    # ── MCQ Cursor Movement ──
    def _get_option_positions(self):
        screen_width, screen_height = pyautogui.size()
        positions = {
            '1': (EDGE_PADDING, EDGE_PADDING),
            '2': (screen_width - EDGE_PADDING, EDGE_PADDING),
            '3': (EDGE_PADDING, screen_height - EDGE_PADDING),
            '4': (screen_width - EDGE_PADDING, screen_height - EDGE_PADDING)
        }
        for option in ('1', '2', '3', '4'):
            x_val = os.getenv(f"OPT_{option}_X")
            y_val = os.getenv(f"OPT_{option}_Y")
            if x_val is not None and y_val is not None:
                try:
                    x = max(0, min(int(x_val), screen_width - 1))
                    y = max(0, min(int(y_val), screen_height - 1))
                    positions[option] = (x, y)
                except ValueError:
                    pass
        return positions

    def _move_cursor(self, position):
        if position not in ('1', '2', '3', '4'):
            return
        positions = self._get_option_positions()
        try:
            x, y = positions[position]
            pyautogui.moveTo(x, y, duration=CURSOR_MOVE_DURATION_SECONDS)
        except Exception:
            pass

    # ── Code Typing (F6) ──
    def type_next_line(self):
        """Type one response line per F6 press — runs on background thread so HUD stays responsive."""
        if not self.response_lines:
            current = self._extract_code_for_typing(self.output.toPlainText())
            if not current:
                return
            self.response_lines = current.splitlines()
            self.current_line_index = 0

        if self.current_line_index >= len(self.response_lines):
            return

        # Snapshot index + line before spawning thread (avoid race)
        line = self.response_lines[self.current_line_index]
        self.current_line_index += 1

        def _type_line(ln):
            for ch in ln:
                pyautogui.write(ch)
                if ch == ' ':
                    time.sleep(random.uniform(0.08, 0.18))
                elif random.random() < 0.08:
                    time.sleep(random.uniform(0.4, 0.9))
                else:
                    time.sleep(random.uniform(0.15, 0.35))
            pyautogui.press('enter')

        threading.Thread(target=_type_line, args=(line,), daemon=True).start()

    def _extract_code_for_typing(self, text):
        clean = (text or "").strip()
        if not clean:
            return ""
        blocks = re.findall(r"```(?:[a-zA-Z0-9_+-]+)?\n([\s\S]*?)```", clean)
        if blocks:
            best = max(blocks, key=lambda b: len(b.strip()))
            return best.strip()
        return clean

    # ── F9: Type all code character-by-character (no clipboard, no OCR) ──
    # ── F9: Type all code character-by-character (no clipboard, no OCR) ──
    def paste_all_code(self):
        """F9 / ..p — type every character of the AI code directly into the
        active window using pyautogui.write() line-by-line.
        Guards: aborts if ghost mode active, or already pasting.
        """
        if getattr(self, '_ghost_mode', False):
            self.set_output_signal.emit("[F9] Already processing, please wait.")
            return
        if getattr(self, '_paste_in_progress', False):
            return
        raw = self.output.toPlainText().strip()
        code = self._extract_code_for_typing(raw)
        if not code:
            self.set_output_signal.emit("[F9] No code ready — press F5 first.")
            return

        self._paste_in_progress = True

        def _countdown_and_type(text):
            try:
                for i in (2, 1):
                    self.set_output_signal.emit(
                        f"[F9 TYPE] Click target window — typing in {i}s\n\n{text[:120]}..."
                    )
                    time.sleep(1)

                import pyautogui
                pyautogui.FAILSAFE = False
                pyautogui.PAUSE = 0

                _CHAR_INTERVAL = 0.025
                _LINE_DELAY = 0.05

                lines_list = text.split('\n')
                total = len(text)
                for line_idx, ln in enumerate(lines_list):
                    segments = ln.split('\t')
                    for seg_idx, seg in enumerate(segments):
                        if seg:
                            pyautogui.write(seg, interval=_CHAR_INTERVAL)
                        if seg_idx < len(segments) - 1:
                            pyautogui.press('tab')
                            time.sleep(0.01)
                    if line_idx < len(lines_list) - 1:
                        pyautogui.press('enter')
                        time.sleep(_LINE_DELAY)
                self.set_output_signal.emit(f"[F9 ✓] Typed {total} chars.")
            except Exception as e:
                self.set_output_signal.emit(f"[F9] Typing error: {e}")
            finally:
                self._paste_in_progress = False

        threading.Thread(target=_countdown_and_type, args=(code,), daemon=True).start()

    def closeEvent(self, event):
        """Hide window on close — use Alt+T to fully exit."""
        event.ignore()
        self.stop_ghost_mode()  # restore keyboard if ghost mode is active
        self.hide_window()
        self.is_hidden = True


if __name__ == "__main__":
    # ── Read credentials from launcher via stdin pipe (zero disk footprint) ──
    _RUNTIME_API_KEYS, _RUNTIME_LANGUAGE, _RUNTIME_MODEL = _read_credentials_from_stdin()

    app = QApplication(sys.argv)
    window = UnifiedChatbotUI(api_keys=_RUNTIME_API_KEYS)

    # Defer show_window until Qt event loop has processed the first paint.
    # This guarantees winId() / HWND is valid before Win32 calls are made.
    # Without this delay the window may appear invisible when run directly
    # (without the launcher) because HWND is 0 at the point show_window() runs.
    QTimer.singleShot(50, window.show_window)

    sys.exit(app.exec_())
