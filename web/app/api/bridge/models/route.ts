import { NextRequest, NextResponse } from "next/server";
import { getActiveProviders } from "@/lib/brain";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  try {
    const activeProviders = await getActiveProviders();
    const dynamicModels = activeProviders.map((p) => ({
      id: p.model,
      provider_id: p.id,
      name: p.label,
      provider: p.provider,
      priority: p.priority,
      weight: p.weight ?? 50,
      preferred_for: p.preferred_for ?? "any",
      last_latency_ms: p.last_latency_ms,
      is_active: p.is_active,
    }));

    return NextResponse.json({
      success: true,
      count: dynamicModels.length,
      active_default: dynamicModels[0]?.id || "gemini-2.5-flash",
      models: dynamicModels,
      timestamp: new Date().toISOString(),
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
