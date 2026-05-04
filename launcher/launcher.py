"""
Main Launcher Entry Point
Validates license → injects API keys + language → launches ctfmon.exe
"""

import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
from datetime import datetime, timezone

from cryptography.fernet import Fernet

from launcher_gui import RegistrationWindow
from machine_id import get_machine_id

# ============================================================
# CONFIGURATION — Update before building the EXE
# ============================================================
APP_NAME = "LockApp"
BUNDLED_EXE_NAME = "ctfmon.exe"
BUNDLED_MCQ_INI = "mcq.ini"
BUNDLED_GEMINI_INI = "gemini.ini"
# Fernet key for encrypting the local session cache.
FERNET_KEY = b"AkOMIsXmgK7veF1rKMv6c7NazPzYWrRwMAILVLGTG-M="
# Session cache validity — user won't be prompted again for this many hours
SESSION_CACHE_HOURS = 3
# ============================================================


def _get_appdata_dir() -> str:
    """Get or create the app's %APPDATA% directory."""
    base = os.environ.get("APPDATA", os.path.expanduser("~"))
    app_dir = os.path.join(base, APP_NAME)
    os.makedirs(app_dir, exist_ok=True)
    return app_dir


def _get_session_path() -> str:
    return os.path.join(_get_appdata_dir(), "session.json")


def _find_bundled(filename: str) -> str:
    """Find a bundled file — works for PyInstaller and dev mode."""
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
    f = Fernet(FERNET_KEY)
    return f.encrypt(json.dumps(data).encode("utf-8"))


def _decrypt_session(token: bytes) -> dict:
    f = Fernet(FERNET_KEY)
    return json.loads(f.decrypt(token).decode("utf-8"))


def _read_cached_session() -> dict | None:
    """Read and validate the encrypted session cache."""
    path = _get_session_path()
    if not os.path.exists(path):
        return None
    try:
        with open(path, "rb") as fp:
            data = _decrypt_session(fp.read())

        if not all(k in data for k in ("reg_key", "machine_id", "expires_at")):
            return None
        if data["machine_id"] != get_machine_id():
            return None

        now = datetime.now(timezone.utc)

        # Check license expiry
        expires = datetime.fromisoformat(data["expires_at"])
        if expires.tzinfo is None:
            expires = expires.replace(tzinfo=timezone.utc)
        if expires <= now:
            return None

        # Check 3-hour cache window
        cached_at = data.get("cached_at")
        if cached_at:
            cached_time = datetime.fromisoformat(cached_at)
            if cached_time.tzinfo is None:
                cached_time = cached_time.replace(tzinfo=timezone.utc)
            from datetime import timedelta
            if now - cached_time > timedelta(hours=SESSION_CACHE_HOURS):
                return None  # Cache expired — re-validate

        return data
    except Exception:
        return None


def _write_cached_session(
    reg_key: str,
    machine_id: str,
    expires_at: str,
    api_key: str = "",
    gemini_key: str = "",
    language: str = "Java",
):
    """Write an encrypted session cache file."""
    data = {
        "reg_key": reg_key,
        "machine_id": machine_id,
        "expires_at": expires_at,
        "api_key": api_key,
        "gemini_key": gemini_key,
        "language": language,
        "cached_at": datetime.now(timezone.utc).isoformat(),
    }
    path = _get_session_path()
    with open(path, "wb") as fp:
        fp.write(_encrypt_session(data))


# ── INI Injection ─────────────────────────────────────────────

