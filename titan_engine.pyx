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
from pynput import keyboard
import threading
import queue
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



class CodeExtractThread(threading.Thread):
    def __init__(self, target_hwnd: int = 0, window=None):
        super().__init__(daemon=True)
        self._target_hwnd = target_hwnd  # pre-captured non-TITAN hwnd from HWNDTracker
        self.window = window

    def run(self):
        try:
            text = _uia_extract_texts(
                self._target_hwnd,
                control_types=("Text", "Edit")
            )
            if self.window:
                self.window.main_thread_queue.put(('_on_capture_done', text.strip()))
                win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)
        except Exception as e:
            if self.window:
                self.window.main_thread_queue.put(('_on_extract_error', str(e)))
                win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)

class CodeSignalMock:
    def __init__(self, callback):
        self.callback = callback
    def emit(self, *args):
        self.callback(*args)

class CodeChatbotThread(threading.Thread):
    """Thread to send a prompt to a generative model (if api_key provided) or return a local fallback."""
    MAX_429_RETRIES = 1
    BASE_429_BACKOFF_SECONDS = 1

    MODEL_FALLBACKS = [
        "gemini-2.5-flash-lite",
        "gemini-2.5-flash",
        "gemini-2.0-flash",
        "gemini-flash-latest",
    ]

    def __init__(self, prompt, api_keys=None, window=None):
        super().__init__(daemon=True)
        self.prompt = prompt
        self.api_keys = list(api_keys or [])
        self.window = window
        self.response_ready = CodeSignalMock(self._emit_response)
        self.error_occurred = CodeSignalMock(self._emit_error)

    def _emit_response(self, clean):
        if self.window:
            self.window.main_thread_queue.put(('_handle_code_response', clean))
            win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)

    def _emit_error(self, err_text):
        if self.window:
            self.window.main_thread_queue.put(('_handle_error', err_text))
            win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)

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


class McqExtractThread(threading.Thread):
    def __init__(self, target_hwnd: int = 0, window=None):
        super().__init__(daemon=True)
        self._target_hwnd = target_hwnd  # pre-captured before any Qt UI updates
        self.window = window

    def run(self):
        try:
            text = mcq_extract_window_text_from_foreground(self._target_hwnd)
            if self.window:
                self.window.main_thread_queue.put(('_on_capture_done', text))
                win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)
        except Exception as e:
            if self.window:
                self.window.main_thread_queue.put(('_on_extract_error', str(e)))
                win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)


class McqSignalMock:
    def __init__(self, callback):
        self.callback = callback
    def emit(self, *args):
        self.callback(*args)

class McqChatbotThread(threading.Thread):
    _cached_model_candidates = []
    _model_cache_built = False
    _preferred_route = None  # tuple(api_version, model_name)
    _preferred_api_key = None
    _route_cooldowns = {}  # (api_version, model_name) -> monotonic timestamp
    _api_key_cooldowns = {}  # api_key -> monotonic timestamp
    
    def __init__(self, prompt, api_keys, window=None):
        super().__init__(daemon=True)
        self.prompt = prompt
        self.api_keys = list(api_keys or [])
        self.window = window
        self.error_occurred = McqSignalMock(self._emit_error)
        self.response_ready = McqSignalMock(self._emit_response)
        self.option_ready = McqSignalMock(self._emit_option)

    def _emit_error(self, err_text):
        if self.window:
            self.window.main_thread_queue.put(('_handle_error', err_text))
            win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)

    def _emit_response(self, full_answer_text, digit):
        if self.window:
            self.window.main_thread_queue.put(('_handle_mcq_response', full_answer_text, digit))
            win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)

    def _emit_option(self, digit):
        if self.window:
            self.window.main_thread_queue.put(('_move_cursor', digit))
            win32gui.PostMessage(self.window.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)

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
import ctypes.wintypes

# Custom WM_USER messages
WM_TOGGLE_VISIBILITY = win32con.WM_USER + 101
WM_CYCLE_STEALTH = win32con.WM_USER + 102
WM_UPDATE_TEXT = win32con.WM_USER + 103
WM_MAIN_THREAD_CALLBACK = win32con.WM_USER + 104

