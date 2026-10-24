/**
 * Lightweight prompt sanitizer.
 * Strips zero-width watermark characters from inbound prompts.
 * Strips accessibility UI chrome tokens and repeated lines/blocks from inbound prompts (90%+ token savings).
 * Strips markdown code fences and conversational preambles from outbound code responses.
 */

const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF\u2060]/g;

const UI_CHROME_NOISE = new Set([
  "system", "ime", "minimize", "maximize", "restore", "close", "application",
  "context help", "vertical", "horizontal", "line up", "line down",
  "page up", "page down", "column left", "column right", "position",
  "page left", "page right", "non client input sink window", "system menu bar",
  "system title bar"
]);

/** Deduplicate repeating chunks/blocks (e.g. repeated question + options) */
function deduplicateBlocks(lines: string[]): string[] {
  if (lines.length <= 1) return lines;
  const n = lines.length;

  // 1. Exact repeating block division (e.g. 5 lines repeated twice or 3 times)
  for (let blockLen = 1; blockLen <= Math.floor(n / 2); blockLen++) {
    if (n % blockLen === 0) {
      const block = lines.slice(0, blockLen);
      let repeats = true;
      for (let i = blockLen; i < n; i += blockLen) {
        for (let j = 0; j < blockLen; j++) {
          if (lines[i + j] !== block[j]) {
            repeats = false;
            break;
          }
        }
        if (!repeats) break;
      }
      if (repeats) {
        return block;
      }
    }
  }

  // 2. Check if second half mirrors first half
  const half = Math.floor(n / 2);
  let firstHalfMatchesSecond = true;
  for (let i = 0; i < half; i++) {
    if (lines[i] !== lines[half + i]) {
      firstHalfMatchesSecond = false;
      break;
    }
  }
  if (firstHalfMatchesSecond) {
    return lines.slice(0, half);
  }

  // 3. Fallback: line-by-line unique preservation
  const seen = new Set<string>();
  const res: string[] = [];
  for (const l of lines) {
    if (!seen.has(l)) {
      seen.add(l);
      res.push(l);
    }
  }
  return res;
}

/** Strip zero-width chars and UI accessibility noise from user prompt (inbound) */
export function sanitizePrompt(prompt: string): string {
  if (!prompt) return "";
  const text = prompt.replace(ZERO_WIDTH_CHARS, "").trim();

  // Strip UI automation chrome junk and window headers
  const lines = text.split(/\r?\n/).map((l) => l.trim());
  const cleaned: string[] = [];

  for (const line of lines) {
    if (!line) continue;
    const lower = line.toLowerCase();
    // Filter window chrome titles like '*... - Notepad'
    if (/ - (notepad|google chrome|microsoft edge|brave|visual studio code)$/i.test(lower)) {
      continue;
    }
    // Filter accessibility noise
    if (UI_CHROME_NOISE.has(lower)) {
      continue;
    }
    // Filter cryptic XAML automation tokens
    if (/^AQ\.[A-Za-z0-9_-]+[.,]?$/.test(line)) {
      continue;
    }
    // Deduplicate consecutive identical lines
    if (cleaned.length > 0 && cleaned[cleaned.length - 1] === line) {
      continue;
    }
    cleaned.push(line);
  }

  const deduplicated = deduplicateBlocks(cleaned);
  return deduplicated.join("\n").trim();
}

/** Strip markdown fences + conversational preambles from AI code output (outbound) */
export function sanitizeCodeResponse(text: string): string {
  if (!text) return "";
  // Remove leading ``` fences (```java, ```python, etc.) and trailing ```
  let cleaned = text.replace(/^```[\w]*\n?/gm, "").replace(/```\s*$/gm, "");
  // Remove conversational intros like "Here is the code:", "Sure! Here's..."
  cleaned = cleaned.replace(
    /^(sure[,!]?\s*|here(?:'s| is)\s+(?:the\s+)?(?:code|solution|implementation)[:\s]*|of course[,!]?\s*|certainly[,!]?\s*)/gi,
    ""
  );
  // Strip zero-width chars from response too
  cleaned = cleaned.replace(ZERO_WIDTH_CHARS, "");
  return cleaned.trim();
}
