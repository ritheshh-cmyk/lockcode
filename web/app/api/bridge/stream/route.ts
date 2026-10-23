import { NextRequest, NextResponse } from "next/server";
import { getActiveProviders, AIProviderRecord, getUserAllottedProvider } from "@/lib/brain";
import { sanitizePrompt } from "@/lib/sanitize";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Universal Streaming Gateway
 * Dynamically resolves the highest-priority active provider in the Brain vault
 * and pipes real-time SSE tokens to the TITAN desktop client.
 */
export async function POST(req: NextRequest) {
  // 1. Secret authentication
  const appSecret = req.headers.get("x-app-secret");
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";
  if (!appSecret || appSecret !== expectedSecret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  // 2. Parse request
  let body: { prompt?: string; question?: string; systemPrompt?: string; model?: string; regKey?: string; mode?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const userPrompt = sanitizePrompt((body.prompt || body.question || "").trim());
  if (!userPrompt) {
    return new NextResponse("Prompt is required", { status: 400 });
  }

  const systemPrompt = (body.systemPrompt || "").trim();

  // 3. Resolve active providers from Brain with user license allotment
  const regKey = (body.regKey || req.headers.get("x-reg-key") || "anonymous").trim();
  let providers = await getActiveProviders();
  const allottedModel = await getUserAllottedProvider(regKey);
  if (allottedModel && allottedModel !== "all" && allottedModel !== "auto") {
    const byId = providers.filter((p) => p.id.toLowerCase() === allottedModel);
    if (byId.length > 0) {
      providers = byId;
    } else {
      const byFamily = providers.filter(
        (p) => p.provider.toLowerCase() === allottedModel || p.model.toLowerCase().includes(allottedModel)
      );
      if (byFamily.length > 0) {
        providers = byFamily;
      }
    }
  }

  if (providers.length === 0) {
    return new NextResponse("No active AI providers configured in Brain", { status: 503 });
  }

  // 4. Attempt streaming across active providers in cascade order
  for (const p of providers) {
    try {
      const streamRes = await openProviderStream(p, userPrompt, systemPrompt, body.model);
      if (streamRes && streamRes.body) {
        return new NextResponse(streamRes.body as any, {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
            "X-Provider": p.provider,
            "X-Model": p.model,
          },
        });
      }
    } catch {
      // Continue to next provider in cascade
    }
  }

  return new NextResponse("All streaming providers failed or were unavailable", { status: 502 });
}

async function openProviderStream(
  provider: AIProviderRecord,
  prompt: string,
  systemPrompt: string,
  modelOverride?: string
): Promise<Response | null> {
  const model = modelOverride || provider.model;

  // Gemini native SSE stream
  if (provider.provider === "gemini") {
    const primaryKey = provider.api_key.split(",")[0]?.trim();
    if (!primaryKey) return null;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
      model
    )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(primaryKey)}`;

    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        ...(systemPrompt ? { systemInstruction: { parts: [{ text: systemPrompt }] } } : {}),
      }),
    });

    return res.ok && res.body ? res : null;
  }

  // OpenAI-compatible SSE stream (Groq, DeepSeek, OpenAI, Anthropic via bridge, Custom, OpenRouter)
  let endpoint = provider.base_url;
  if (!endpoint) {
    if (provider.provider === "groq") endpoint = "https://api.groq.com/openai/v1/chat/completions";
    else if (provider.provider === "deepseek") endpoint = "https://api.deepseek.com/chat/completions";
    else if (provider.provider === "openai") endpoint = "https://api.openai.com/v1/chat/completions";
    else if (provider.provider === "openrouter") endpoint = "https://openrouter.ai/api/v1/chat/completions";
    else endpoint = "https://api.openai.com/v1/chat/completions";
  }

  const primaryKey = provider.api_key.split(",")[0]?.trim();
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

  return res.ok && res.body ? res : null;
}
