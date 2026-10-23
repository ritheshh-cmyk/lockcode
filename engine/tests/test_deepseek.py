"""
DeepSeek V4 Flash NIM endpoint test — streaming with reasoning
"""
import json
import time
import requests

NIM_BASE    = "https://integrate.api.nvidia.com/v1/chat/completions"
DS_KEY      = "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"
DS_MODEL    = "deepseek-ai/deepseek-v4-flash"

MCQ_SYSTEM = (
    "You are an MCQ answer engine for university-level computer science questions. "
    "Analyze the question carefully. "
    "On the VERY LAST line of your response, write EXACTLY: Answer: <number> "
    "where <number> is 1, 2, 3, or 4. Do NOT write anything after the Answer line."
)

CODE_SYSTEM = (
    "You are a Java competitive programming expert. "
    "Output ONLY raw compilable Java source code. "
    "ZERO comments. NO markdown fences. NO explanation."
)

MCQ_Q = (
    "Which data structure is used in BFS traversal of a graph?\n"
    "1. Stack\n2. Queue\n3. Priority Queue\n4. Linked List"
)

CODE_Q = (
    "Write a complete Java solution:\n"
    "Given an integer n, return the nth Fibonacci number (0-indexed, 0<=n<=30).\n"
    "Use iterative approach. Output only the class."
)

def test_stream(label, system, user_msg, temperature=0.0, max_tokens=512):
    headers = {"Authorization": "Bearer " + DS_KEY, "Content-Type": "application/json"}
    payload = {
        "model": DS_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_msg}
        ],
        "temperature": temperature,
        "top_p": 0.95,
        "max_tokens": max_tokens,
        "extra_body": {"chat_template_kwargs": {"thinking": True, "reasoning_effort": "low"}},
        "stream": True
    }
    t0 = time.time()
    content_parts   = []
    reasoning_parts = []
    first_token_t   = None

    try:
        with requests.post(NIM_BASE, headers=headers, json=payload,
                           stream=True, timeout=(5, 120)) as r:
            if r.status_code != 200:
                return False, round(time.time()-t0, 2), "", f"HTTP {r.status_code}: {r.text[:200]}", None

            for line in r.iter_lines():
                if not line:
                    continue
                raw = line.decode("utf-8")
                if not raw.startswith("data: "):
                    continue
                raw = raw[6:]
                if raw.strip() == "[DONE]":
                    break
                try:
                    chunk = json.loads(raw)
                except Exception:
                    continue

                choices = chunk.get("choices", [])
                if not choices:
                    continue
                delta = choices[0].get("delta", {})

                reasoning = delta.get("reasoning") or delta.get("reasoning_content")
                content   = delta.get("content")

                if first_token_t is None and (reasoning or content):
                    first_token_t = round(time.time() - t0, 2)

                if reasoning:
                    reasoning_parts.append(reasoning)
                if content:
                    content_parts.append(content)

        elapsed = round(time.time() - t0, 2)
        return True, elapsed, "".join(content_parts), "".join(reasoning_parts), first_token_t

    except Exception as e:
        return False, round(time.time()-t0, 2), "", str(e), None


print("=" * 60)
print("DeepSeek V4 Flash (deepseek-ai/deepseek-v4-flash) TEST")
print("=" * 60)

# ── TEST 1: Ping ─────────────────────────────────────────────
print("\n[1] PING")
ok, t, content, reasoning, ttp = test_stream(
    "Ping", "You are helpful.", "Reply with OK only.", temperature=0.1, max_tokens=10
)
print(f"  {'OK' if ok else 'FAIL'} | total={t}s | first_token={ttp}s")
print(f"  Reply: {content.strip()[:80]}")
if not ok:
    print(f"  Error: {reasoning[:200]}")

# ── TEST 2: MCQ ──────────────────────────────────────────────
print("\n[2] MCQ | temp=0.0 | max_tokens=300")
ok, t, content, reasoning, ttp = test_stream(
    "MCQ", MCQ_SYSTEM, MCQ_Q, temperature=0.0, max_tokens=300
)
if ok:
    last_line = [l for l in content.split("\n") if l.strip()][-1] if content.strip() else "?"
    print(f"  OK | total={t}s | first_token={ttp}s | content_len={len(content)}")
    print(f"  Answer line : {last_line}")
    if reasoning:
        print(f"  Reasoning   : {reasoning[:120]}...")
    print(f"  Full output :\n  {content[:250]}")
else:
    print(f"  FAIL ({t}s): {reasoning[:200]}")

# ── TEST 3: Coding ───────────────────────────────────────────
print("\n[3] CODING | temp=0.0 | max_tokens=1024")
ok, t, content, reasoning, ttp = test_stream(
    "Code", CODE_SYSTEM, CODE_Q, temperature=0.0, max_tokens=1024
)
if ok:
    print(f"  OK | total={t}s | first_token={ttp}s | content_len={len(content)}")
    print(f"  Code output:\n{content[:400]}")
else:
    print(f"  FAIL ({t}s): {reasoning[:200]}")

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
