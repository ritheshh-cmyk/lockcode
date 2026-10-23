/**
 * Lightweight prompt sanitizer.
 * Strips zero-width watermark characters from inbound prompts.
 * Strips markdown code fences and conversational preambles from outbound code responses.
 */

const ZERO_WIDTH_CHARS = /[\u200B\u200C\u200D\uFEFF\u2060]/g;

/** Strip zero-width chars from user prompt (inbound) */
export function sanitizePrompt(prompt: string): string {
  if (!prompt) return "";
  return prompt.replace(ZERO_WIDTH_CHARS, "").trim();
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
