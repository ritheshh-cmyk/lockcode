"""
NIM Parameter Tuning Test
Tests Llama + Minimax with real MCQ and coding prompts.
Finds optimal parameters for speed + correctness.
"""
import requests
import time

NIM_BASE = "https://integrate.api.nvidia.com/v1/chat/completions"

MINIMAX_KEY = "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"
LLAMA_KEY   = "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"

MCQ_SYSTEM = (
    "You are an MCQ answer engine for university-level computer science questions. "
    "Analyze the question carefully, evaluate each option, and eliminate wrong ones. "
    "Your reasoning MUST be brief (2-4 sentences max). "
    "On the VERY LAST line of your response, write EXACTLY: Answer: <number> "
    "where <number> is 1, 2, 3, or 4. "
    "Do NOT write anything after the Answer line."
)

CODE_SYSTEM = (
    "You are a Java competitive programming expert. "
    "OUTPUT RULES (STRICT): "
    "1. Output ONLY raw compilable Java source code. Nothing else. "
    "2. ZERO inline comments. ZERO explanatory comments. "
    "3. NO markdown fences. Raw code only. "
    "4. NO prose, NO explanation, NO preamble. "
    "5. Handle ALL edge cases. Code MUST pass every hidden test case."
)

MCQ_QUESTION = (
    "Which data structure is used in BFS traversal of a graph?\n"
    "1. Stack\n2. Queue\n3. Priority Queue\n4. Linked List"
)

CODE_QUESTION = (
    "Write a complete Java solution:\n"
    "Given an integer n, return the nth Fibonacci number.\n"
    "Input: Single integer n (0-indexed, 0<=n<=30)\n"
    "Output: The nth Fibonacci number\n"
    "Use efficient iterative approach."
)

def test(label, model, key, prompt_type, system, user_msg, params):
    headers = {"Authorization": "Bearer " + key, "Content-Type": "application/json"}
    payload = {
        "model": model,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user",   "content": user_msg}
        ],
        **params,
        "stream": False
    }
    t0 = time.time()
    try:
        r = requests.post(NIM_BASE, headers=headers, json=payload, timeout=(5, 120))
        elapsed = round(time.time() - t0, 2)
        if r.status_code == 200:
            content = r.json()["choices"][0]["message"]["content"].strip()
            tokens_used = r.json().get("usage", {}).get("completion_tokens", "?")
            return True, elapsed, content, tokens_used
        else:
            return False, round(time.time()-t0,2), r.text[:200], 0
    except Exception as e:
        return False, round(time.time()-t0,2), str(e), 0

print("=" * 60)
print("NIM PARAMETER TUNING TEST")
print("=" * 60)

# ── LLAMA 3.3 70B ───────────────────────────────────────────
print("\n[1] LLAMA 3.3 70B — MCQ (confirmed working)")
print("-" * 60)
configs = [
    {"label": "temp=0.1  tokens=512",  "params": {"temperature": 0.1,  "max_tokens": 512,  "top_p": 0.7}},
    {"label": "temp=0.0  tokens=300",  "params": {"temperature": 0.0,  "max_tokens": 300,  "top_p": 1.0}},
    {"label": "temp=0.2  tokens=1024", "params": {"temperature": 0.2,  "max_tokens": 1024, "top_p": 0.7}},
]
for cfg in configs:
    ok, t, content, tok = test(
        "Llama-MCQ", "meta/llama-3.3-70b-instruct", LLAMA_KEY,
        "mcq", MCQ_SYSTEM, MCQ_QUESTION, cfg["params"]
    )
    status = "OK" if ok else "FAIL"
    print(f"  {cfg['label']}  |  {t}s  |  tokens={tok}  |  {status}")
    if ok:
        last_line = [l for l in content.split("\n") if l.strip()][-1]
        print(f"  Answer line: {last_line}")
        print(f"  Full ({len(content)} chars): {content[:120]}")
    else:
        print(f"  ERROR: {content[:100]}")
    print()

print("\n[2] LLAMA 3.3 70B — CODING")
print("-" * 60)
ok, t, content, tok = test(
    "Llama-Code", "meta/llama-3.3-70b-instruct", LLAMA_KEY,
    "code", CODE_SYSTEM, CODE_QUESTION,
    {"temperature": 0.0, "max_tokens": 1024, "top_p": 1.0}
)
print(f"  Time: {t}s | tokens={tok} | {'OK' if ok else 'FAIL'}")
if ok:
    print(f"  Output ({len(content)} chars):\n{content[:400]}")
else:
    print(f"  ERROR: {content[:150]}")

# ── MINIMAX M2.7 ─────────────────────────────────────────────
print("\n\n[3] MINIMAX m2.7 — MCQ (testing with streaming disabled)")
print("-" * 60)
minimax_configs = [
    {"label": "temp=0.1 tokens=256",  "params": {"temperature": 0.1, "max_tokens": 256}},
    {"label": "temp=0.5 tokens=512",  "params": {"temperature": 0.5, "max_tokens": 512}},
]
for cfg in minimax_configs:
    ok, t, content, tok = test(
        "Minimax-MCQ", "minimaxai/minimax-m2.7", MINIMAX_KEY,
        "mcq", MCQ_SYSTEM, MCQ_QUESTION, cfg["params"]
    )
    status = "OK" if ok else "FAIL/TIMEOUT"
    print(f"  {cfg['label']}  |  {t}s  |  {status}")
    if ok:
        last_line = [l for l in content.split("\n") if l.strip()][-1]
        print(f"  Answer line: {last_line}")
    else:
        print(f"  Detail: {content[:100]}")
    print()

print("\n" + "=" * 60)
print("DONE")
print("=" * 60)
