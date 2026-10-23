import { supabaseAdmin } from "@/lib/supabase";
import { logRequestHistory, estimateTokens } from "@/lib/history";

export interface AIProviderRecord {
  id: string;
  provider: "groq" | "gemini" | "openai" | "anthropic" | "deepseek" | "cerebras" | "openrouter" | "custom" | string;
  label: string;
  api_key: string;
  model: string;
  base_url: string | null;
  priority: number;
  is_active: boolean;
  rate_limited_until: string | null;
  last_error: string | null;
  last_latency_ms: number;
  total_calls: number;
  successful_calls: number;
  created_at: string;
}

export interface BrainQueryResult {
  success: boolean;
  text: string;
  provider: string;
  model: string;
  latency_ms: number;
  tokens: {
    prompt: number;
    completion: number;
    total: number;
  };
  candidates: Array<{
    content: {
      parts: Array<{ text: string }>;
      role: string;
    };
    finishReason: string;
  }>;
  choices: Array<{
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }>;
  error?: string;
  failoverHistory?: Array<{ provider: string; model: string; error: string; status?: number }>;
}

// ── In-Memory Active Providers Cache (15s TTL) ──
let cachedProviders: AIProviderRecord[] | null = null;
let lastCacheFetchTime = 0;
const CACHE_TTL_MS = 15_000;

/**
 * Fetch all active providers sorted by priority.
 * Uses 15s in-memory caching to eliminate redundant DB queries.
 */
export async function getActiveProviders(forceRefresh = false): Promise<AIProviderRecord[]> {
  const now = Date.now();
  if (!forceRefresh && cachedProviders && now - lastCacheFetchTime < CACHE_TTL_MS) {
    return cachedProviders;
  }

  try {
    const { data, error } = await supabaseAdmin
      .from("ai_providers")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (!error && data && data.length > 0) {
      cachedProviders = data as AIProviderRecord[];
      lastCacheFetchTime = now;
      return cachedProviders;
    }
  } catch (err) {
    console.error("[Brain] Error fetching providers from DB:", err);
  }

  // Fallback to environment variables if database table is empty
  const fallbackProviders: AIProviderRecord[] = [];
  const geminiKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);

  if (geminiKeys.length > 0) {
    fallbackProviders.push({
      id: "env-gemini-fallback",
      provider: "gemini",
      label: "Env Gemini Key Pool",
      api_key: geminiKeys.join(","),
      model: "gemini-2.5-flash",
      base_url: null,
      priority: 1,
      is_active: true,
      rate_limited_until: null,
      last_error: null,
      last_latency_ms: 0,
      total_calls: 0,
      successful_calls: 0,
      created_at: new Date().toISOString(),
    });
  }

  if (process.env.GROQ_API_KEY) {
    fallbackProviders.push({
      id: "env-groq-fallback",
      provider: "groq",
      label: "Env Groq Fallback",
      api_key: process.env.GROQ_API_KEY.trim(),
      model: "llama-3.3-70b-versatile",
      base_url: null,
      priority: 2,
      is_active: true,
      rate_limited_until: null,
      last_error: null,
      last_latency_ms: 0,
      total_calls: 0,
      successful_calls: 0,
      created_at: new Date().toISOString(),
    });
  }

  cachedProviders = fallbackProviders;
  lastCacheFetchTime = now;
  return fallbackProviders;
}

export function invalidateProvidersCache(): void {
  cachedProviders = null;
  lastCacheFetchTime = 0;
}

// ── Provider Execution Adapters ──

