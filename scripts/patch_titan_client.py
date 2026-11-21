import os

targets = [
    os.path.abspath("final.py"),
    os.path.abspath("titan_engine.pyx"),
    r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\final.py",
    r"C:\Users\rithesh\Desktop\lockcodeheaded\lockcode\titan_engine.pyx",
]

old_bridge_pattern = '''def _call_vercel_bridge(prompt_text: str, system_prompt: str = "", mode: str = "code", options_count: int = 4) -> str | None:
    """Send question or code prompt to Vercel Edge AI Hub.
    Bypasses campus Wi-Fi blocking (HTTP 403), eliminates client key exposure,
    and benefits from server-side Gemini rotation + Groq failover.
    """
    try:
        headers = {
            "Content-Type": "application/json",
            "x-app-secret": APP_SECRET,
        }
        payload = {
            "mode": mode,
            "prompt": prompt_text,
            "systemPrompt": system_prompt,
            "optionsCount": options_count,
            "language": _RUNTIME_LANGUAGE,
            "regKey": _RUNTIME_REG_KEY,
        }
        resp = HTTP_SESSION.post(BRIDGE_URL, headers=headers, json=payload, timeout=(4, 30), verify=SSL_VERIFY)
        if resp and resp.status_code == 200:
            data = resp.json()
            if isinstance(data, dict):
                if data.get("text"):
                    return str(data["text"]).strip()
                candidates = data.get("candidates")
                if candidates and isinstance(candidates, list) and len(candidates) > 0:
                    parts = candidates[0].get("content", {}).get("parts", [])
                    if parts and isinstance(parts, list):
                        return parts[0].get("text", "").strip()
    except Exception as e:
        logging.warning(f"Vercel Bridge query failed: {e}")
    return None'''

new_bridge_pattern = '''_LAST_BRIDGE_ERROR: str = ""

def _call_vercel_bridge(prompt_text: str, system_prompt: str = "", mode: str = "code", options_count: int = 4) -> str | None:
    """Send question or code prompt to Vercel Edge AI Hub.
    Bypasses campus Wi-Fi blocking (HTTP 403), eliminates client key exposure,
    and benefits from server-side Gemini rotation + Groq failover.
    """
    global _LAST_BRIDGE_ERROR
    _LAST_BRIDGE_ERROR = ""
    try:
        headers = {
            "Content-Type": "application/json",
            "x-app-secret": APP_SECRET,
        }
        payload = {
            "mode": mode,
            "prompt": prompt_text,
            "systemPrompt": system_prompt,
            "optionsCount": options_count,
            "language": _RUNTIME_LANGUAGE,
            "regKey": _RUNTIME_REG_KEY,
        }
        resp = HTTP_SESSION.post(BRIDGE_URL, headers=headers, json=payload, timeout=(4, 30), verify=SSL_VERIFY)
        if resp is not None:
            if resp.status_code == 200:
                data = resp.json()
                if isinstance(data, dict):
                    if data.get("text"):
                        return str(data["text"]).strip()
                    candidates = data.get("candidates")
                    if candidates and isinstance(candidates, list) and len(candidates) > 0:
                        parts = candidates[0].get("content", {}).get("parts", [])
                        if parts and isinstance(parts, list):
                            return parts[0].get("text", "").strip()
            else:
                try:
                    err_json = resp.json()
                    _LAST_BRIDGE_ERROR = err_json.get("error") or err_json.get("message") or f"Bridge HTTP {resp.status_code}"
                except Exception:
                    _LAST_BRIDGE_ERROR = f"Bridge HTTP {resp.status_code}: {resp.text[:120].strip()}"
                logging.warning(f"Vercel Bridge returned HTTP {resp.status_code}: {_LAST_BRIDGE_ERROR}")
    except Exception as e:
        _LAST_BRIDGE_ERROR = f"Bridge network failure: {str(e)[:120]}"
        logging.warning(f"Vercel Bridge query failed: {e}")
    return None'''

for target in targets:
    if not os.path.exists(target):
        print(f"Skipping non-existent: {target}")
        continue

    with open(target, "r", encoding="utf-8") as f:
        content = f.read()

    is_crlf = "\r\n" in content
    norm = content.replace("\r\n", "\n")

    patched = False
    if old_bridge_pattern in norm:
        norm = norm.replace(old_bridge_pattern, new_bridge_pattern)
        patched = True
        print(f"Patched _call_vercel_bridge in {target}")
    elif "_LAST_BRIDGE_ERROR" in norm:
        print(f"_LAST_BRIDGE_ERROR already present in {target}")
    else:
        print(f"Warning: bridge pattern not matched in {target}")

    # Patch CodeChatbot fallback
    old_code_fallback = 'fallback = "No API keys found. Contact admin to verify your license."'
    new_code_fallback = 'fallback = _LAST_BRIDGE_ERROR if _LAST_BRIDGE_ERROR else "No API keys found. Contact admin to verify your license."'
    if old_code_fallback in norm:
        norm = norm.replace(old_code_fallback, new_code_fallback)
        patched = True
        print(f"Patched CodeChatbot fallback in {target}")

    # Patch MCQ fallback 1
    old_mcq_fallback = 'self.error_occurred.emit(\n                    f"No API keys found and Vercel Bridge unreachable. Contact admin to verify your license."\n                )'
    new_mcq_fallback = 'fallback = _LAST_BRIDGE_ERROR if _LAST_BRIDGE_ERROR else "No API keys found and Vercel Bridge unreachable. Contact admin to verify your license."\n                self.error_occurred.emit(fallback)'
    if old_mcq_fallback in norm:
        norm = norm.replace(old_mcq_fallback, new_mcq_fallback)
        patched = True
        print(f"Patched MCQ fallback in {target}")
    else:
        # Check single line variant
        old_mcq_single = 'self.error_occurred.emit("No API keys found and Vercel Bridge unreachable. Contact admin to verify your license.")'
        new_mcq_single = 'self.error_occurred.emit(_LAST_BRIDGE_ERROR if _LAST_BRIDGE_ERROR else "No API keys found and Vercel Bridge unreachable. Contact admin to verify your license.")'
        if old_mcq_single in norm:
            norm = norm.replace(old_mcq_single, new_mcq_single)
            patched = True
            print(f"Patched MCQ fallback single in {target}")

    out_content = norm.replace("\n", "\r\n") if is_crlf else norm
    with open(target, "w", encoding="utf-8") as f:
        f.write(out_content)
    print(f"Done processing {target}")
