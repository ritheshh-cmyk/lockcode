import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // Secret verification
  const appSecret = req.headers.get("x-app-secret");
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";
  if (!appSecret || appSecret !== expectedSecret) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: { question?: string; options?: string[]; prompt?: string; regKey?: string; reg_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const regKey = (body.regKey || body.reg_key || req.headers.get("x-reg-key") || "anonymous").trim();

  const questionText = (body.question || body.prompt || "").trim();
  if (!questionText) {
    return NextResponse.json({ success: false, error: "Question text is required" }, { status: 400 });
  }

  let formattedPrompt = questionText;
  if (body.options && Array.isArray(body.options) && body.options.length > 0) {
    formattedPrompt += "\n\nOptions:\n" + body.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join("\n");
  }

  const systemInstruction = 
    "You are an expert examination solver. You must determine the single correct option for the multiple-choice question. " +
    "Return your response in STRICT valid JSON format with keys: " +
    "\"option\" (string, e.g. \"A\", \"B\", \"C\", or \"D\"), " +
    "\"confidence\" (number between 0 and 100), " +
    "\"explanation\" (string, 1-2 concise sentences explaining why this option is correct). " +
    "Do not wrap in markdown fences or add commentary outside the JSON.";

  // Forward to internal bridge logic
  const baseUrl = req.nextUrl.origin;
  try {
    const bridgeRes = await fetch(`${baseUrl}/api/bridge/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-secret": expectedSecret,
      },
      body: JSON.stringify({
        regKey,
        mode: "mcq",
        prompt: formattedPrompt,
        systemPrompt: systemInstruction,
        generationConfig: {
          temperature: 0.0,
          responseMimeType: "application/json",
        },
      }),
    });

    const bridgeData = await bridgeRes.json();
    if (!bridgeRes.ok || !bridgeData.success) {
      return NextResponse.json({
        success: false,
        error: bridgeData.error || "MCQ resolution failed",
        latency_ms: Date.now() - startTime,
      }, { status: bridgeRes.status || 500 });
    }

    const rawText = (bridgeData.text || "").trim();
    let parsed: { option?: string; confidence?: number; explanation?: string } = {};

    try {
      // Clean possible fences if model returned them
      const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
      parsed = JSON.parse(cleanedJson);
    } catch {
      // Fallback regex extraction of option letter (A, B, C, D)
      const match = rawText.match(/\b([A-D])\b/i);
      parsed = {
        option: match ? match[1].toUpperCase() : "Unknown",
        confidence: 80,
        explanation: rawText.slice(0, 300),
      };
    }

    return NextResponse.json({
      success: true,
      option: (parsed.option || "").toUpperCase(),
      confidence: parsed.confidence ?? 90,
      explanation: parsed.explanation || "",
      provider: bridgeData.provider,
      latency_ms: Date.now() - startTime,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: msg, latency_ms: Date.now() - startTime }, { status: 500 });
  }
}
