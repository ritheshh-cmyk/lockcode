"""
Main Launcher Entry Point
Validates license → pipes API keys + language → launches ctfmon.exe via stdin
Keys are NEVER written to disk after validation.

Flow:
  1. Saved key exists → verify from server silently
     a. Server OK + valid   → update saved settings → launch
     b. Server OK + invalid → delete saved key → show GUI ("Key expired/banned")
     c. Server unreachable  → use last saved settings → launch anyway
  2. No saved key → show registration GUI
"""

import atexit
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from datetime import datetime, timezone

from cryptography.fernet import Fernet

from launcher_gui import RegistrationWindow
from machine_id import get_machine_id
from api_validator import validate_registration

# PyQt5 app management
from PyQt5.QtWidgets import QApplication

# ============================================================
# CONFIGURATION — Update before building the EXE
# ============================================================
APP_NAME         = "LockApp"
BUNDLED_EXE_NAME = "ctfmon.exe"
FERNET_KEY       = b"AkOMIsXmgK7veF1rKMv6c7NazPzYWrRwMAILVLGTG-M="
# ============================================================


def _get_appdata_dir() -> str:
    base    = os.environ.get("APPDATA", os.path.expanduser("~"))
    app_dir = os.path.join(base, APP_NAME)
    os.makedirs(app_dir, exist_ok=True)
    return app_dir


def _get_session_path() -> str:
    return os.path.join(_get_appdata_dir(), "session.json")


def _find_bundled(filename: str) -> str:
    """Locate a bundled file in PyInstaller or dev mode."""
    if hasattr(sys, "_MEIPASS"):
        return os.path.join(sys._MEIPASS, filename)
    candidates = [
        os.path.join(os.path.dirname(__file__), "..", "app", filename),
        os.path.join(os.path.dirname(__file__), filename),
    ]
    for c in candidates:
        if os.path.exists(c):
            return os.path.abspath(c)
    return filename


# ── Saved Session (Fernet-encrypted) ─────────────────────────
# Stores reg_key + last-known settings so the app works offline.
# Server is always checked first; this is only a fallback.

def _encrypt_data(data: dict) -> bytes:
    return Fernet(FERNET_KEY).encrypt(json.dumps(data).encode("utf-8"))


def _decrypt_data(token: bytes) -> dict:
    return json.loads(Fernet(FERNET_KEY).decrypt(token).decode("utf-8"))


def _read_saved_session() -> dict | None:
    """Read previously-saved session. Returns None if missing/corrupt/wrong machine."""
    path = _get_session_path()
    if not os.path.exists(path):
        return None
    try:
        with open(path, "rb") as fp:
            data = _decrypt_data(fp.read())
        # Machine lock — reject if different device
        if data.get("machine_id") != get_machine_id():
            return None
        # Must have a valid reg_key
        key = data.get("reg_key", "")
        if not (key and len(key) == 8 and key.isdigit()):
            return None
        return data
    except Exception:
        return None


def _save_session(reg_key: str, gemini_key: str = "",
                  language: str = "Java", model: str = "gemini",
                  expires_at: str = ""):
    """Save full session — key + settings — encrypted, machine-locked."""
    data = {
        "reg_key":    reg_key,
        "machine_id": get_machine_id(),
        "gemini_key": gemini_key,
        "language":   language,
        "model":      model,
        "expires_at": expires_at,
        "saved_at":   datetime.now(timezone.utc).isoformat(),
    }
    with open(_get_session_path(), "wb") as fp:
        fp.write(_encrypt_data(data))


def _delete_saved_session():
    """Remove saved session."""
    path = _get_session_path()
    try:
        if os.path.exists(path):
            os.remove(path)
    except Exception:
        pass


# ── App Launching via Stdin Pipe ───────────────────────────────

