"""
TITAN Engine Entry Stub
This is the ONLY Python script inside ctfmon.exe.
It imports the compiled Cython extension and explicitly launches the engine.
PyInstaller sees this tiny script — the actual engine is machine code inside titan_engine.pyd.
"""
import sys
import json
import os
import titan_engine  # noqa — compiled .pyd, loads all engine classes


def _read_credentials_from_stdin():
    """Read JSON credentials from the stdin pipe sent by the launcher."""
    try:
        if not sys.stdin.isatty():
            raw = sys.stdin.buffer.read().decode("utf-8").strip()
            if raw:
                data = json.loads(raw)
                raw_key  = data.get("gemini_key", "").strip()
                lang     = data.get("language",   "Java").strip() or "Java"
                model    = data.get("model",      "gemini").strip() or "gemini"
                keys     = [k.strip() for k in raw_key.split(",") if k.strip()]
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
    # ── Read credentials from launcher via stdin pipe (zero disk footprint) ──
    api_keys, language, model = _read_credentials_from_stdin()

    # Store into titan_engine globals so the engine can use them
    titan_engine._RUNTIME_API_KEYS[:] = api_keys
    titan_engine._RUNTIME_LANGUAGE    = language
    titan_engine._RUNTIME_MODEL       = model

    # ── HEADLESS MODE: no window, engine runs silently in background ──
    import time
    window = titan_engine.UnifiedChatbotUI(api_keys=api_keys)

    try:
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        pass

