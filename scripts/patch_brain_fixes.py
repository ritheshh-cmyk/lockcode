import os

brain_path = os.path.join("web", "lib", "brain.ts")
with open(brain_path, "r", encoding="utf-8") as f:
    brain_code = f.read()

is_crlf = "\r\n" in brain_code
norm = brain_code.replace("\r\n", "\n")

# 1. Fix Groq & OpenAI maxTokens from 120 to 400 for MCQ
norm = norm.replace(
    'const maxTokens = mode === "mcq" ? 120 : 2048;',
    'const maxTokens = mode === "mcq" ? 400 : 2048;'
)

# 2. Fix Gemini thinkingConfig condition so non-2.5 models don't 400 Bad Request
old_thinking = '''      if (mode === "mcq") {

        generationConfig.thinkingConfig = { thinkingBudget: 0 };

      }'''

new_thinking = '''      if (mode === "mcq" && (model.includes("2.5") || model.includes("thinking") || model.includes("reasoning"))) {

        generationConfig.thinkingConfig = { thinkingBudget: 0 };

      }'''

if old_thinking in norm:
    norm = norm.replace(old_thinking, new_thinking)
    print("Patched thinkingConfig guard in brain.ts")
else:
    # Try compact whitespace
    old_thinking_compact = 'if (mode === "mcq") {\n        generationConfig.thinkingConfig = { thinkingBudget: 0 };\n      }'
    new_thinking_compact = 'if (mode === "mcq" && (model.includes("2.5") || model.includes("thinking") || model.includes("reasoning"))) {\n        generationConfig.thinkingConfig = { thinkingBudget: 0 };\n      }'
    if old_thinking_compact in norm:
        norm = norm.replace(old_thinking_compact, new_thinking_compact)
        print("Patched compact thinkingConfig guard in brain.ts")
    else:
        print("Warning: thinkingConfig pattern not found")

# 3. Fix reasoning_content in callOpenAICompatible
old_content = '''    const data = await res.json();

    const content = data?.choices?.[0]?.message?.content;

    if (content) {

      return { success: true, text: content.trim() };

    }'''

new_content = '''    const data = await res.json();

    const msg = data?.choices?.[0]?.message;

    const content = msg?.content || msg?.reasoning_content || "";

    if (content) {

      return { success: true, text: content.trim() };

    }'''

if old_content in norm:
    norm = norm.replace(old_content, new_content)
    print("Patched reasoning_content fallback in brain.ts")
else:
    print("Warning: old_content pattern not found in brain.ts")

out_brain = norm.replace("\n", "\r\n") if is_crlf else norm
with open(brain_path, "w", encoding="utf-8") as f:
    f.write(out_brain)
print("Updated brain.ts")

# 4. Patch web/app/api/bridge/stream/route.ts for key rotation
stream_path = os.path.join("web", "app", "api", "bridge", "stream", "route.ts")
with open(stream_path, "r", encoding="utf-8") as f:
    stream_code = f.read()

is_crlf_s = "\r\n" in stream_code
norm_s = stream_code.replace("\r\n", "\n")

old_stream_tail = '''  const primaryKey = provider.api_key.split(",")[0]?.trim();
  if (!primaryKey) return null;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${primaryKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      messages,
      stream: true,
      temperature: 0.2,
      max_tokens: 4096,
    }),
  });

  return res.ok && res.body ? res : null;'''

new_stream_tail = '''  const keys = provider.api_key.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) return null;

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) messages.push({ role: "system", content: systemPrompt });
  messages.push({ role: "user", content: prompt });

  for (const key of keys) {
    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
          stream: true,
          temperature: 0.2,
          max_tokens: 4096,
        }),
      });

      if (res.ok && res.body) return res;
    } catch {
      // try next key in pool
    }
  }

  return null;'''

if old_stream_tail in norm_s:
    norm_s = norm_s.replace(old_stream_tail, new_stream_tail)
    print("Patched key rotation in stream/route.ts")
else:
    print("Warning: stream tail pattern not found")

out_stream = norm_s.replace("\n", "\r\n") if is_crlf_s else norm_s
with open(stream_path, "w", encoding="utf-8") as f:
    f.write(out_stream)
print("Updated stream/route.ts")
