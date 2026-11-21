"""
TITAN Engine Entry Stub
This is the ONLY Python script inside ctfmon.exe.
It imports the compiled Cython extension and explicitly launches the engine.
PyInstaller sees this tiny script — the actual engine is machine code inside titan_engine.pyd.
"""
import sys
import json
import os
import text_extractor  # Bundled pure accessibility extractor
import titan_engine  # noqa — compiled .pyd, loads all engine classes


def _read_credentials_from_stdin():
    """Read JSON credentials from the stdin pipe or fallback to gemini.ini/env."""
    try:
        if sys.stdin and not sys.stdin.isatty():
            import msvcrt, ctypes
            handle = msvcrt.get_osfhandle(sys.stdin.fileno())
            avail = ctypes.c_ulong(0)
            res = ctypes.windll.kernel32.PeekNamedPipe(handle, None, 0, None, ctypes.byref(avail), None)
            if res and avail.value > 0:
                raw = sys.stdin.buffer.read(avail.value).decode("utf-8", errors="ignore").strip()
                if raw:
                    data = json.loads(raw)
                    raw_key  = data.get("gemini_key", "").strip()
                    lang     = data.get("language",   "Java").strip() or "Java"
                    model    = data.get("model",      "gemini").strip() or "gemini"
                    keys     = [k.strip() for k in raw_key.split(",") if k.strip()]
                    return keys, lang, model
    except Exception:
        pass

    # Read from gemini.ini if present next to exe or in project
    candidate_dirs = [
        os.path.dirname(os.path.abspath(sys.argv[0])),
        os.path.dirname(os.path.abspath(__file__)),
        os.getcwd(),
        r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode",
    ]
    for d in candidate_dirs:
        ini_path = os.path.join(d, "gemini.ini")
        if os.path.exists(ini_path):
            try:
                import configparser
                cfg = configparser.ConfigParser()
                cfg.read(ini_path, encoding="utf-8")
                raw_keys = cfg.get("gemini", "api_keys", fallback="")
                keys = [k.strip() for k in raw_keys.replace("\n", ",").split(",") if k.strip()]
                lang = cfg.get("prompts", "coding_language", fallback="Java").strip() or "Java"
                model = cfg.get("gemini", "model", fallback="gemini").strip() or "gemini"
                if keys:
                    return keys, lang, model
            except Exception:
                pass

    # Dev-mode fallback: read from env vars
    env_key   = os.getenv("GEMINI_API_KEY", "").strip()
    env_lang  = os.getenv("GEMINI_LANG",  "Java").strip()
    env_model = os.getenv("GEMINI_MODEL", "gemini").strip()
    env_keys  = [k.strip() for k in env_key.split(",") if k.strip()]
    return env_keys, env_lang, env_model


if __name__ == "__main__":
    from PyQt5.QtWidgets import QApplication
    from PyQt5.QtCore import QTimer

    # ── Read credentials from launcher via stdin pipe (zero disk footprint) ──
    api_keys, language, model = _read_credentials_from_stdin()

    # Store into titan_engine globals so the engine can use them
    titan_engine._RUNTIME_API_KEYS[:] = api_keys
    titan_engine._RUNTIME_LANGUAGE    = language
    titan_engine._RUNTIME_MODEL       = model

    app    = QApplication(sys.argv)
    window = titan_engine.UnifiedChatbotUI(api_keys=api_keys)

    # Defer show until Qt event loop has painted once so HWND is valid
    QTimer.singleShot(50, window.show_window)

    sys.exit(app.exec_())
