import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function GET(req: NextRequest) {
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
      service: "titan-edge-gateway",
      region: process.env.VERCEL_REGION || "local",
      environment: process.env.NODE_ENV || "production",
      capabilities: {
        bridge_generate: true,
        bridge_mcq: true,
        bridge_format: true,
        bridge_models: true,
        bridge_stream: true,
      },
      providers: {
        gemini: {
          configured: envKeys.length > 0,
          key_pool_size: envKeys.length,
          default_model: "gemini-2.5-flash",
        },
        groq: {
          configured: hasGroq,
          fallback_model: "llama-3.3-70b-versatile",
        },
        supabase_pool: {
          configured: hasSupabase,
        },
      },
      security: {
        secret_enforced: hasSecret,
        header_required: "x-app-secret",
      },
      timestamp: new Date().toISOString(),
    },
    {
      headers: { "Cache-Control": "no-store" },
    }
  );
}
