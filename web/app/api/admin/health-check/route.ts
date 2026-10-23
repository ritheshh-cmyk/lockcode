import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { testProviderConnection, invalidateProvidersCache, AIProviderRecord } from "@/lib/brain";
import { broadcastEvent, createEventId } from "@/lib/events";

export const runtime = "nodejs";
export const maxDuration = 60;

/**
 * Automated Live Health Watcher & Circuit Breaker Auditor
 * Concurrently pings all configured providers, measures real-world response times,
 * trips backoff timers on failure, and updates Supabase telemetry in real time.
 */
export async function GET(req: NextRequest) {
  const token = req.headers.get("x-admin-token") || req.nextUrl.searchParams.get("token");
  const expectedToken = process.env.ADMIN_TOKEN || "lockapp-admin-token-2026";
  const appSecret = req.headers.get("x-app-secret");
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";

  if (token !== expectedToken && appSecret !== expectedSecret) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { data: providers, error } = await supabaseAdmin
      .from("ai_providers")
      .select("*")
      .order("priority", { ascending: true });

    if (error || !providers || providers.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No providers configured to audit",
        results: [],
        timestamp: new Date().toISOString(),
      });
    }

    // Ping all providers in parallel
    const auditPromises = providers.map(async (p: AIProviderRecord) => {
      const pingRes = await testProviderConnection(p);
      const isHealthy = pingRes.success;

      // Update provider in Supabase
      const updateData: Record<string, unknown> = {
        last_latency_ms: pingRes.latency_ms,
        last_error: isHealthy ? null : (pingRes.message || "Health ping failed").slice(0, 500),
      };

      if (!isHealthy) {
        // Auto-trip circuit breaker for 45s on health check failure
        updateData.rate_limited_until = new Date(Date.now() + 45_000).toISOString();
      } else if (p.rate_limited_until && new Date(p.rate_limited_until) <= new Date()) {
        // Clear expired rate limit
        updateData.rate_limited_until = null;
      }

      await supabaseAdmin
        .from("ai_providers")
        .update(updateData)
        .eq("id", p.id);

      // Broadcast health check event to Live Radar
      broadcastEvent({
        id: createEventId(),
        type: isHealthy ? "provider_change" : "error",
        timestamp: new Date().toISOString(),
        provider: p.provider,
        model: p.model,
        latency_ms: pingRes.latency_ms,
        success: isHealthy,
        message: isHealthy ? `Health Audit OK (${pingRes.latency_ms}ms)` : `Health Audit Failed: ${pingRes.message}`,
      });

      return {
        id: p.id,
        label: p.label,
        provider: p.provider,
        model: p.model,
        healthy: isHealthy,
        latency_ms: pingRes.latency_ms,
        error: isHealthy ? null : pingRes.message,
        preview: pingRes.responsePreview,
      };
    });

    const results = await Promise.all(auditPromises);
    invalidateProvidersCache();

    return NextResponse.json({
      success: true,
      audited_count: results.length,
      healthy_count: results.filter((r) => r.healthy).length,
      results,
      timestamp: new Date().toISOString(),
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
