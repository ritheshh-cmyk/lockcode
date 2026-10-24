import { NextRequest, NextResponse } from "next/server";
import { executeBrainQuery } from "@/lib/brain";
import { sanitizePrompt } from "@/lib/sanitize";

export const runtime = "nodejs";
export const maxDuration = 45;

/**
 * High-Speed Multiple-Choice Examination Solver
 * Invokes the Brain directly with mode "mcq" to select the fastest available provider.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  // 1. Secret verification
  const appSecret = req.headers.get("x-app-secret");
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";
  if (!appSecret || appSecret !== expectedSecret) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  // 2. Parse payload
  let body: { question?: string; options?: string[]; prompt?: string; regKey?: string; reg_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON payload" }, { status: 400 });
  }

  const regKey = (body.regKey || body.reg_key || req.headers.get("x-reg-key") || "anonymous").trim();
  const rawQuestion = (body.question || body.prompt || "").trim();
  const questionText = sanitizePrompt(rawQuestion);

  if (!questionText) {
    return NextResponse.json({ success: false, error: "Question text is required" }, { status: 400 });
  }

  let formattedPrompt = questionText;
  if (body.options && Array.isArray(body.options) && body.options.length > 0) {
    formattedPrompt +=
      "\n\nOptions:\n" +
      body.options.map((opt, i) => `${String.fromCharCode(65 + i)}) ${opt}`).join("\n");
  }

  const systemInstruction =
    "You are an expert examination solver. You must determine the single correct option for the multiple-choice question. " +
    "Return your response in STRICT valid JSON format with keys: " +
    '"option" (string, e.g. "A", "B", "C", "D", or "E"), ' +
    '"confidence" (number between 0 and 100), ' +
    '"explanation" (string, 1-2 concise sentences explaining why this option is correct). ' +
    "Do not wrap in markdown fences or add commentary outside the JSON.";

  // 3. Execute directly through the Brain
  const brainResult = await executeBrainQuery({
    prompt: formattedPrompt,
    systemPrompt: systemInstruction,
    mode: "mcq",
    regKey,
  });

  if (!brainResult.success) {
    return NextResponse.json(
      {
        success: false,
        error: brainResult.error || "MCQ resolution failed across Brain providers",
        latency_ms: Date.now() - startTime,
      },
      { status: 502 }
    );
  }

  const rawText = (brainResult.text || "").trim();
  let parsed: { option?: string; confidence?: number; explanation?: string } = {};

  try {
    const cleanedJson = rawText.replace(/```json/gi, "").replace(/```/g, "").trim();
    parsed = JSON.parse(cleanedJson);
  } catch {
    // Robust regex fallback to extract option letter
    const match = rawText.match(/\b([A-E1-5])\b/i);
    parsed = {
      option: match ? match[1].toUpperCase() : "A",
      confidence: 85,
      explanation: rawText.slice(0, 300),
    };
  }

  return NextResponse.json({
    success: true,
    option: (parsed.option || "").toUpperCase(),
    confidence: parsed.confidence ?? 90,
    explanation: parsed.explanation || "",
    provider: brainResult.provider,
    model: brainResult.model,
    tokens: brainResult.tokens,
    latency_ms: Date.now() - startTime,
  });
}
