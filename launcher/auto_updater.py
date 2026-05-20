"""
auto_updater.py — Auto-Update Module for LockApp Launcher

Strategy:
  1. Fetch version.json from R2 bucket  →  { "version": "1.2.3", "url": "...", "sha256": "..." }
  2. Compare against LOCAL_VERSION constant
  3. If newer: download new EXE to a temp file, verify SHA-256, replace self, restart
  4. If same / older / unreachable: continue normal boot silently

Update flow (replace-and-restart):
  - The new EXE is written to <AppData>/LockApp/update_pending.exe
  - A small .bat script is spawned: it waits for the current process to exit,
    copies the new EXE over titan.exe (or wherever the launcher lives), then
    launches the new version automatically.
  - Current process calls os._exit(0) so the bat can take over.

UI during update:
  - A minimal Qt splash/progress window is shown (no main window yet)
  - Progress is reported via a callback so the caller can hook any UI
"""

import hashlib
import json
import os
import shutil
import subprocess
import sys
import tempfile
import time
from typing import Callable, Optional

import requests

# ─────────────────────────────────────────────────────────────
# CONFIGURATION  (edit before release)
# ─────────────────────────────────────────────────────────────
LOCAL_VERSION   = "1.0.0"          # <-- bump this on every build
R2_VERSION_URL  = (
    "https://pub-a6aee813155645ffb8a3c6a40166b628.r2.dev/version.json"
)
R2_EXE_URL      = (
    "https://pub-a6aee813155645ffb8a3c6a40166b628.r2.dev/titan.exe"
)
APP_NAME        = "LockApp"
REQUEST_TIMEOUT = 10   # seconds — version.json fetch
DOWNLOAD_CHUNK  = 65536  # 64 KB download chunk size


# ─────────────────────────────────────────────────────────────
# Helpers
# ─────────────────────────────────────────────────────────────

def _get_appdata_dir() -> str:
    base = os.environ.get("APPDATA", os.path.expanduser("~"))
    d = os.path.join(base, APP_NAME)
    os.makedirs(d, exist_ok=True)
    return d


def _version_tuple(v: str) -> tuple:
    """Convert '1.2.3' → (1, 2, 3) for numeric comparison."""
    try:
        return tuple(int(x) for x in v.strip().split("."))
    except (ValueError, AttributeError):
        return (0,)


def _sha256_file(path: str) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


# ─────────────────────────────────────────────────────────────
# Core public API
# ─────────────────────────────────────────────────────────────

class UpdateInfo:
    """Data class describing a pending update."""
    __slots__ = ("remote_version", "url", "sha256", "size_bytes", "changelog")

    def __init__(self, remote_version: str, url: str,
                 sha256: str = "", size_bytes: int = 0,
                 changelog: str = ""):
        self.remote_version = remote_version
        self.url            = url
        self.sha256         = sha256
        self.size_bytes     = size_bytes
        self.changelog      = changelog


def check_for_update(local_version: str = LOCAL_VERSION) -> Optional[UpdateInfo]:
    """
    Fetch version.json and compare. Returns UpdateInfo if an update is
    available, None if we're up-to-date OR if the server is unreachable.

    version.json schema:
    {
      "version":   "1.1.0",
      "url":       "https://pub-...r2.dev/titan.exe",
      "sha256":    "abcdef...",   (optional but recommended)
      "size":      12345678,       (optional, bytes)
      "changelog": "Bug fixes"     (optional)
    }
    """
    try:
        resp = requests.get(R2_VERSION_URL, timeout=REQUEST_TIMEOUT)
        resp.raise_for_status()
        data = resp.json()
    except Exception:
        # Network down, bucket unreachable, malformed JSON — silently skip
        return None

    remote_version = data.get("version", "0.0.0")
    if _version_tuple(remote_version) <= _version_tuple(local_version):
        return None  # Already current

    return UpdateInfo(
        remote_version=remote_version,
        url=data.get("url", R2_EXE_URL),
        sha256=data.get("sha256", ""),
        size_bytes=int(data.get("size", 0)),
        changelog=data.get("changelog", ""),
    )