def get_dpi_scale():
    """Enable DPI awareness and retrieve the system DPI scale factor."""
    try:
        ctypes.windll.shcore.SetProcessDpiAwareness(2)
    except Exception:
        try:
            ctypes.windll.user32.SetProcessDPIAware()
        except Exception:
            pass
            
    try:
        hdc = win32gui.GetDC(0)
        dpi = win32gui.GetDeviceCaps(hdc, win32con.LOGPIXELSY)
        win32gui.ReleaseDC(0, hdc)
        return dpi / 96.0
    except Exception:
        return 1.0

# Pre-calculate DPI scale factor
DPI_SCALE = get_dpi_scale()

_WinEventProc = ctypes.WINFUNCTYPE(
    None,
    ctypes.c_void_p,
    ctypes.wintypes.DWORD,
    ctypes.wintypes.HWND,
    ctypes.wintypes.LONG,
    ctypes.wintypes.LONG,
    ctypes.wintypes.DWORD,
    ctypes.wintypes.DWORD
)

class Win32SignalMock:
    def __init__(self, window, method_name):
        self.window = window
        self.method_name = method_name
    def emit(self, *args):
        # Headless: queue the callback directly; the queue-drainer thread handles it
        if self.window:
            self.window.main_thread_queue.put((self.method_name,) + args)

class MockTextEdit:
    def __init__(self, parent_overlay=None, is_output=False):
        self.parent = parent_overlay
        self.is_output = is_output
        self._text = ""

    def setVisible(self, val):
        pass

    def setEnabled(self, val):
        pass

    def setDisabled(self, val):
        pass

    def setReadOnly(self, val):
        pass

    def setAcceptRichText(self, val):
        pass

    def setVerticalScrollBarPolicy(self, val):
        pass

    def setSizePolicy(self, *args):
        pass

    def setStyleSheet(self, val):
        pass

    def setPlaceholderText(self, val):
        pass

    def clear(self):
        self._text = ""
        if self.is_output and self.parent:
            self.parent.update_text("")

    def setPlainText(self, text):
        self._text = text
        if self.is_output and self.parent:
            self.parent.update_text(text)

    def setText(self, text):
        self._text = text
        if self.is_output and self.parent:
            self.parent.update_text(text)

    def toPlainText(self):
        return self._text

