"""
new_launcher.py — TITAN Cython Engine Launcher

Spawns a fresh Python process that imports the compiled titan_engine.pyd
and calls run_engine(). Credentials are injected via stdin pipe — they
never touch the disk.

Architecture:
  new_launcher.py
      └─ subprocess: python -c "import titan_engine; titan_engine.run_engine()"
              └─ titan_engine.pyd  (Cython-compiled native extension)
                     └─ reads JSON from stdin → initialises HUD

Usage:
  python new_launcher.py                    # dev mode — reads gemini.ini
  python new_launcher.py --key KEY --lang Python --model gemini  # CLI override
"""

import json
import os
import subprocess
import sys
import argparse
import configparser


# ── Locate the compiled .pyd ─────────────────────────────────
# The .pyd lives in the same directory as this script (or one level up in
# the installed layout).  We need its directory on sys.path so Python can
# find it when the subprocess does `import titan_engine`.
_SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))


def _find_engine_dir() -> str:
    """Return the directory containing titan_engine*.pyd, or script dir."""
    for candidate in [_SCRIPT_DIR, os.path.join(_SCRIPT_DIR, "..")]:
        candidate = os.path.abspath(candidate)
        for fname in os.listdir(candidate):
            if fname.startswith("titan_engine") and fname.endswith(".pyd"):
                return candidate
    return _SCRIPT_DIR


def _build_payload(api_keys: str, language: str, model: str) -> bytes:
    """Serialize credentials to JSON bytes for the stdin pipe."""
    return json.dumps({
        "gemini_key": api_keys,
        "language":   language,
        "model":      model,
    }).encode("utf-8")


def _read_gemini_ini(ini_path: str) -> tuple:
    """
    Parse gemini.ini and return (keys_csv, language, model).
    Falls back to environment variables if the file is missing.
    """
    if not os.path.exists(ini_path):
        return (
            os.getenv("GEMINI_API_KEY", ""),
            os.getenv("GEMINI_LANG", "Java"),
            os.getenv("GEMINI_MODEL", "gemini"),
        )

    cfg = configparser.ConfigParser()
    cfg.read(ini_path, encoding="utf-8")

    raw_keys = cfg.get("gemini", "api_keys", fallback="")
    # Support newline-separated or comma-separated keys
    keys_list = [k.strip() for k in raw_keys.replace("\n", ",").split(",") if k.strip()]
    keys_csv  = ",".join(keys_list)

    language = cfg.get("prompts", "coding_language", fallback="Java").strip() or "Java"
    model    = cfg.get("gemini",  "model",           fallback="gemini").strip() or "gemini"

    return keys_csv, language, model


def launch(api_keys: str = "", language: str = "Java", model: str = "gemini") -> None:
    """
    Spawn the Cython engine subprocess and pipe credentials into it.

    The subprocess command:
        python -c "import sys; sys.path.insert(0, r'<engine_dir>'); import titan_engine; titan_engine.run_engine()"

    Using sys.path.insert ensures the .pyd is found regardless of the
    current working directory.
    """
    engine_dir = _find_engine_dir()
    payload    = _build_payload(api_keys, language, model)

    # Build a minimal one-liner that sets sys.path then runs the engine
    one_liner = (
        f"import sys; sys.path.insert(0, r'{engine_dir}'); "
        f"import titan_engine; titan_engine.run_engine()"
    )

    print(f"[Launcher] Engine dir : {engine_dir}")
    print(f"[Launcher] Language   : {language}")
    print(f"[Launcher] Model      : {model}")
    print(f"[Launcher] Keys       : {'*' * min(8, len(api_keys))}… ({len(api_keys)} chars)")
    print(f"[Launcher] Starting TITAN engine…")

    try:
        proc = subprocess.Popen(
            [sys.executable, "-c", one_liner],
            stdin=subprocess.PIPE,
            # No PIPE for stdout/stderr — let engine output go to console
            creationflags=getattr(subprocess, "CREATE_NO_WINDOW", 0),
        )

        # Write payload then close stdin — engine reads it all at once
        try:
            proc.stdin.write(payload)
            proc.stdin.flush()
            proc.stdin.close()
        except OSError:
            pass  # Engine already read everything

        proc.wait()

    except KeyboardInterrupt:
        print("\n[Launcher] Interrupted by user.")
        try:
            proc.kill()
        except Exception:
            pass


def main() -> None:
    parser = argparse.ArgumentParser(
        description="TITAN Cython engine launcher",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("--key",    default="",      help="Gemini API key(s), comma-separated")
    parser.add_argument("--lang",   default="",      help="Coding language (default: Java)")
    parser.add_argument("--model",  default="",      help="Model name (default: gemini)")
    parser.add_argument("--ini",    default=os.path.join(_SCRIPT_DIR, "gemini.ini"),
                        help="Path to gemini.ini (default: ./gemini.ini)")
    args = parser.parse_args()

    if args.key:
        # CLI mode — explicit credentials provided
        api_keys = args.key
        language = args.lang or "Java"
        model    = args.model or "gemini"
    else:
        # INI mode — read from gemini.ini
        api_keys, language, model = _read_gemini_ini(args.ini)
        if args.lang:  language = args.lang
        if args.model: model    = args.model

    if not api_keys:
        print("[Launcher] WARNING: No API keys found. Engine will start without AI capabilities.")

    launch(api_keys=api_keys, language=language, model=model)


if __name__ == "__main__":
    main()
