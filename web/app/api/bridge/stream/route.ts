import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Secret check
  const appSecret = req.headers.get("x-app-secret");
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";
  if (!appSecret || appSecret !== expectedSecret) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  let body: { prompt?: string; systemPrompt?: string; model?: string };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Invalid JSON", { status: 400 });
  }

  const userPrompt = (body.prompt || "").trim();
  if (!userPrompt) {
    return new NextResponse("Prompt is required", { status: 400 });
  }

  const groqApiKey = (process.env.GROQ_API_KEY || "").trim();
  const geminiKey = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "").split(",")[0]?.trim();

  // If Groq is available, use OpenAI-compatible streaming
  if (groqApiKey) {
    try {
      const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${groqApiKey}`,
        },
        body: JSON.stringify({
          model: "llama-3.3-70b-versatile",
          messages: [
            ...(body.systemPrompt ? [{ role: "system", content: body.systemPrompt }] : []),
            { role: "user", content: userPrompt },
          ],
          stream: true,
          temperature: 0.1,
        }),
      });

      if (!groqRes.ok || !groqRes.body) {
        return new NextResponse(`Groq Stream Error: ${groqRes.statusText}`, { status: groqRes.status });
      }

      return new NextResponse(groqRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return new NextResponse(`Streaming error: ${msg}`, { status: 500 });
    }
  }

  // If Gemini streaming is used
  if (geminiKey) {
    try {
      const model = body.model || "gemini-2.0-flash";
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
        model
      )}:streamGenerateContent?alt=sse&key=${encodeURIComponent(geminiKey)}`;

      const geminiRes = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          ...(body.systemPrompt ? { systemInstruction: { parts: [{ text: body.systemPrompt }] } } : {}),
        }),
      });

      if (!geminiRes.ok || !geminiRes.body) {
        return new NextResponse(`Gemini Stream Error: ${geminiRes.statusText}`, { status: geminiRes.status });
      }

      return new NextResponse(geminiRes.body, {
        headers: {
          "Content-Type": "text/event-stream",
          "Cache-Control": "no-cache, no-transform",
          Connection: "keep-alive",
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return new NextResponse(`Streaming error: ${msg}`, { status: 500 });
    }
  }

  return new NextResponse("No streaming provider available", { status: 503 });
}