def download_update(
    info: UpdateInfo,
    dest_path: str,
    progress_cb: Optional[Callable[[int, int], None]] = None,
) -> bool:
    """
    Stream-download the new EXE to dest_path.

    progress_cb(downloaded_bytes, total_bytes) is called every chunk.
    Returns True on success, False on any error.
    """
    try:
        with requests.get(info.url, stream=True, timeout=60) as resp:
            resp.raise_for_status()
            total = int(resp.headers.get("content-length", info.size_bytes or 0))
            downloaded = 0
            with open(dest_path, "wb") as f:
                for chunk in resp.iter_content(chunk_size=DOWNLOAD_CHUNK):
                    if chunk:
                        f.write(chunk)
                        downloaded += len(chunk)
                        if progress_cb:
                            progress_cb(downloaded, total)
        return True
    except Exception:
        return False


def verify_checksum(path: str, expected_sha256: str) -> bool:
    """Return True if sha256 matches (or if expected is empty → skip check)."""
    if not expected_sha256:
        return True  # No checksum provided — accept
    return _sha256_file(path).lower() == expected_sha256.lower()


def apply_update_and_restart(new_exe_path: str) -> None:
    """
    Replace the running launcher EXE with new_exe_path, then restart.

    Works on Windows by spawning a detached .bat script that:
      1. Waits for the current process to exit
      2. Copies the new EXE over the original
      3. Launches the new EXE
      4. Deletes itself

    This method works even when the current EXE is the one being replaced,
    because the bat file holds the lock only *after* the current process dies.
    """
    if getattr(sys, "frozen", False):
        # Running as PyInstaller EXE
        current_exe = sys.executable
    else:
        # Running as plain Python script (dev mode) — just restart the script
        current_exe = os.path.abspath(sys.argv[0])

    pid = os.getpid()
    bat_path = os.path.join(tempfile.gettempdir(), f"lockapp_update_{pid}.bat")

    # Write the self-deleting bat
    bat_content = f"""@echo off
:wait
tasklist /FI "PID eq {pid}" 2>NUL | find "{pid}" >NUL
if not errorlevel 1 (
    timeout /t 1 /nobreak >NUL
    goto wait
)
copy /Y "{new_exe_path}" "{current_exe}" >NUL
start "" "{current_exe}"
del "%~f0"
""".replace("\n", "\r\n")

    with open(bat_path, "w", encoding="ascii") as f:
        f.write(bat_content)

    # Launch bat detached — it will wait for us to die
    subprocess.Popen(
        ["cmd.exe", "/C", bat_path],
        creationflags=(
            subprocess.CREATE_NO_WINDOW |
            subprocess.DETACHED_PROCESS
        ),
        close_fds=True,
    )

    # Die — the bat takes over
    time.sleep(0.3)
    os._exit(0)


# ─────────────────────────────────────────────────────────────
# High-level convenience function used by launcher.py
# ─────────────────────────────────────────────────────────────

def run_update_check(
    progress_cb: Optional[Callable[[int, int], None]] = None,
    status_cb:   Optional[Callable[[str], None]] = None,
) -> None:
    """
    Perform a full check-download-apply cycle.

    Call this BEFORE showing the registration window.
    If no update is available (or network is down), returns immediately.
    If an update is found, downloads it and restarts — this function
    never returns in that case.

    progress_cb(downloaded, total)  — called during download
    status_cb(message)              — called with human-readable status strings
    """
    def _status(msg: str):
        if status_cb:
            status_cb(msg)

    _status("Checking for updates…")
    info = check_for_update()

    if info is None:
        _status("")  # clear — no update
        return

    _status(f"Update available: v{info.remote_version}. Downloading…")

    # Download to AppData temp file
    tmp_path = os.path.join(_get_appdata_dir(), "update_pending.exe")

    ok = download_update(info, tmp_path, progress_cb=progress_cb)
    if not ok:
        _status("Update download failed — continuing with current version.")
        return

    _status("Verifying download…")
    if not verify_checksum(tmp_path, info.sha256):
        _status("Update checksum mismatch — download may be corrupt. Skipping.")
        try:
            os.remove(tmp_path)
        except OSError:
            pass
        return

    _status("Applying update and restarting…")
    apply_update_and_restart(tmp_path)
    # ↑ Never returns if update succeeds