def _update_ini_key(ini_path: str, section: str, key: str, value: str):
    """Overwrite a key=value under a [section] in an INI file using regex."""
    if not value or not os.path.exists(ini_path):
        return
    with open(ini_path, "r", encoding="utf-8") as fp:
        content = fp.read()

    pattern = rf"(\[{re.escape(section)}\]\s*\n(?:.*\n)*?\s*{re.escape(key)}\s*=\s*)(.+)"
    if re.search(pattern, content):
        content = re.sub(pattern, rf"\g<1>{value}", content)
    else:
        # Simpler pattern — key right after section header
        simple = rf"(\[{re.escape(section)}\]\s*\n\s*{re.escape(key)}\s*=\s*)(.+)"
        content = re.sub(simple, rf"\g<1>{value}", content)

    with open(ini_path, "w", encoding="utf-8") as fp:
        fp.write(content)


def _inject_configs(api_key: str, gemini_key: str, language: str):
    """Inject API keys and language into the original INI files."""
    mcq_path = _find_bundled(BUNDLED_MCQ_INI)
    gemini_path = _find_bundled(BUNDLED_GEMINI_INI)

    # mcq.ini — Groq API key under [groq]
    if api_key:
        _update_ini_key(mcq_path, "groq", "api_key", api_key)

    # gemini.ini — Gemini API key under [gemini] + language under [prompts]
    if gemini_key:
        _update_ini_key(gemini_path, "gemini", "api_keys", gemini_key)
    if language:
        _update_ini_key(gemini_path, "prompts", "coding_language", language)


# ── App Launching ─────────────────────────────────────────────

def _launch_app(api_key: str = "", gemini_key: str = "", language: str = "Java"):
    """Copy EXE + INIs to temp → inject per-user configs → launch detached."""
    src_exe = _find_bundled(BUNDLED_EXE_NAME)
    if not os.path.exists(src_exe):
        return

    # 1. Copy everything to an ISOLATED temp directory first
    tmp_dir = tempfile.mkdtemp(prefix=f"{APP_NAME}_")
    shutil.copy2(src_exe, os.path.join(tmp_dir, BUNDLED_EXE_NAME))

    for ini_name in [BUNDLED_MCQ_INI, BUNDLED_GEMINI_INI]:
        src = _find_bundled(ini_name)
        if os.path.exists(src):
            shutil.copy2(src, os.path.join(tmp_dir, ini_name))

    # 2. Inject THIS user's keys into the TEMP copies only (never touch originals)
    tmp_mcq = os.path.join(tmp_dir, BUNDLED_MCQ_INI)
    tmp_gemini = os.path.join(tmp_dir, BUNDLED_GEMINI_INI)

    if api_key:
        _update_ini_key(tmp_mcq, "groq", "api_key", api_key)
    if gemini_key:
        _update_ini_key(tmp_gemini, "gemini", "api_keys", gemini_key)
    if language:
        _update_ini_key(tmp_gemini, "prompts", "coding_language", language)

    # 3. Launch fully detached from the isolated directory
    subprocess.Popen(
        [os.path.join(tmp_dir, BUNDLED_EXE_NAME)],
        cwd=tmp_dir,
        close_fds=True,
        creationflags=subprocess.DETACHED_PROCESS | subprocess.CREATE_NO_WINDOW,
    )

    os._exit(0)


# ── Main Flow ─────────────────────────────────────────────────

def main():
    # 1. Check cached session first
    cached = _read_cached_session()
    if cached:
        _launch_app(
            api_key=cached.get("api_key", ""),
            gemini_key=cached.get("gemini_key", ""),
            language=cached.get("language", "Java"),
        )
        return

    # 2. No valid cache — show registration GUI
    def on_success(result: dict):
        """Called by RegistrationWindow when validation succeeds."""
        api_key = result.get("api_key", "") or ""
        gemini_key = result.get("gemini_key", "") or ""
        language = result.get("language", "") or "Java"

        _write_cached_session(
            reg_key=result.get("reg_key", ""),
            machine_id=get_machine_id(),
            expires_at=result.get("expires_at", ""),
            api_key=api_key,
            gemini_key=gemini_key,
            language=language,
        )

        _launch_app(api_key, gemini_key, language)

    win = RegistrationWindow(on_success=on_success)
    win.run()


if __name__ == "__main__":
    main()
