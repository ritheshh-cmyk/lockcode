import { NextRequest, NextResponse } from "next/server";
import { logRequestHistory, estimateTokens } from "@/lib/history";

export const runtime = "edge";
export const maxDuration = 60;

interface UniversalRequestBody {
  regKey?: string;
  reg_key?: string;
  mode?: "code" | "mcq" | "explain" | "format" | "raw" | string;
  prompt?: string;
  systemPrompt?: string;
  language?: string;
  model?: string;
  apiKey?: string;
  // Backward compatibility with raw Gemini JSON
  contents?: Array<{ role?: string; parts?: Array<{ text?: string }> }>;
  systemInstruction?: { parts?: Array<{ text?: string }> };
  generationConfig?: Record<string, unknown>;
}

function extractPromptFromGeminiContents(contents?: Array<{ role?: string; parts?: Array<{ text?: string }> }>): string {
  if (!contents || !Array.isArray(contents)) return "";
  const texts: string[] = [];
  for (const c of contents) {
    if (c?.parts && Array.isArray(c.parts)) {
      for (const p of c.parts) {
        if (p?.text) texts.push(p.text);
      }
    }
  }
  return texts.join("\n").trim();
}

function extractSystemPromptFromInstruction(instruction?: { parts?: Array<{ text?: string }> }): string {
  if (!instruction?.parts || !Array.isArray(instruction.parts)) return "";
  return instruction.parts.map(p => p.text || "").join("\n").trim();
}

/**
 * Diagnostic & Health Check GET Handler
 */
export async function GET(req: NextRequest) {
  const envKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map(k => k.trim())
    .filter(Boolean).length;
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasSecret = Boolean(process.env.APP_SECRET);

  return NextResponse.json({
    status: "healthy",
    service: "titan-vercel-bridge",
    version: "2.1.0",
    runtime: "edge",
    configured: {
      app_secret: hasSecret,
      gemini_keys_count: envKeys,
      groq_configured: hasGroq,
      active_provider: (process.env.ACTIVE_PROVIDER || "auto").toLowerCase(),
    },
    supported_modes: ["code", "mcq", "explain", "format", "raw"],
    endpoints: [
      "/api/bridge/generate",
      "/api/bridge/mcq",
      "/api/bridge/format",
      "/api/bridge/health",
      "/api/bridge/models",
      "/api/bridge/stream",
    ],
    timestamp: new Date().toISOString(),
  });
}

