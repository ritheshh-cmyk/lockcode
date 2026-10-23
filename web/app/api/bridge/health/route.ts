import { NextRequest, NextResponse } from "next/server";
import { getActiveProviders, getRoutingConfig } from "@/lib/brain";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const startTime = Date.now();
  const activeProviders = await getActiveProviders();
  const routingConfig = await getRoutingConfig();

  const envKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const hasGroq = Boolean(process.env.GROQ_API_KEY);
  const hasSecret = Boolean(process.env.APP_SECRET);
  const hasSupabase = Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  );

  return NextResponse.json(
    {
      status: "operational",
      service: "titan-centralized-brain",
      version: "3.2.0",
      region: process.env.VERCEL_REGION || "local",
      environment: process.env.NODE_ENV || "production",
      brain: {
        active_providers_count: activeProviders.length,
        routing_strategy: routingConfig.strategy,
        preferred_code_provider: routingConfig.preferredCode,
        preferred_mcq_provider: routingConfig.preferredMcq,
        providers: activeProviders.map((p) => ({
          provider: p.provider,
          label: p.label,
          model: p.model,
          priority: p.priority,
          weight: p.weight ?? 50,
          preferred_for: p.preferred_for || "any",
          last_latency_ms: p.last_latency_ms,
          rate_limited: Boolean(p.rate_limited_until && new Date(p.rate_limited_until) > new Date()),
        })),
      },
      capabilities: {
        bridge_generate: true,
        bridge_mcq: true,
        bridge_format: true,
        bridge_models: true,
        bridge_stream: true,
        live_radar_sse: true,
      },
      fallback_env: {
        gemini_keys_count: envKeys.length,
        groq_configured: hasGroq,
        supabase_connected: hasSupabase,
      },
      security: {
        secret_enforced: hasSecret,
        header_required: "x-app-secret",
      },
      latency_ms: Date.now() - startTime,
      timestamp: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "no-store, max-age=0" },
    }
  );
}