async function callOpenAICompatible(
  endpoint: string,
  apiKey: string,
  model: string,
  prompt: string,
  systemPrompt: string,
  timeoutMs = 30_000
): Promise<{ success: boolean; text?: string; status?: number; error?: string }> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const messages: Array<{ role: string; content: string }> = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: 0.2,
        max_tokens: 4096,
      }),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      return { success: false, status: res.status, error: `HTTP ${res.status}: ${errText.slice(0, 300)}` };
    }

    const data = await res.json();
    const content = data?.choices?.[0]?.message?.content;
    if (content) {
      return { success: true, text: content.trim() };
    }
    return { success: false, error: "Empty completion in response" };
  } catch (err: unknown) {
    clearTimeout(timer);
    const errorMsg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Network error: ${errorMsg}` };
  }
}

async function callGroq(
  provider: AIProviderRecord,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; text?: string; status?: number; error?: string }> {
  const endpoint = provider.base_url?.trim() || "https://api.groq.com/openai/v1/chat/completions";
  const model = provider.model || "llama-3.3-70b-versatile";
  // Support comma-separated keys for sub-rotation
  const keys = provider.api_key.split(",").map((k) => k.trim()).filter(Boolean);
  const chosenKey = keys[Math.floor(Math.random() * keys.length)] || provider.api_key;

  return callOpenAICompatible(endpoint, chosenKey, model, prompt, systemPrompt, 25_000);
}

async function callGemini(
  provider: AIProviderRecord,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; text?: string; status?: number; error?: string }> {
  const keys = provider.api_key.split(",").map((k) => k.trim()).filter(Boolean);
  if (keys.length === 0) {
    return { success: false, error: "No Gemini API key available" };
  }

  const modelsToTry = [provider.model || "gemini-2.5-flash"];
  if (!modelsToTry.includes("gemini-2.5-flash")) modelsToTry.push("gemini-2.5-flash");
  if (!modelsToTry.includes("gemini-2.0-flash")) modelsToTry.push("gemini-2.0-flash");
  if (!modelsToTry.includes("gemini-1.5-flash")) modelsToTry.push("gemini-1.5-flash");

  for (const key of keys) {
    for (const model of modelsToTry) {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 25_000);

      const payload: Record<string, unknown> = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          maxOutputTokens: 4096,
        },
      };

      if (systemPrompt) {
        payload.systemInstruction = { parts: [{ text: systemPrompt }] };
      }

      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal,
        });

        clearTimeout(timer);

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text) {
            return { success: true, text: text.trim() };
          }
        } else {
          const status = res.status;
          const errText = await res.text().catch(() => "");
          // If 404, try next model with same key
          if (status === 404) continue;
          // If 429 or 403, break out of this key to try next key in pool
          if (status === 429 || status === 403 || status === 401) break;
        }
      } catch {
        clearTimeout(timer);
        continue;
      }
    }
  }

  return { success: false, status: 500, error: "All Gemini keys and model fallbacks exhausted" };
}

async function callAnthropic(
  provider: AIProviderRecord,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; text?: string; status?: number; error?: string }> {
  const endpoint = provider.base_url?.trim() || "https://api.anthropic.com/v1/messages";
  const model = provider.model || "claude-3-5-sonnet-20241022";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 35_000);

  const payload: Record<string, unknown> = {
    model,
    max_tokens: 4096,
    messages: [{ role: "user", content: prompt }],
  };

  if (systemPrompt) {
    payload.system = systemPrompt;
  }

  try {
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "x-api-key": provider.api_key.trim(),
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timer);

    if (!res.ok) {
      const err = await res.text().catch(() => "");
      return { success: false, status: res.status, error: `Anthropic HTTP ${res.status}: ${err.slice(0, 300)}` };
    }

    const data = await res.json();
    const text = data?.content?.[0]?.text;
    if (text) return { success: true, text: text.trim() };
    return { success: false, error: "Empty Anthropic response" };
  } catch (err: unknown) {
    clearTimeout(timer);
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: `Anthropic error: ${msg}` };
  }
}

async function callGenericOpenAI(
  provider: AIProviderRecord,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; text?: string; status?: number; error?: string }> {
  let endpoint = provider.base_url?.trim() || "https://api.openai.com/v1/chat/completions";
  if (provider.provider === "deepseek" && !provider.base_url) {
    endpoint = "https://api.deepseek.com/chat/completions";
  } else if (provider.provider === "openrouter" && !provider.base_url) {
    endpoint = "https://openrouter.ai/api/v1/chat/completions";
  } else if (provider.provider === "cerebras" && !provider.base_url) {
    endpoint = "https://api.cerebras.ai/v1/chat/completions";
  }

  const model = provider.model || (provider.provider === "deepseek" ? "deepseek-chat" : "gpt-4o-mini");
  const keys = provider.api_key.split(",").map((k) => k.trim()).filter(Boolean);
  const chosenKey = keys[Math.floor(Math.random() * keys.length)] || provider.api_key;

  return callOpenAICompatible(endpoint, chosenKey, model, prompt, systemPrompt, 30_000);
}

/**
 * Dispatch a question to the specific provider adapter.
 */
async function dispatchToProvider(
  provider: AIProviderRecord,
  prompt: string,
  systemPrompt: string
): Promise<{ success: boolean; text?: string; status?: number; error?: string }> {
  const pType = (provider.provider || "").toLowerCase();

  if (pType === "groq") {
    return callGroq(provider, prompt, systemPrompt);
  }
  if (pType === "gemini") {
    return callGemini(provider, prompt, systemPrompt);
  }
  if (pType === "anthropic") {
    return callAnthropic(provider, prompt, systemPrompt);
  }
  return callGenericOpenAI(provider, prompt, systemPrompt);
}

/**
 * Update provider health & telemetry metrics in Supabase asynchronously.
 */
async function recordProviderMetrics(
  providerId: string,
  latencyMs: number,
  isSuccess: boolean,
  errorMessage: string | null = null,
  isRateLimited = false
): Promise<void> {
  if (providerId.startsWith("env-")) return;

  const updateData: Record<string, unknown> = {
    last_latency_ms: latencyMs,
  };

  if (isSuccess) {
    updateData.last_error = null;
  } else if (errorMessage) {
    updateData.last_error = errorMessage.slice(0, 500);
  }

  if (isRateLimited) {
    // 60-second backoff circuit breaker
    updateData.rate_limited_until = new Date(Date.now() + 60_000).toISOString();
  }

  try {
    await supabaseAdmin
      .from("ai_providers")
      .update(updateData)
      .eq("id", providerId);
  } catch {
    // Non-blocking telemetry
  }
}

/**
 * Central "Brain" execution engine:
 * Evaluates available active providers, handles priority cascading and automatic failover,
 * logs request history (strictly retaining top 10 per user), and formats standardized
 * responses for TITAN desktop client.
 */
export async function executeBrainQuery(params: {
  prompt: string;
  systemPrompt?: string;
  mode?: string;
  language?: string;
  regKey?: string;
}): Promise<BrainQueryResult> {
  const startTime = Date.now();
  const prompt = (params.prompt || "").trim();
  let systemPrompt = (params.systemPrompt || "").trim();
  const mode = (params.mode || "code").toLowerCase();
  const regKey = (params.regKey || "anonymous").trim();

  // Mode-specific system instructions
  if (!systemPrompt) {
    if (mode === "mcq") {
      systemPrompt =
        "You are an expert multiple-choice examination solver. Identify the single correct option. Return the option letter and concise rationale.";
    } else if (mode === "explain") {
      systemPrompt =
        "You are a senior computer scientist. Provide a concise technical breakdown, time and space complexity (Big-O), and key edge cases.";
    } else if (mode === "code") {
      const lang = params.language || "Java";
      systemPrompt = `You are an expert ${lang} developer. Write correct, optimized, and complete ${lang} code. Output ONLY valid source code. Do not include markdown code block formatting, backticks, conversational intro, or outro text.`;
    }
  }

  const providers = await getActiveProviders();
  const failoverHistory: Array<{ provider: string; model: string; error: string; status?: number }> = [];

  const now = new Date();

  for (const provider of providers) {
    // Circuit breaker: skip if provider is currently in rate-limit backoff
    if (provider.rate_limited_until) {
      const backoffUntil = new Date(provider.rate_limited_until);
      if (backoffUntil > now) {
        failoverHistory.push({
          provider: provider.provider,
          model: provider.model,
          error: "Skipped: Provider in rate-limit backoff until " + backoffUntil.toLocaleTimeString(),
          status: 429,
        });
        continue;
      }
    }

    const providerStart = Date.now();
    const result = await dispatchToProvider(provider, prompt, systemPrompt);
    const providerLatency = Date.now() - providerStart;

    if (result.success && result.text) {
      const totalLatency = Date.now() - startTime;
      const cleanText = result.text.trim();
      const pTokens = estimateTokens(prompt);
      const cTokens = estimateTokens(cleanText);

      // Asynchronously update provider metrics
      recordProviderMetrics(provider.id, providerLatency, true);

      // Record request history (rolling 10 items per user)
      try {
        await logRequestHistory({
          reg_key: regKey,
          mode,
          prompt,
          response: cleanText,
          provider: provider.provider,
          model: provider.model,
          latency_ms: totalLatency,
          promptTokens: pTokens,
          completionTokens: cTokens,
          status: "success",
        });
      } catch (err) {
        console.error("Error logging request history:", err);
      }

      return {
        success: true,
        text: cleanText,
        provider: provider.provider,
        model: provider.model,
        latency_ms: totalLatency,
        tokens: {
          prompt: pTokens,
          completion: cTokens,
          total: pTokens + cTokens,
        },
        candidates: [
          {
            content: {
              parts: [{ text: cleanText }],
              role: "model",
            },
            finishReason: "STOP",
          },
        ],
        choices: [
          {
            message: {
              role: "assistant",
              content: cleanText,
            },
            finish_reason: "stop",
          },
        ],
        failoverHistory: failoverHistory.length > 0 ? failoverHistory : undefined,
      };
    }

    // Provider failed -> record telemetry & failover to next
    const isRateLimit = result.status === 429;
    recordProviderMetrics(provider.id, providerLatency, false, result.error, isRateLimit);

    failoverHistory.push({
      provider: provider.provider,
      model: provider.model,
      error: result.error || "Unknown provider error",
      status: result.status,
    });
  }

  // If all providers failed
  const totalLatency = Date.now() - startTime;
  return {
    success: false,
    text: "",
    provider: "none",
    model: "none",
    latency_ms: totalLatency,
    tokens: { prompt: estimateTokens(prompt), completion: 0, total: estimateTokens(prompt) },
    candidates: [],
    choices: [],
    error: "All AI providers in the Brain cascade failed or exhausted their rate limits.",
    failoverHistory,
  };
}

/**
 * Test connectivity and measure round-trip latency to a provider.
 */
export async function testProviderConnection(provider: Partial<AIProviderRecord>): Promise<{
  success: boolean;
  latency_ms: number;
  message?: string;
  responsePreview?: string;
}> {
  const dummyRecord: AIProviderRecord = {
    id: provider.id || "test",
    provider: provider.provider || "groq",
    label: provider.label || "Test Provider",
    api_key: provider.api_key || "",
    model: provider.model || "llama-3.3-70b-versatile",
    base_url: provider.base_url || null,
    priority: provider.priority ?? 1,
    is_active: true,
    rate_limited_until: null,
    last_error: null,
    last_latency_ms: 0,
    total_calls: 0,
    successful_calls: 0,
    created_at: new Date().toISOString(),
  };

  const start = Date.now();
  const res = await dispatchToProvider(
    dummyRecord,
    "Reply with the single word 'READY' and nothing else.",
    "You are a connection test echo bot."
  );
  const latency = Date.now() - start;

  if (res.success && res.text) {
    return {
      success: true,
      latency_ms: latency,
      responsePreview: res.text.slice(0, 50),
    };
  }

  return {
    success: false,
    latency_ms: latency,
    message: res.error || "Connection timed out or failed to return valid text",
  };
}