/**
 * Universal AI Completion Bridge POST Handler
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // ── 1. Authenticate Request via Secret Header ──
  const appSecret = req.headers.get("x-app-secret");
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";

  if (!appSecret || appSecret !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing x-app-secret header" },
      { status: 401 }
    );
  }

  // ── 2. Parse and Validate Request Body ──
  let body: UniversalRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON payload" },
      { status: 400 }
    );
  }

  // Normalize prompt and system instruction from either simplified or raw Gemini format
  let userPrompt = (body.prompt || "").trim();
  let systemPrompt = (body.systemPrompt || "").trim();

  if (!userPrompt && body.contents) {
    userPrompt = extractPromptFromGeminiContents(body.contents);
  }
  if (!systemPrompt && body.systemInstruction) {
    systemPrompt = extractSystemPromptFromInstruction(body.systemInstruction);
  }

  if (!userPrompt) {
    return NextResponse.json(
      { success: false, error: "Missing required prompt or contents" },
      { status: 400 }
    );
  }

  const mode = (body.mode || "code").toLowerCase();
  const requestedModel = (body.model || "gemini-2.5-flash").trim();
  const activeProvider = (process.env.ACTIVE_PROVIDER || "auto").trim().toLowerCase();
  const regKey = (body.regKey || body.reg_key || req.headers.get("x-reg-key") || "anonymous").trim();

  // Mode-specific system prompt injection if not explicitly supplied
  if (!systemPrompt) {
    if (mode === "mcq") {
      systemPrompt = "You are an expert multiple-choice examination solver. Identify the single correct option. Return the option letter and concise rationale.";
    } else if (mode === "explain") {
      systemPrompt = "You are a senior computer scientist. Provide a concise technical breakdown, time and space complexity (Big-O), and key edge cases for this problem or code.";
    } else if (mode === "code") {
      const lang = body.language || "Java";
      systemPrompt = `You are an expert ${lang} developer. Write correct, optimized, and complete ${lang} code. Output ONLY valid source code. Do not include markdown code block formatting, backticks, conversational intro, or outro text.`;
    }
  }

  // ── 3. Assemble Server-Side API Keys Pool ──
  const serverKeyPool: string[] = [];
  const rawServerKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "").split(",");
  for (const k of rawServerKeys) {
    const trimmed = k.trim();
    if (trimmed && !serverKeyPool.includes(trimmed)) {
      serverKeyPool.push(trimmed);
    }
  }

  // Candidate Gemini keys: Client Key -> Env Keys
  const candidateGeminiKeys: string[] = [];
  const clientKey = (body.apiKey || "").trim();
  if (clientKey) {
    candidateGeminiKeys.push(clientKey);
  }
  for (const k of serverKeyPool) {
    if (!candidateGeminiKeys.includes(k)) {
      candidateGeminiKeys.push(k);
    }
  }

  const groqApiKey = (process.env.GROQ_API_KEY || "").trim();
  const errorLogs: Array<{ provider: string; status?: number; message: string }> = [];

  // Helper: Format Standardized Success Response
  const buildSuccessResponse = (text: string, provider: string, modelName: string) => {
    const latencyMs = Date.now() - startTime;
    const pTokens = estimateTokens(userPrompt);
    const cTokens = estimateTokens(text);

    // Asynchronously log to history and rotate (maintaining max 10 entries per user)
    logRequestHistory({
      reg_key: regKey,
      mode,
      prompt: userPrompt,
      response: text.trim(),
      provider,
      model: modelName,
      latency_ms: latencyMs,
      promptTokens: pTokens,
      completionTokens: cTokens,
      status: "success",
    }).catch(() => {});

    return NextResponse.json({
      success: true,
      text: text.trim(),
      provider,
      model: modelName,
      mode,
      latency_ms: latencyMs,
      tokens: {
        prompt: pTokens,
        completion: cTokens,
        total: pTokens + cTokens,
      },
      // Gemini structure compatibility
      candidates: [
        {
          content: {
            parts: [{ text: text.trim() }],
            role: "model",
          },
          finishReason: "STOP",
        },
      ],
      // OpenAI structure compatibility
      choices: [
        {
          message: {
            role: "assistant",
            content: text.trim(),
          },
          finish_reason: "stop",
        },
      ],
    }, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  };

  // ── 4. Provider Execution Pipeline ──

  // ROUTE A: Directly call Groq if configured as primary
  if (activeProvider === "groq" && groqApiKey) {
    const groqResult = await callGroq(userPrompt, systemPrompt, groqApiKey);
    if (groqResult.success && groqResult.text) {
      return buildSuccessResponse(groqResult.text, "groq", "llama-3.3-70b-versatile");
    }
    errorLogs.push({ provider: "groq", message: groqResult.error || "Groq primary failed" });
  }

  // ROUTE B: Call Gemini with Key Pool Rotation (Env Keys)
  if (activeProvider !== "groq" && candidateGeminiKeys.length > 0) {
    const geminiModelsToTry = [requestedModel];
    if (!geminiModelsToTry.includes("gemini-2.5-flash")) geminiModelsToTry.push("gemini-2.5-flash");
    if (!geminiModelsToTry.includes("gemini-2.0-flash")) geminiModelsToTry.push("gemini-2.0-flash");
    if (!geminiModelsToTry.includes("gemini-1.5-flash")) geminiModelsToTry.push("gemini-1.5-flash");

    for (const key of candidateGeminiKeys) {
      for (const modelToTest of geminiModelsToTry) {
        const geminiResult = await callGemini(userPrompt, systemPrompt, key, modelToTest, body.generationConfig);
        
        if (geminiResult.success && geminiResult.text) {
          return buildSuccessResponse(geminiResult.text, "gemini", modelToTest);
        }

        const status = geminiResult.status || 500;
        errorLogs.push({
          provider: `gemini (${modelToTest})`,
          status,
          message: geminiResult.error || "Gemini error",
        });

        // 404: Try next model with same key
        if (status === 404) continue;

        // 429 (quota), 403 (forbidden/invalid key), 401: Rotate to next key
        if (status === 429 || status === 403 || status === 401) break;

        break;
      }
    }
  }

  // ROUTE C: Dynamic Supabase Pool Fallback (Tier 2)
  // If env keys were exhausted or absent, query active keys from Supabase database
  if (activeProvider !== "groq") {
    const dbPoolKeys = await fetchPoolKeysFromSupabase();
    if (dbPoolKeys.length > 0) {
      for (const key of dbPoolKeys) {
        if (candidateGeminiKeys.includes(key)) continue; // skip already tried
        const geminiResult = await callGemini(userPrompt, systemPrompt, key, "gemini-2.5-flash", body.generationConfig);
        if (geminiResult.success && geminiResult.text) {
          return buildSuccessResponse(geminiResult.text, "gemini-db-pool", "gemini-2.5-flash");
        }
        errorLogs.push({
          provider: "gemini-db-pool",
          status: geminiResult.status || 500,
          message: geminiResult.error || "DB pool key failed",
        });
      }
    }
  }

  // ROUTE D: Automatic Fallback to Groq if Gemini failed or unconfigured (Tier 3)
  if (groqApiKey && activeProvider !== "gemini") {
    const groqResult = await callGroq(userPrompt, systemPrompt, groqApiKey);
    if (groqResult.success && groqResult.text) {
      return buildSuccessResponse(groqResult.text, "groq (fallback)", "llama-3.3-70b-versatile");
    }
    errorLogs.push({ provider: "groq (fallback)", message: groqResult.error || "Groq fallback failed" });
  }

  // ── 5. All Providers Exhausted ──
  const latencyMs = Date.now() - startTime;
  logRequestHistory({
    reg_key: regKey,
    mode,
    prompt: userPrompt,
    response: errorLogs.map(e => `${e.provider}: ${e.message}`).join("\n"),
    provider: "exhausted",
    model: "none",
    latency_ms: latencyMs,
    status: "failed",
  }).catch(() => {});

  return NextResponse.json(
    {
      success: false,
      error: "All AI providers, pools, and keys exhausted",
      latency_ms: latencyMs,
      details: errorLogs,
      hint: "Add or rotate GEMINI_API_KEYS or GROQ_API_KEY in Vercel Project Environment Variables or Supabase api_key_pool",
    },
    { status: 502 }
  );
}

// ── Call Google Gemini API ──
async function callGemini(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  model: string,
  customConfig?: Record<string, unknown>
): Promise<{ success: boolean; text?: string; status?: number; error?: string }> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:generateContent?key=${encodeURIComponent(apiKey)}`;

    const payload: Record<string, unknown> = {
      contents: [
        {
          role: "user",
          parts: [{ text: prompt }],
        },
      ],
      generationConfig: {
        temperature: 0.0,
        maxOutputTokens: 4000,
        topP: 1.0,
        ...(customConfig || {}),
      },
    };

    if (systemPrompt) {
      payload.systemInstruction = {
        parts: [{ text: systemPrompt }],
      };
    }

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, status, error: `HTTP ${status}: ${errText.slice(0, 300)}` };
    }

    const data = await res.json();
    const candidates = data?.candidates;
    if (candidates && Array.isArray(candidates) && candidates.length > 0) {
      const parts = candidates[0]?.content?.parts;
      if (parts && Array.isArray(parts)) {
        const text = parts.map((p: { text?: string }) => p.text || "").join("\n").trim();
        if (text) {
          return { success: true, text, status };
        }
      }
    }

    return { success: false, status, error: "Empty or unrecognized Gemini candidate structure" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, status: 500, error: msg };
  }
}

// ── Call Groq API (Llama-3.3-70b-versatile) ──
async function callGroq(
  prompt: string,
  systemPrompt: string,
  apiKey: string
): Promise<{ success: boolean; text?: string; status?: number; error?: string }> {
  try {
    const messages: Array<{ role: string; content: string }> = [];
    if (systemPrompt) {
      messages.push({ role: "system", content: systemPrompt });
    }
    messages.push({ role: "user", content: prompt });

    const payload = {
      model: "llama-3.3-70b-versatile",
      messages,
      temperature: 0.1,
      max_tokens: 4000,
    };

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(payload),
    });

    const status = res.status;
    if (!res.ok) {
      const errText = await res.text();
      return { success: false, status, error: `Groq HTTP ${status}: ${errText.slice(0, 300)}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (content) {
      return { success: true, text: String(content).trim(), status };
    }

    return { success: false, status, error: "Empty response content from Groq" };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, status: 500, error: msg };
  }
}

// ── Dynamic Supabase Key Pool Fetcher (Tier 2) ──
async function fetchPoolKeysFromSupabase(): Promise<string[]> {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !serviceKey) return [];

    const res = await fetch(
      `${url}/rest/v1/api_key_pool?used=eq.false&status=neq.invalid&select=key&limit=5`,
      {
        headers: {
          apikey: serviceKey,
          Authorization: `Bearer ${serviceKey}`,
        },
        cache: "no-store",
      }
    );
    if (!res.ok) return [];
    const data: Array<{ key?: string }> = await res.json();
    return (data || []).map(d => (d.key || "").trim()).filter(Boolean);
  } catch {
    return [];
  }
}