class UnifiedChatbotUI:
    def __init__(self, api_keys=None):
        self.api_keys = list(api_keys or [])
        self.mode = None  # 'code' or 'mcq'
        self.response_lines = []
        self.current_line_index = 0
        self.accumulated_text = ""
        self._processing = False        # True while extract+AI cycle is running
        self._typing_in_progress = False # True while F6 line is being typed
        self._paste_in_progress = False  # True while F9 paste is running
        self._last_target_hwnd = 0

        # QTextEdit emulation
        self.text_input = MockTextEdit(self, is_output=False)
        self.output = MockTextEdit(self, is_output=True)

        self.label_text = "TITAN"
        self.visible = False
        self.is_hidden = True
        self.is_stealth = False
        self._stealth_level = 0
        self.alpha_levels = [210, 38, 12]

        self.main_thread_queue = queue.Queue()
        self._flash_timer = None

        # Custom signals mock (wraps queue + PostMessage to main thread)
        self.window_text_ready = Win32SignalMock(self, '_on_window_text')
        self.set_output_signal = Win32SignalMock(self, '_set_output_text')
        self.handle_response_signal = Win32SignalMock(self, '_handle_code_response')
        self.handle_error_signal = Win32SignalMock(self, '_handle_error')

        self.trigger_code_signal = Win32SignalMock(self, 'capture_for_code')
        self.trigger_mcq_signal = Win32SignalMock(self, 'capture_for_mcq')
        self.trigger_line_signal = Win32SignalMock(self, 'type_next_line')
        self.trigger_paste_signal = Win32SignalMock(self, 'paste_all_code')
        self.trigger_hide_signal = Win32SignalMock(self, 'toggle_visibility')
        self.trigger_stealth_signal = Win32SignalMock(self, 'toggle_stealth_mode')
        self.trigger_quit_signal = Win32SignalMock(self, '_quit_app')
        self.flash_key_hint_signal = Win32SignalMock(self, '_flash_key_hint')

        # ── HEADLESS MODE: GDI brushes and native window are disabled ──
        self.hBrushOuter = None
        self.hBrushInner = None
        self.hBrushKey   = None
        self.hwnd        = 0   # no window handle

        # Start key listeners & trackers (no GUI dependency)
        self.start_global_key_listener()
        self._start_hwnd_tracker()
        self._start_zorder_guardians()

        # Queue-drainer: dispatches main_thread_queue callbacks from background threads
        threading.Thread(target=self._queue_drainer, daemon=True).start()

    def _create_native_window(self):
        # ── HEADLESS MODE: window creation is disabled ──
        self.class_name = "ctfmon"
        self.hwnd      = 0
        self.hwnd_edit = 0
        self.W = 0
        self.H = 0

    def _queue_drainer(self):
        """Headless callback dispatcher — replaces Win32 PumpMessages loop."""
        while True:
            try:
                action_tuple = self.main_thread_queue.get(timeout=0.1)
                action = action_tuple[0]
                args   = action_tuple[1:]
                if hasattr(self, action):
                    try:
                        getattr(self, action)(*args)
                    except Exception:
                        pass
            except Exception:
                pass  # queue.Empty or any timeout — just continue

    def get_font(self, name, size_px, bold=False):
        lf = win32gui.LOGFONT()
        lf.lfHeight = -int(size_px * DPI_SCALE)
        lf.lfWeight = win32con.FW_BOLD if bold else win32con.FW_NORMAL
        lf.lfFaceName = name
        return win32gui.CreateFontIndirect(lf)

    def _wnd_proc(self, hwnd, message, wparam, lparam):
        if message == win32con.WM_PAINT:
            hdc, ps = win32gui.BeginPaint(hwnd)
            win32gui.EndPaint(hwnd, ps)
            return 0

        elif message == win32con.WM_CTLCOLORSTATIC:
            hdc_edit = wparam
            win32gui.SetTextColor(hdc_edit, win32api.RGB(224, 224, 224))
            win32gui.SetBkColor(hdc_edit, win32api.RGB(18, 18, 26))
            return int(self.hBrushInner)

        elif message == WM_TOGGLE_VISIBILITY:
            if self.visible:
                win32gui.SetWindowPos(
                    hwnd,
                    win32con.HWND_TOPMOST,
                    0, 0, 0, 0,
                    win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE | win32con.SWP_SHOWWINDOW
                )
            else:
                win32gui.ShowWindow(hwnd, win32con.SW_HIDE)
            return 0

        elif message == WM_CYCLE_STEALTH:
            LWA_COLORKEY = 0x00000001
            LWA_ALPHA = 0x00000002
            ctypes.windll.user32.SetLayeredWindowAttributes(
                hwnd,
                win32api.RGB(255, 0, 255),
                self.alpha_levels[self._stealth_level],
                LWA_COLORKEY | LWA_ALPHA
            )
            return 0

        elif message == WM_UPDATE_TEXT:
            # Headless: do not update any UI control
            return 0

        elif message == WM_MAIN_THREAD_CALLBACK:
            try:
                while not self.main_thread_queue.empty():
                    action_tuple = self.main_thread_queue.get_nowait()
                    action = action_tuple[0]
                    args = action_tuple[1:]
                    if hasattr(self, action):
                        getattr(self, action)(*args)
            except Exception:
                pass
            return 0

        elif message == win32con.WM_NCHITTEST:
            x = lparam & 0xFFFF
            y = (lparam >> 16) & 0xFFFF

            client_pt = win32gui.ScreenToClient(hwnd, (x, y))
            cx, cy = client_pt[0], client_pt[1]

            edit_left = int(22 * DPI_SCALE)
            edit_top = int(40 * DPI_SCALE)
            edit_right = self.W - int(22 * DPI_SCALE)
            edit_bottom = self.H - int(48 * DPI_SCALE)

            if edit_left <= cx <= edit_right and edit_top <= cy <= edit_bottom:
                return win32con.HTCLIENT

            return win32con.HTCAPTION

        elif message == win32con.WM_DESTROY:
            win32gui.DeleteObject(self.hBrushOuter)
            win32gui.DeleteObject(self.hBrushInner)
            win32gui.DeleteObject(self.hBrushKey)
            win32gui.PostQuitMessage(0)
            return 0

        return win32gui.DefWindowProc(hwnd, message, wparam, lparam)

    def update_text(self, text):
        if self.hwnd:
            win32gui.PostMessage(self.hwnd, WM_UPDATE_TEXT, 0, 0)

    def trigger_repaint(self):
        if self.hwnd:
            win32gui.InvalidateRect(self.hwnd, None, True)
            win32gui.UpdateWindow(self.hwnd)

    def _set_output_text(self, text):
        self.output.setText(text)

    def _quit_app(self):
        global _RUNTIME_API_KEYS, _RUNTIME_LANGUAGE
        try:
            for i in range(len(_RUNTIME_API_KEYS)):
                _RUNTIME_API_KEYS[i] = " " * 64
        except Exception:
            pass
        _RUNTIME_API_KEYS = []
        _RUNTIME_LANGUAGE = ""
        self.stop_ghost_mode()
        if self.hwnd:
            win32gui.PostMessage(self.hwnd, win32con.WM_DESTROY, 0, 0)
        import os as _os
        _os._exit(0)

    def show_window(self):
        self.visible = False
        self.is_hidden = True

    def hide_window(self):
        self.visible = False
        self.is_hidden = True

    def toggle_visibility(self):
        pass

    def toggle_stealth_mode(self):
        pass

    def _flash_key_hint(self, key_name: str):
        pass
        self._ensure_topmost_if_visible()
        self.label_text = f"▊ {key_name} ▊"
        self.trigger_repaint()
        if self._flash_timer is not None:
            try:
                self._flash_timer.cancel()
            except Exception:
                pass
        self._flash_timer = threading.Timer(1.2, self._restore_label)
        self._flash_timer.start()

    def _restore_label(self):
        self.label_text = "TITAN"
        self.main_thread_queue.put(('trigger_repaint',))
        if self.hwnd:
            win32gui.PostMessage(self.hwnd, WM_MAIN_THREAD_CALLBACK, 0, 0)

    def _ensure_topmost_if_visible(self):
        if self.is_hidden:
            return
        if self.hwnd:
            win32gui.SetWindowPos(
                self.hwnd,
                win32con.HWND_TOPMOST,
                0, 0, 0, 0,
                win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE
            )

    def _start_hwnd_tracker(self):
        def _track():
            while True:
                try:
                    fg = win32gui.GetForegroundWindow()
                    if fg and fg != self.hwnd:
                        self._last_target_hwnd = fg
                except Exception:
                    pass
                time.sleep(0.1)

        t = threading.Thread(target=_track, daemon=True, name="HWNDTracker")
        t.start()

    def _start_zorder_guardians(self):
        # Hook Guardian
        def _on_fg_change(hHook, event, hwnd, idObject, idChild, dwThread, dwTime):
            try:
                if self.hwnd and self.visible:
                    if hwnd != self.hwnd:
                        win32gui.SetWindowPos(
                            self.hwnd,
                            win32con.HWND_TOPMOST,
                            0, 0, 0, 0,
                            win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE | win32con.SWP_SHOWWINDOW
                        )
            except Exception:
                pass

        _cb_ref = _WinEventProc(_on_fg_change)
        self._zorder_cb_ref = _cb_ref

        def _hook_thread():
            EVENT_SYSTEM_FOREGROUND = 0x0003
            WINEVENT_OUTOFCONTEXT = 0x0002
            hook = ctypes.windll.user32.SetWinEventHook(
                EVENT_SYSTEM_FOREGROUND, EVENT_SYSTEM_FOREGROUND,
                None,
                _cb_ref,
                0, 0,
                WINEVENT_OUTOFCONTEXT
            )
            msg = ctypes.wintypes.MSG()
            while ctypes.windll.user32.GetMessageW(ctypes.byref(msg), None, 0, 0) > 0:
                ctypes.windll.user32.TranslateMessage(ctypes.byref(msg))
                ctypes.windll.user32.DispatchMessageW(ctypes.byref(msg))
            if hook:
                ctypes.windll.user32.UnhookWinEvent(hook)

        t1 = threading.Thread(target=_hook_thread, daemon=True, name="ZOrderHookGuardian")
        t1.start()

        # Polling Guardian
        def _poll_thread():
            while True:
                try:
                    if self.hwnd and self.visible:
                        win32gui.SetWindowPos(
                            self.hwnd,
                            win32con.HWND_TOPMOST,
                            0, 0, 0, 0,
                            win32con.SWP_NOMOVE | win32con.SWP_NOSIZE | win32con.SWP_NOACTIVATE
                        )
                except Exception:
                    pass
                time.sleep(0.25)

        t2 = threading.Thread(target=_poll_thread, daemon=True, name="PollingTopmostGuardian")
        t2.start()

    def _fire_sequence_action(self, action):
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
        time.sleep(0.02)
        ctrl = keyboard.Controller()
        for _ in range(count):
            ctrl.press(keyboard.Key.backspace)
            ctrl.release(keyboard.Key.backspace)
            time.sleep(0.008)

    def _raw_key_poller_thread(self):
        VK_F2 = 0x71
        VK_F3 = 0x72
        VK_F4 = 0x73
        VK_F5 = 0x74
        VK_F6 = 0x75
        VK_F9 = 0x78
        VK_MENU = 0x12
        VK_T = 0x54

        state = {VK_F2: False, VK_F3: False, VK_F4: False, VK_F5: False,
                 VK_F6: False, VK_F9: False, VK_T: False}

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
                            self.trigger_mcq_signal.emit()
                            self.flash_key_hint_signal.emit("F4 MCQ")
                        elif vk == VK_F5:
                            self.trigger_code_signal.emit()
                            self.flash_key_hint_signal.emit("F5 Code")
                        elif vk == VK_F6:
                            self.trigger_line_signal.emit()
                            self.flash_key_hint_signal.emit("F6 Line")
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
        t = threading.Thread(target=self._raw_key_poller_thread, daemon=True, name="RawKeyPoller")
        t.start()

        self.alt_pressed = False
        seq_buffer = deque(maxlen=len(self._SEQ_PREFIX) + 1)
        seq_last_time = [0.0]

        def on_press(key):
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

    # Dummy ghost-mode triggers to preserve exact signature/logic compatibility
    def activate_ghost_mode(self):
        pass

    def stop_ghost_mode(self):
        pass

    def capture_for_code(self):
        if getattr(self, '_processing', False):
            return
        self._processing = True
        self.mode = 'code'

        target_hwnd = self._last_target_hwnd
        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for Code AI...")
        self.extract_thread = CodeExtractThread(target_hwnd, self)
        self.extract_thread.start()

    def capture_for_mcq(self):
        if getattr(self, '_processing', False):
            return
        self._processing = True
        self.mode = 'mcq'

        target_hwnd = self._last_target_hwnd
        self._ensure_topmost_if_visible()
        self.output.setText("1/3 🔍 Capturing screen for MCQ AI...")
        self.extract_thread = McqExtractThread(target_hwnd, self)
        self.extract_thread.start()

    def _on_window_text(self, text):
        self.text_input.setPlainText(text)

    def _on_capture_done(self, text):
        self.accumulated_text = text or ""
        self.text_input.setPlainText(self.accumulated_text)
        text_to_send = self.accumulated_text.strip()
        if not text_to_send:
            self._processing = False
            self.text_input.setDisabled(False)
            self._ensure_topmost_if_visible()
            self.output.setText("❌ Nothing captured. Ensure the target window is active and contains text.")
            return

        self._ensure_topmost_if_visible()
        self.output.setText("2/3 ⏳ Sending to AI... (press F2 to view response when ready)")
        self.text_input.setDisabled(True)

        if self.mode == 'code':
            self.worker = CodeChatbotThread(text_to_send, self.api_keys, self)
        else:
            self.worker = McqChatbotThread(text_to_send, self.api_keys, self)

        self.worker.start()

    def _handle_code_response(self, response):
        self._processing = False
        self._ensure_topmost_if_visible()
        clean = (response or "").strip()
        self.output.setText(f"3/3 ✅ AI Response Ready — press F2 to view:\n\n{clean}" if clean else "❌ No response received.")
        self.text_input.setDisabled(False)
        self.response_lines = self._extract_code_for_typing(clean).splitlines()
        self.current_line_index = 0
        self._typing_in_progress = False

    def _handle_mcq_response(self, answer_text, digit):
        self._processing = False
        self._ensure_topmost_if_visible()
        display = f"3/3 ✅ MCQ Answer Ready — press F2 to view:\n\n{answer_text}\n\n✓ Selected: Option {digit}"
        self.output.setText(display)
        self.text_input.clear()
        self.text_input.setDisabled(False)

    def _on_extract_error(self, error_text: str):
        self._processing = False
        self.output.setText(f"⚠ Capture failed: {error_text}\nEnsure the target window is active.")
        self.text_input.setDisabled(False)

    def _handle_error(self, error_text: str):
        self._processing = False
        self._typing_in_progress = False
        self._ensure_topmost_if_visible()
        display = f"⚠ {error_text}" if error_text else "⚠ Unknown error — please retry."
        self.output.setText(display)
        self.text_input.setDisabled(False)

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

    def type_next_line(self):
        if getattr(self, '_typing_in_progress', False):
            return

        if not self.response_lines:
            current = self._extract_code_for_typing(self.output.toPlainText())
            if not current:
                return
            self.response_lines = current.splitlines()
            self.current_line_index = 0

        if self.current_line_index >= len(self.response_lines):
            return

        line = self.response_lines[self.current_line_index]
        self.current_line_index += 1

        def _type_line(ln):
            self._typing_in_progress = True
            
            try:
                ctypes.windll.winmm.timeBeginPeriod(1)
            except:
                pass
                
            try:
                old_pause = pyautogui.PAUSE
                pyautogui.PAUSE = 0.08
                pyautogui.FAILSAFE = False
                
                symbol_chars = set('{}[];,()="\':<>!@#$%^&*_+-|?/')
                end_stmt_chars = set(';})')
                
                for ch in ln:
                    pyautogui.write(ch)
                    
                    if ch == ' ':
                        time.sleep(random.uniform(0.35, 0.55))
                    elif ch in end_stmt_chars:
                        time.sleep(random.uniform(0.60, 1.20))
                    elif ch in symbol_chars:
                        time.sleep(random.uniform(0.40, 0.70))
                    else:
                        if random.random() < 0.08:
                            time.sleep(random.uniform(0.80, 1.50))
                        else:
                            time.sleep(random.uniform(0.25, 0.45))
                        
                pyautogui.press('enter')
                time.sleep(random.uniform(0.80, 1.50))
            finally:
                try:
                    pyautogui.PAUSE = old_pause
                    ctypes.windll.winmm.timeEndPeriod(1)
                except:
                    pass
                self._typing_in_progress = False

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

    def paste_all_code(self):
        if getattr(self, '_paste_in_progress', False):
            return
        raw = self.output.toPlainText().strip()
        code = self._extract_code_for_typing(raw)
        if not code:
            self.output.setText("[F9] No code ready — press F5 first.")
            return

        self._paste_in_progress = True

        def _countdown_and_type(text):
            try:
                for i in (2, 1):
                    self.output.setText(
                        f"[F9 TYPE] Click target window — typing in {i}s\n\n{text[:120]}..."
                    )
                    time.sleep(1)

                import pyautogui
                pyautogui.FAILSAFE = False
                pyautogui.PAUSE = 0

                _CHAR_INTERVAL = 0.002
                _LINE_DELAY = 0.01

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
                self.output.setText(f"[F9 ✓] Typed {total} chars.")
            except Exception as e:
                self.output.setText(f"[F9] Typing error: {e}")
            finally:
                self._paste_in_progress = False

        threading.Thread(target=_countdown_and_type, args=(code,), daemon=True).start()

    def closeEvent(self, event):
        pass

def run_engine():
    global _RUNTIME_API_KEYS, _RUNTIME_LANGUAGE, _RUNTIME_MODEL
    _RUNTIME_API_KEYS, _RUNTIME_LANGUAGE, _RUNTIME_MODEL = _read_credentials_from_stdin()

    # ── HEADLESS MODE: no window shown, engine runs invisibly in background ──
    window = UnifiedChatbotUI(api_keys=_RUNTIME_API_KEYS)  # starts hotkeys + threads

    # Keep the main thread alive; the queue-drainer and pynput listener run as daemons
    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass

if __name__ == "__main__":
    run_engine()
