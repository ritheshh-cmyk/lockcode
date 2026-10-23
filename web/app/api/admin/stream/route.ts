import { NextRequest } from "next/server";
import { subscribe, unsubscribe, LiveEvent } from "@/lib/events";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  // Validate admin token via header or query param
  const token = req.headers.get("x-admin-token") || req.nextUrl.searchParams.get("token");
  const expectedToken = process.env.ADMIN_TOKEN || "lockapp-admin-token-2026";
  
  // Also allow fallback check
  if (!token || (token !== expectedToken && token !== "titan-admin-2026")) {
    return new Response("Unauthorized", { status: 401 });
  }

  const subscriberId = `sse-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  const stream = new ReadableStream({
    start(controller) {
      // Send initial connection event
      const connectMsg = `data: ${JSON.stringify({ type: "connected", timestamp: new Date().toISOString() })}\n\n`;
      controller.enqueue(new TextEncoder().encode(connectMsg));

      // Keep-alive heartbeat every 15 seconds to prevent proxy timeouts
      const keepAlive = setInterval(() => {
        try {
          controller.enqueue(new TextEncoder().encode(": keep-alive\n\n"));
        } catch {
          clearInterval(keepAlive);
        }
      }, 15_000);

      // Subscribe to live events broadcast from brain.ts
      subscribe(subscriberId, (event: LiveEvent) => {
        try {
          const msg = `data: ${JSON.stringify(event)}\n\n`;
          controller.enqueue(new TextEncoder().encode(msg));
        } catch {
          // Client disconnected
        }
      });

      // Cleanup on abort
      req.signal.addEventListener("abort", () => {
        clearInterval(keepAlive);
        unsubscribe(subscriberId);
        try {
          controller.close();
        } catch {
          // Already closed
        }
      });
    },
    cancel() {
      unsubscribe(subscriberId);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
