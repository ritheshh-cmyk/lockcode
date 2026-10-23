import { NextRequest, NextResponse } from "next/server";

export const runtime = "edge";

export async function POST(req: NextRequest) {
  let body: { code?: string; language?: string; stripComments?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  let code = body.code ?? "";
  if (!code.trim()) {
    return NextResponse.json({ success: false, error: "Missing code input" }, { status: 400 });
  }

  // 1. Strip markdown code fences (```java ... ```)
  code = code.replace(/^```[a-zA-Z0-9_-]*\s*\n?/m, "");
  code = code.replace(/\n?```\s*$/m, "");

  // 2. Normalize newlines to standard LF (\n)
  code = code.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  // 3. Trim trailing whitespace from each line
  const lines = code.split("\n").map(l => l.trimEnd());
  code = lines.join("\n").trim();

  // 4. Optional comment removal if requested
  if (body.stripComments) {
    // Remove multi-line /* ... */
    code = code.replace(/\/\*[\s\S]*?\*\//g, "");
    // Remove single-line // ...
    code = code.replace(/\/\/.*$/gm, "");
    code = code.split("\n").filter(l => l.trim().length > 0).join("\n").trim();
  }

  // 5. Basic bracket balance diagnostic
  let openCurly = 0;
  let openParen = 0;
  let openSquare = 0;
  for (const ch of code) {
    if (ch === "{") openCurly++;
    else if (ch === "}") openCurly--;
    else if (ch === "(") openParen++;
    else if (ch === ")") openParen--;
    else if (ch === "[") openSquare++;
    else if (ch === "]") openSquare--;
  }

  const balanced = openCurly === 0 && openParen === 0 && openSquare === 0;

  return NextResponse.json({
    success: true,
    code,
    language: body.language || "autodetect",
    diagnostics: {
      length: code.length,
      lines_count: code.split("\n").length,
      brackets_balanced: balanced,
      unclosed: {
        curly: openCurly,
        paren: openParen,
        square: openSquare,
      },
    },
  });
}
