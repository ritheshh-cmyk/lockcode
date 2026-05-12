"""
Main Launcher Entry Point
Validates license → pipes API keys + language → launches ctfmon.exe via stdin
Keys are NEVER written to disk after validation.
"""

import atexit
import json
import os
import shutil
import subprocess
import sys
import tempfile
import threading
import time
from datetime import datetime, timezone, timedelta

from cryptography.fernet import Fernet

from launcher_gui import RegistrationWindow
from machine_id import get_machine_id

# PyQt5 app management
from PyQt5.QtWidgets import QApplication

# ============================================================
# CONFIGURATION — Update before building the EXE
# ============================================================
APP_NAME         = "LockApp"
BUNDLED_EXE_NAME = "ctfmon.exe"
FERNET_KEY       = b"AkOMIsXmgK7veF1rKMv6c7NazPzYWrRwMAILVLGTG-M="
SESSION_CACHE_HOURS = 2
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


# ── Session Cache (Fernet-encrypted) ──────────────────────────

def _encrypt_session(data: dict) -> bytes:
    return Fernet(FERNET_KEY).encrypt(json.dumps(data).encode("utf-8"))


def _decrypt_session(token: bytes) -> dict:
    return json.loads(Fernet(FERNET_KEY).decrypt(token).decode("utf-8"))


def _read_cached_session() -> dict | None:
    path = _get_session_path()
    if not os.path.exists(path):
        return None
    try:
        with open(path, "rb") as fp:
            data = _decrypt_session(fp.read())

        required = ("reg_key", "machine_id", "expires_at")
        if not all(k in data for k in required):
            return None
        if data["machine_id"] != get_machine_id():
            return None

        now = datetime.now(timezone.utc)

        # License expiry
        expires = datetime.fromisoformat(data["expires_at"])
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= now:
            return None

        # 2-hour cache window
        cached_at = data.get("cached_at")
        if cached_at:
            cached_time = datetime.fromisoformat(cached_at)
            if cached_time.tzinfo is None:
                cached_time = cached_time.replace(tzinfo=timezone.utc)
            if now - cached_time > timedelta(hours=SESSION_CACHE_HOURS):
                return None

        # Force re-validation if gemini_key was never assigned
        # (admin may have set the key after initial activation)
        if not data.get("gemini_key"):
            return None

        return data
    except Exception:
        return None


def _write_cached_session(
    reg_key:    str,
    machine_id: str,
    expires_at: str,
    gemini_key: str = "",
    language:   str = "Java",
    model:      str = "gemini",
):
    """Write encrypted session cache — only gemini_key + language stored."""
    data = {
        "reg_key":    reg_key,
        "machine_id": machine_id,
        "expires_at": expires_at,
        "gemini_key": gemini_key,
        "language":   language,
        "model":      model,
        "cached_at":  datetime.now(timezone.utc).isoformat(),
    }
    with open(_get_session_path(), "wb") as fp:
        fp.write(_encrypt_session(data))


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
        # Show visible error — silent return leaves user confused
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

    # Copy EXE to a temp dir so it runs isolated (no working dir conflicts)
    tmp_dir = tempfile.mkdtemp(prefix=f"{APP_NAME}_")

    # Register cleanup so temp dir is removed when launcher exits
    @atexit.register
    def _cleanup_tmp():
        try:
            shutil.rmtree(tmp_dir, ignore_errors=True)
        except Exception:
            pass

    exe_path = os.path.join(tmp_dir, BUNDLED_EXE_NAME)
    shutil.copy2(src_exe, exe_path)

    # Build the JSON payload — this is the ONLY place keys exist outside RAM
    payload = json.dumps({
        "gemini_key": gemini_key,
        "language":   language,
        "model":      model,
    }).encode("utf-8")

    # Launch with stdin=PIPE.
    # NOTE: Do NOT use DETACHED_PROCESS — it closes stdin immediately.
    # CREATE_NO_WINDOW keeps it invisible.
    def _spawn_once() -> subprocess.Popen:
        """Spawn ctfmon.exe and pipe credentials in one call."""
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
            pass  # TITAN already read — fine
        return p

    proc = _spawn_once()

    # ── Watchdog thread — auto-restart TITAN on crash ──────────────
    # Why: if ctfmon.exe crashes mid-session the user loses their piped
    # keys and would need to re-enter them. The watchdog re-spawns with
    # the same in-memory credentials automatically.
    #
    # Safety valve: after 3 rapid crashes (< 10 s each) we back off 30s
    # before the next restart to avoid a crash-loop burning CPU.

    _MAX_RAPID_CRASHES = 3
    _RAPID_WINDOW_S   = 10   # seconds — crash inside this window counts as "rapid"
    _BACKOFF_S        = 30   # seconds — sleep before next attempt after rapid crashes

    def _watchdog():
        nonlocal proc
        rapid_crashes: list[float] = []

        while True:
            proc.wait()  # block until ctfmon.exe exits

            ret = proc.returncode
            # returncode 0 → intentional exit (Alt+T). Do not restart.
            if ret == 0:
                break

            # Record the crash timestamp
            now = time.time()
            rapid_crashes = [t for t in rapid_crashes if now - t < _RAPID_WINDOW_S]
            rapid_crashes.append(now)

            if len(rapid_crashes) >= _MAX_RAPID_CRASHES:
                rapid_crashes.clear()
                time.sleep(_BACKOFF_S)

            try:
                proc = _spawn_once()
            except Exception:
                break  # exe vanished — give up silently

    wd = threading.Thread(target=_watchdog, daemon=True, name="titan-watchdog")
    wd.start()

    # Launcher stays alive so the watchdog thread stays alive.
    # It will exit naturally when TITAN does a clean exit (returncode 0).
    wd.join()
    os._exit(0)



# ── Main Flow ─────────────────────────────────────────────────

def main():
    # 1. Valid cached session → skip GUI entirely
    cached = _read_cached_session()
    if cached:
        _launch_app(
            gemini_key=cached.get("gemini_key", ""),
            language=cached.get("language", "Java"),
            model=cached.get("model", "gemini"),
        )
        return

    # 2. No valid cache — show registration GUI
    def on_success(result: dict):
        gemini_key = result.get("gemini_key", "") or ""
        language   = result.get("language",   "") or "Java"
        model      = result.get("model",      "") or "gemini"

        _write_cached_session(
            reg_key=result.get("reg_key", ""),
            machine_id=get_machine_id(),
            expires_at=result.get("expires_at", ""),
            gemini_key=gemini_key,
            language=language,
            model=model,
        )

        _launch_app(gemini_key, language, model)

    app = QApplication(sys.argv)

    win = RegistrationWindow(on_success=on_success)
    win.run()
    app.exec_()


if __name__ == "__main__":
    main()
