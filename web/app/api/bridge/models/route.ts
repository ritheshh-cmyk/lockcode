import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
  const models = [
    {
      id: "gemini-2.5-flash",
      name: "Google Gemini 2.5 Flash",
      provider: "gemini",
      tier: "primary",
      recommended_for: ["complex_code", "debugging", "general_mcq"],
      context_window: 1000000,
      supports_json_mode: true,
    },
    {
      id: "gemini-2.0-flash",
      name: "Google Gemini 2.0 Flash",
      provider: "gemini",
      tier: "fast",
      recommended_for: ["rapid_mcq", "syntax_formatting"],
      context_window: 1000000,
      supports_json_mode: true,
    },
    {
      id: "gemini-1.5-flash",
      name: "Google Gemini 1.5 Flash",
      provider: "gemini",
      tier: "legacy_backup",
      recommended_for: ["fallback"],
      context_window: 1000000,
      supports_json_mode: true,
    },
    {
      id: "llama-3.3-70b-versatile",
      name: "Meta Llama 3.3 70B (Groq LPU)",
      provider: "groq",
      tier: "emergency_fallback",
      recommended_for: ["zero_quota_failover", "ultra_low_latency"],
      speed_tokens_per_sec: 300,
      context_window: 128000,
      supports_json_mode: true,
    },
  ];

  return NextResponse.json({
    success: true,
    active_default: "gemini-2.5-flash",
    fallback_provider: "groq",
    models,
    count: models.length,
    timestamp: new Date().toISOString(),
  });
}
