export interface RequestLogEntry {
  id: string;
  reg_key: string;
  mode: string;
  prompt: string;
  response: string | null;
  provider: string | null;
  model: string | null;
  tokens_prompt: number;
  tokens_completion: number;
  tokens_total: number;
  latency_ms: number;
  status: string;
  created_at: string;
}

export interface UserHistorySummary {
  reg_key: string;
  total_tokens: number;
  total_prompt_tokens: number;
  total_completion_tokens: number;
  requests_stored: number;
  requests: RequestLogEntry[];
}

export function estimateTokens(text: string): number {
  if (!text) return 0;
  return Math.max(1, Math.ceil(text.length / 4));
}

function getSupabaseHeaders(): { url: string; headers: Record<string, string> } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return null;

  return {
    url,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
    },
  };
}

/**
 * Log a generation event and automatically enforce maximum 10 entries per user.
 * Older entries are pruned immediately.
 */
export async function logRequestHistory(params: {
  reg_key?: string;
  mode?: string;
  prompt: string;
  response?: string;
  provider?: string;
  model?: string;
  latency_ms?: number;
  status?: "success" | "failed";
  promptTokens?: number;
  completionTokens?: number;
}): Promise<void> {
  const config = getSupabaseHeaders();
  if (!config) return;

  const regKey = (params.reg_key || "anonymous").trim();
  const prompt = (params.prompt || "").trim();
  const response = (params.response || "").trim();
  const mode = (params.mode || "code").toLowerCase();
  const provider = params.provider || "gemini";
  const model = params.model || "unknown";
  const latencyMs = params.latency_ms || 0;
  const status = params.status || "success";

  const pTokens = params.promptTokens ?? estimateTokens(prompt);
  const cTokens = params.completionTokens ?? estimateTokens(response);
  const totalTokens = pTokens + cTokens;

  try {
    // 1. Insert the new log entry
    const insertRes = await fetch(`${config.url}/rest/v1/request_history`, {
      method: "POST",
      headers: config.headers,
      body: JSON.stringify({
        reg_key: regKey,
        mode,
        prompt: prompt.slice(0, 15000),
        response: response.slice(0, 30000),
        provider,
        model,
        tokens_prompt: pTokens,
        tokens_completion: cTokens,
        tokens_total: totalTokens,
        latency_ms: latencyMs,
        status,
      }),
      cache: "no-store",
    });

    if (!insertRes.ok) {
      // Table may not exist yet or temporary DB issue
      return;
    }

    // 2. Fetch existing records to enforce rotation (keep strictly top 10)
    const selectRes = await fetch(
      `${config.url}/rest/v1/request_history?reg_key=eq.${encodeURIComponent(
        regKey
      )}&select=id&order=created_at.desc`,
      {
        headers: config.headers,
        cache: "no-store",
      }
    );

    if (selectRes.ok) {
      const rows: Array<{ id: string }> = await selectRes.json();
      if (rows && rows.length > 10) {
        const excessIds = rows.slice(10).map((r) => `"${r.id}"`);
        await fetch(
          `${config.url}/rest/v1/request_history?id=in.(${excessIds.join(",")})`,
          {
            method: "DELETE",
            headers: config.headers,
            cache: "no-store",
          }
        );
      }
    }
  } catch (err) {
    console.error("Non-blocking request_history error:", err);
  }
}

/**
 * Retrieve the latest 10 requests and total token consumption for a user.
 */
export async function getUserHistory(regKey: string): Promise<UserHistorySummary> {
  const key = (regKey || "").trim();
  if (!key) {
    return {
      reg_key: "",
      total_tokens: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      requests_stored: 0,
      requests: [],
    };
  }

  const config = getSupabaseHeaders();
  if (!config) {
    return {
      reg_key: key,
      total_tokens: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      requests_stored: 0,
      requests: [],
    };
  }

  try {
    const res = await fetch(
      `${config.url}/rest/v1/request_history?reg_key=eq.${encodeURIComponent(
        key
      )}&select=*&order=created_at.desc&limit=10`,
      {
        headers: config.headers,
        cache: "no-store",
      }
    );

    if (!res.ok) {
      return {
        reg_key: key,
        total_tokens: 0,
        total_prompt_tokens: 0,
        total_completion_tokens: 0,
        requests_stored: 0,
        requests: [],
      };
    }

    const requests: RequestLogEntry[] = await res.json();
    let totalPrompt = 0;
    let totalCompletion = 0;
    let totalTokens = 0;

    for (const r of requests) {
      totalPrompt += r.tokens_prompt || 0;
      totalCompletion += r.tokens_completion || 0;
      totalTokens += r.tokens_total || 0;
    }

    return {
      reg_key: key,
      total_tokens: totalTokens,
      total_prompt_tokens: totalPrompt,
      total_completion_tokens: totalCompletion,
      requests_stored: requests.length,
      requests,
    };
  } catch (err) {
    console.error("Error fetching user history:", err);
    return {
      reg_key: key,
      total_tokens: 0,
      total_prompt_tokens: 0,
      total_completion_tokens: 0,
      requests_stored: 0,
      requests: [],
    };
  }
}

/**
 * Retrieve recent system-wide logs for admin overview.
 */
export async function getRecentSystemHistory(limit: number = 50): Promise<RequestLogEntry[]> {
  const config = getSupabaseHeaders();
  if (!config) return [];

  try {
    const res = await fetch(
      `${config.url}/rest/v1/request_history?select=*&order=created_at.desc&limit=${limit}`,
      {
        headers: config.headers,
        cache: "no-store",
      }
    );

    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
