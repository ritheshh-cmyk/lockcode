import { NextRequest, NextResponse } from "next/server";
import { executeBrainQuery, getActiveProviders } from "@/lib/brain";

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
  // Backward compatibility with raw Gemini JSON
  contents?: Array<{ role?: string; parts?: Array<{ text?: string }> }>;
  systemInstruction?: { parts?: Array<{ text?: string }> };
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
  return instruction.parts.map((p) => p.text || "").join("\n").trim();
}

/**
 * Diagnostic & Health Check GET Handler
 */
export async function GET(req: NextRequest) {
  const activeProviders = await getActiveProviders();
  const hasSecret = Boolean(process.env.APP_SECRET);

  return NextResponse.json({
    status: "healthy",
    service: "titan-ai-brain",
    version: "3.0.0",
    runtime: "edge",
    configured: {
      app_secret: hasSecret,
      active_providers_count: activeProviders.length,
      providers: activeProviders.map((p) => ({
        provider: p.provider,
        label: p.label,
        model: p.model,
        priority: p.priority,
        last_latency_ms: p.last_latency_ms,
      })),
    },
    supported_modes: ["code", "mcq", "explain", "format", "raw"],
    endpoints: [
      "/api/bridge/generate",
      "/api/bridge/mcq",
      "/api/bridge/format",
      "/api/bridge/health",
      "/api/admin/providers",
    ],
    timestamp: new Date().toISOString(),
  });
}

/**
 * Universal AI Completion Bridge POST Handler
 * Connects TITAN desktop client to the centralized multi-provider Brain.
 */
export async function POST(req: NextRequest) {
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
  const language = body.language || "Java";
  const regKey = (body.regKey || body.reg_key || req.headers.get("x-reg-key") || "anonymous").trim();

  // ── 3. Execute Query Through Centralized AI Brain ──
  const brainResult = await executeBrainQuery({
    prompt: userPrompt,
    systemPrompt,
    mode,
    language,
    regKey,
  });

  if (!brainResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: brainResult.error || "Execution failed across all AI providers in the Brain cascade",
        failoverHistory: brainResult.failoverHistory,
        latency_ms: brainResult.latency_ms,
      },
      { status: 502 }
    );
  }

  // ── 4. Deliver Exact Standardized TITAN Contract ──
  return NextResponse.json(
    {
      success: true,
      text: brainResult.text,
      provider: brainResult.provider,
      model: brainResult.model,
      mode,
      latency_ms: brainResult.latency_ms,
      tokens: brainResult.tokens,
      candidates: brainResult.candidates,
      choices: brainResult.choices,
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
