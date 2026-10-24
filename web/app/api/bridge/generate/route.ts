import { NextRequest, NextResponse } from "next/server";
import { executeBrainQuery, getActiveProviders } from "@/lib/brain";
import { supabaseAdmin } from "@/lib/supabase";

export const runtime = "nodejs";
export const maxDuration = 60;

interface UniversalRequestBody {
  regKey?: string;
  reg_key?: string;
  mode?: "code" | "mcq" | "explain" | "format" | "raw" | string;
  optionsCount?: number;
  options_count?: number;
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
 * Validate license per query (payload-bound killswitch).
 * Returns null if valid, error string if invalid.
 */
async function validateLicenseKey(regKey: string): Promise<string | null> {
  if (!regKey || regKey === "anonymous") return null; // no validation for anonymous
  try {
    const { data, error } = await supabaseAdmin
      .from("licenses")
      .select("is_active, expires_at")
      .eq("reg_key", regKey)
      .single();
    if (error || !data) return "License not found";
    if (!data.is_active) return "License revoked";
    if (data.expires_at && new Date(data.expires_at) < new Date()) return "License expired";
    return null; // valid
  } catch {
    return null; // fail open (don't block on DB error)
  }
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
    version: "3.1.0",
    runtime: "nodejs",
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
      "/api/admin/stream",
    ],
    timestamp: new Date().toISOString(),
  });
}

/**
 * Universal AI Completion Bridge POST Handler
 * Connects TITAN desktop client to the centralized multi-provider Brain.
 */
export async function POST(req: NextRequest) {
  // 1. Authenticate Request via Secret Header
  const appSecret = req.headers.get("x-app-secret");
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";

  if (!appSecret || appSecret !== expectedSecret) {
    return NextResponse.json(
      { success: false, error: "Unauthorized: Invalid or missing x-app-secret header" },
      { status: 401 }
    );
  }

  // 2. Parse and Validate Request Body
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
  let userPrompt = (body.prompt || (body as any).question || "").trim();
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

  // 3. Per-query license validation (payload-bound instant killswitch)
  const licenseError = await validateLicenseKey(regKey);
  if (licenseError) {
    return NextResponse.json(
      { success: false, error: `License validation failed: ${licenseError}`, killswitch: true },
      { status: 403 }
    );
  }

  const optionsCount = body.optionsCount || body.options_count || (userPrompt.toLowerCase().includes("option 5") || userPrompt.toLowerCase().includes("e)") ? 5 : 4);

  // 4. Execute Query Through Centralized AI Brain
  const brainResult = await executeBrainQuery({
    prompt: userPrompt,
    systemPrompt,
    mode,
    optionsCount,
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

  // 5. Deliver Exact Standardized TITAN Contract
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