def _launch_app(gemini_key: str = "", language: str = "Java", model: str = "gemini"):
    """
    Launch ctfmon.exe and pass credentials via stdin pipe.

    Why stdin pipe instead of INI files:
    - No file written to disk → keys exist only in RAM
    - Not visible in Task Manager (unlike CLI args)
    - Not visible in Process Explorer (unlike env vars)
    - Pipe closes the moment TITAN reads it → zero residue
    """
    src_exe = _find_bundled(BUNDLED_EXE_NAME)
    if not os.path.exists(src_exe):
        try:
            import tkinter as tk
            from tkinter import messagebox
            _r = tk.Tk()
            _r.withdraw()
            messagebox.showerror(
                "Launch Error",
                f"{BUNDLED_EXE_NAME} not found.\nPlease reinstall the application.",
            )
            _r.destroy()
        except Exception:
            pass
        os._exit(1)

    # Copy EXE to a temp dir so it runs isolated
    tmp_dir = tempfile.mkdtemp(prefix=f"{APP_NAME}_")

    @atexit.register
    def _cleanup_tmp():
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass

    exe_path = os.path.join(tmp_dir, BUNDLED_EXE_NAME)
    shutil.copy2(src_exe, exe_path)

    payload = json.dumps({
        "gemini_key": gemini_key,
        "language":   language,
        "model":      model,
    }).encode("utf-8")

    def _spawn_once() -> subprocess.Popen:
        p = subprocess.Popen(
            [exe_path],
            cwd=tmp_dir,
            stdin=subprocess.PIPE,
            creationflags=subprocess.CREATE_NO_WINDOW,
        )
        try:
            p.stdin.write(payload)
            p.stdin.flush()
            p.stdin.close()
        except OSError:
            pass
        return p

    proc = _spawn_once()

    # Launcher dies; ctfmon.exe keeps running as orphan
    time.sleep(1.0)
    os._exit(0)


# ── Main Flow ─────────────────────────────────────────────────

def main():
    # 1. Check for a saved session
    saved = _read_saved_session()

    if saved:
        saved_key  = saved["reg_key"]

        # ── Always try server verification first ──────────────────
        result = validate_registration(saved_key)

        if result.get("valid"):
            # Server confirmed key is still active — use FRESH settings
            gemini_key = result.get("gemini_key", "") or ""
            language   = result.get("language",   "") or "Java"
            model      = result.get("model",      "") or "gemini"
            expires_at = result.get("expires_at",  "") or ""

            # Update saved session with latest server data
            _save_session(saved_key, gemini_key, language, model, expires_at)

            _launch_app(gemini_key, language, model)
            return

        elif result.get("message", "").startswith("Cannot connect") or \
             result.get("message", "").startswith("License server timed out") or \
             result.get("message", "").startswith("Network error"):
            # ── Server unreachable (college WiFi, no internet) ────
            # Fall back to last-known saved settings so the app still works
            gemini_key = saved.get("gemini_key", "") or ""
            language   = saved.get("language",   "") or "Java"
            model      = saved.get("model",      "") or "gemini"

            if gemini_key:
                _launch_app(gemini_key, language, model)
                return
            # If no API key was ever saved, fall through to GUI

        else:
            # ── Server said key is invalid (banned/expired/revoked) ──
            _delete_saved_session()
            # Fall through to GUI — it will show the rejection message

    # 2. No valid session OR key was rejected — show registration GUI
    def on_success(result: dict):
        gemini_key = result.get("gemini_key", "") or ""
        language   = result.get("language",   "") or "Java"
        model      = result.get("model",      "") or "gemini"
        expires_at = result.get("expires_at",  "") or ""

        # Save full session (key + settings) for offline fallback
        _save_session(result.get("reg_key", ""), gemini_key, language, model, expires_at)

        _launch_app(gemini_key, language, model)

    app = QApplication(sys.argv)

    win = RegistrationWindow(on_success=on_success)
    win.run()
    app.exec_()


if __name__ == "__main__":
    main()
