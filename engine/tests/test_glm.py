"""
GLM 4.7 NIM endpoint test — with streaming + reasoning content
Tests: ping, MCQ, coding
"""
import sys
import time
import requests

NIM_BASE = "https://integrate.api.nvidia.com/v1/chat/completions"
GLM_KEY  = "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"
GLM_MODEL = "z-ai/glm4.7"

MCQ_SYSTEM = (
    "You are an MCQ answer engine for university-level computer science questions. "
    "Analyze the question carefully, evaluate each option, and eliminate wrong ones. "
    "Your reasoning MUST be brief (2-4 sentences max). "
    "On the VERY LAST line of your response, write EXACTLY: Answer: <number> "
    "where <number> is 1, 2, 3, or 4. Do NOT write anything after the Answer line."
)

CODE_SYSTEM = (
    "You are a Java competitive programming expert. "
    "OUTPUT RULES (STRICT): "
    "1. Output ONLY raw compilable Java source code. Nothing else. "
    "2. ZERO inline comments. ZERO explanatory comments. "
    "3. NO markdown fences. Raw code only. "
    "4. NO prose, NO explanation, NO preamble."
)

MCQ_Q = (
    "Which data structure is used in BFS traversal of a graph?\n"
    "1. Stack\n2. Queue\n3. Priority Queue\n4. Linked List"
)

CODE_Q = (
    "Write a complete Java solution:\n"
    "Given an integer n, return the nth Fibonacci number (0-indexed, 0<=n<=30).\n"
    "Use efficient iterative approach. Output only the class."
)

def test_stream(label, system, user_msg, params):
    headers = {"Authorization": "Bearer " + GLM_KEY, "Content-Type": "application/json"}
    payload = {
        "model": GLM_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_msg}
        ],
        **params,
        "stream": True,
        "extra_body": {"chat_template_kwargs": {"enable_thinking": True, "clear_thinking": False}}
    }
    t0 = time.time()
    full_content   = []
    full_reasoning = []
    first_token_t  = None
    try:
        with requests.post(NIM_BASE, headers=headers, json=payload, stream=True, timeout=(5, 120)) as r:
            if r.status_code != 200:
                return False, round(time.time()-t0, 2), "", r.text[:200], 0
            for line in r.iter_lines():
                if not line:
                    continue
                raw = line.decode("utf-8")
                if not raw.startswith("data: "):
                    continue
                raw = raw[6:]
                if raw == "[DONE]":
                    break
                import json
                chunk = json.loads(raw)
                choices = chunk.get("choices", [])
                if not choices:
                    continue
                delta = choices[0].get("delta", {})
                if first_token_t is None and (delta.get("content") or delta.get("reasoning_content")):
                    first_token_t = round(time.time() - t0, 2)
                if delta.get("reasoning_content"):
                    full_reasoning.append(delta["reasoning_content"])
                if delta.get("content"):
                    full_content.append(delta["content"])
        elapsed = round(time.time() - t0, 2)
        return True, elapsed, "".join(full_content), "".join(full_reasoning), first_token_t
    except Exception as e:
        return False, round(time.time()-t0, 2), "", str(e), None

print("=" * 60)
print("GLM 4.7 (z-ai/glm4.7) NIM ENDPOINT TEST")
print("=" * 60)

# ── TEST 1: Quick ping ───────────────────────────────────────
print("\n[1] PING — minimal prompt")
ok, t, content, reasoning, ttp = test_stream(
    "Ping",
    "You are a helpful assistant.",
    "Reply with OK only.",
    {"temperature": 0.1, "max_tokens": 10}
)
if ok:
    print(f"  Status: OK | Total: {t}s | First token: {ttp}s")
    print(f"  Reply: {content.strip()}")
else:
    print(f"  FAIL ({t}s): {reasoning[:150]}")

# ── TEST 2: MCQ ──────────────────────────────────────────────
print("\n[2] MCQ — temperature=0.0, max_tokens=300")
ok, t, content, reasoning, ttp = test_stream(
    "MCQ",
    MCQ_SYSTEM,
    MCQ_Q,
    {"temperature": 0.0, "max_tokens": 300}
)
if ok:
    last_line = [l for l in content.split("\n") if l.strip()][-1] if content.strip() else "?"
    print(f"  Status: OK | Total: {t}s | First token: {ttp}s")
    print(f"  Answer line: {last_line}")
    if reasoning:
        print(f"  Reasoning ({len(reasoning)} chars): {reasoning[:100]}...")
    print(f"  Full response ({len(content)} chars):\n  {content[:200]}")
else:
    print(f"  FAIL ({t}s): {reasoning[:200]}")

# ── TEST 3: CODING ───────────────────────────────────────────
print("\n[3] CODING — temperature=0.0, max_tokens=1024")
ok, t, content, reasoning, ttp = test_stream(
    "Code",
    CODE_SYSTEM,
    CODE_Q,
    {"temperature": 0.0, "max_tokens": 1024}
)
if ok:
    print(f"  Status: OK | Total: {t}s | First token: {ttp}s")
    print(f"  Code output ({len(content)} chars):\n{content[:400]}")
else:
    print(f"  FAIL ({t}s): {reasoning[:200]}")

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
