"use server";

import { supabaseAdmin } from "@/lib/supabase";

// ── Auth ────────────────────────────────────────────────────

export async function verifyAdminPassword(password: string): Promise<boolean> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const candidateHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // 1️⃣ Primary: Supabase admin_config table
  try {
    const { data: row, error } = await supabaseAdmin
      .from("admin_config")
      .select("value")
      .eq("key", "admin_password_hash")
      .single();
    if (!error && row) return candidateHash === row.value;
  } catch { /* table may not exist yet */ }

  // 2️⃣ Fallback: env var hash
  if (process.env.ADMIN_PASSWORD_HASH) return candidateHash === process.env.ADMIN_PASSWORD_HASH;

  // 3️⃣ Last resort: plain text env var
  return password === process.env.ADMIN_PASSWORD;
}


// ── Types ───────────────────────────────────────────────────

export interface License {
  id: string;
  reg_key: string;
  machine_id: string | null;
  created_at: string;
  activated_at: string | null;
  expires_at: string;
  is_active: boolean;
  label: string | null;
  gemini_key: string | null;
  language: string | null;
  model: string | null;
}

export interface PoolKey {
  id: string;
  key: string;
  label: string | null;
  used: boolean;
  added_at: string;
  status: "active" | "rate_limited" | "invalid" | "error" | null;
  last_checked_at: string | null;
  error_message: string | null;
}

// ── Guards ──────────────────────────────────────────────────

function requireId(id: string, op: string): void {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error(`${op}: id must not be empty`);
  }
}

function getLicenseFilter(idOrKey: string, op: string = "license operation") {
  requireId(idOrKey, op);
  const trimmed = idOrKey.trim();
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(trimmed);
  return { column: isUuid ? "id" : "reg_key", value: trimmed };
}

// ── License CRUD ─────────────────────────────────────────────

export async function fetchAllLicenses(): Promise<License[]> {
  const { data, error } = await supabaseAdmin
    .from("licenses")
    .select("id, reg_key, label, gemini_key, language, model, expires_at, is_active, machine_id, activated_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as License[]) || [];
}

export interface CreateLicenseParams {
  custom_key?: string;
  reg_key?: string;
  regKey?: string;
  days?: number;
  trialDays?: number;
  hours?: number;
  trialHours?: number;
  label?: string;
  gemini_key?: string;
  geminiKey?: string;
  language?: string;
  model?: string;
}

export async function createLicense(
  regKeyOrParams: string | CreateLicenseParams,
  labelParam?: string,
  trialDaysParam: number = 1,
  trialHoursParam: number = 0,
  geminiKeyParam?: string,
  languageParam: string = "Java",
  modelParam: string = "all"
): Promise<{ success: boolean; data: License | null; error: string | null }> {
  try {
    let reg_key = "";
    let label = labelParam;
    let trialDays = trialDaysParam;
    let trialHours = trialHoursParam;
    let geminiKey = geminiKeyParam || "";
    let language = languageParam;
    let model = modelParam;

    if (typeof regKeyOrParams === "object" && regKeyOrParams !== null) {
      reg_key = (regKeyOrParams.custom_key || regKeyOrParams.reg_key || regKeyOrParams.regKey || "").trim();
      label = regKeyOrParams.label;
      trialDays = Number(regKeyOrParams.days ?? regKeyOrParams.trialDays ?? 1);
      trialHours = Number(regKeyOrParams.hours ?? regKeyOrParams.trialHours ?? 0);
      geminiKey = regKeyOrParams.gemini_key || regKeyOrParams.geminiKey || "";
      language = regKeyOrParams.language || "Java";
      model = regKeyOrParams.model || "all";
    } else if (typeof regKeyOrParams === "string") {
      reg_key = regKeyOrParams.trim();
    }

    if (!reg_key) {
      reg_key = Math.floor(10000000 + Math.random() * 90000000).toString();
    }

    if (!/^\d{8}$/.test(reg_key)) {
      return { success: false, data: null, error: "Key must be exactly 8 digits" };
    }

    const totalMs = trialDays * 24 * 60 * 60 * 1000 + trialHours * 60 * 60 * 1000;
    if (totalMs <= 0) {
      return { success: false, data: null, error: "Duration must be greater than 0" };
    }
    const expires_at = new Date(Date.now() + totalMs).toISOString();

    const cleanGeminiKey = typeof geminiKey === "string" && geminiKey.trim()
      ? geminiKey.split(",").map((k) => k.trim()).filter(Boolean).join(",")
      : null;

    const cleanLabel = typeof label === "string" ? label.trim() || null : null;

    const { data, error } = await supabaseAdmin
      .from("licenses")
      .insert({
        reg_key,
        label: cleanLabel,
        expires_at,
        gemini_key: cleanGeminiKey,
        language: (language || "Java").trim(),
        model: (model || "all").trim(),
      })
      .select("id, reg_key, label, gemini_key, language, model, expires_at, is_active, machine_id, activated_at, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        return { success: false, data: null, error: "Registration key already exists" };
      }
      return { success: false, data: null, error: error.message };
    }
    return { success: true, data: data as License, error: null };
  } catch (e: any) {
    return { success: false, data: null, error: e?.message ?? "Unexpected server error" };
  }
}

export async function revokeLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "revokeLicense");
  const { error } = await supabaseAdmin.from("licenses").update({ is_active: false }).eq(column, value);
  if (error) throw new Error(error.message);
}

/** Hard-terminate: set expires_at to now so the client is blocked on next check */
export async function terminateLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "terminateLicense");
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ expires_at: new Date().toISOString(), is_active: false })
    .eq(column, value);
  if (error) throw new Error(error.message);
}

export async function resetLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "resetLicense");
  const { error } = await supabaseAdmin.from("licenses").update({ machine_id: null, activated_at: null }).eq(column, value);
  if (error) throw new Error(error.message);
}

export async function deleteLicense(idOrKey: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "deleteLicense");
  const { error } = await supabaseAdmin.from("licenses").delete().eq(column, value);
  if (error) throw new Error(error.message);
}

export interface UpdateLicenseOptions {
  label?: string;
  gemini_key?: string;
  geminiKey?: string;
  language?: string;
  expires_at?: string;
  is_active?: boolean;
  addDays?: number;
  addHours?: number;
  deductDays?: number;
  deductHours?: number;
  model?: string;
}

export async function updateLicense(
  idOrKey: string,
  optionsOrLabel?: string | UpdateLicenseOptions,
  geminiKeyParam?: string,
  languageParam?: string,
  addDaysParam: number = 0,
  addHoursParam: number = 0,
  deductDaysParam: number = 0,
  deductHoursParam: number = 0,
  modelParam: string = "gemini"
): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "updateLicense");

  const { data: current, error: fetchErr } = await supabaseAdmin
    .from("licenses").select("expires_at").eq(column, value).single();
  if (fetchErr || !current) throw new Error("Failed to fetch license");

  let label: string | null | undefined = undefined;
  let geminiKey: string | null | undefined = undefined;
  let language: string | undefined = undefined;
  let model: string | undefined = undefined;
  let newExpiresAt: string = current.expires_at;

  if (typeof optionsOrLabel === "object" && optionsOrLabel !== null) {
    if (optionsOrLabel.expires_at) {
      newExpiresAt = optionsOrLabel.expires_at;
    }
    if (optionsOrLabel.label !== undefined) {
      label = optionsOrLabel.label ? optionsOrLabel.label.trim() : null;
    }
    if (optionsOrLabel.gemini_key !== undefined || optionsOrLabel.geminiKey !== undefined) {
      const rawKey = optionsOrLabel.gemini_key ?? optionsOrLabel.geminiKey ?? "";
      geminiKey = rawKey ? rawKey.split(",").map((k) => k.trim()).filter(Boolean).join(",") || null : null;
    }
    if (optionsOrLabel.language !== undefined) {
      language = optionsOrLabel.language || "Java";
    }
    if (optionsOrLabel.model !== undefined) {
      model = optionsOrLabel.model;
    }
    const addMs = ((optionsOrLabel.addDays || 0) * 24 * 60 * 60 + (optionsOrLabel.addHours || 0) * 60 * 60) * 1000;
    const deductMs = ((optionsOrLabel.deductDays || 0) * 24 * 60 * 60 + (optionsOrLabel.deductHours || 0) * 60 * 60) * 1000;
    if (addMs > 0) {
      const base = new Date(current.expires_at).getTime() > Date.now()
        ? new Date(current.expires_at).getTime() : Date.now();
      newExpiresAt = new Date(base + addMs).toISOString();
    } else if (deductMs > 0) {
      const current_ts = new Date(current.expires_at).getTime();
      const newTs = Math.max(Date.now(), current_ts - deductMs);
      newExpiresAt = new Date(newTs).toISOString();
    }
  } else {
    // Positional signature
    label = typeof optionsOrLabel === "string" ? optionsOrLabel.trim() || null : null;
    if (geminiKeyParam) {
      geminiKey = geminiKeyParam.split(",").map((k) => k.trim()).filter(Boolean).join(",") || null;
    }
    language = languageParam || "Java";
    model = modelParam || "gemini";
    const addMs = (addDaysParam * 24 * 60 * 60 + addHoursParam * 60 * 60) * 1000;
    const deductMs = (deductDaysParam * 24 * 60 * 60 + deductHoursParam * 60 * 60) * 1000;
    if (addMs > 0) {
      const base = new Date(current.expires_at).getTime() > Date.now()
        ? new Date(current.expires_at).getTime() : Date.now();
      newExpiresAt = new Date(base + addMs).toISOString();
    } else if (deductMs > 0) {
      const current_ts = new Date(current.expires_at).getTime();
      const newTs = Math.max(Date.now(), current_ts - deductMs);
      newExpiresAt = new Date(newTs).toISOString();
    }
  }

  const updatePayload: Record<string, any> = { expires_at: newExpiresAt };
  if (label !== undefined) updatePayload.label = label;
  if (geminiKey !== undefined) updatePayload.gemini_key = geminiKey;
  if (language !== undefined) updatePayload.language = language;
  if (model !== undefined) updatePayload.model = model;

  const { error } = await supabaseAdmin
    .from("licenses")
    .update(updatePayload)
    .eq(column, value);
  if (error) throw new Error(error.message);
}

/** Standalone language update — used by the inline dropdown in the table */
export async function updateLanguage(idOrKey: string, language: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "updateLanguage");
  const { error } = await supabaseAdmin
    .from("licenses").update({ language: language || "Java" }).eq(column, value);
  if (error) throw new Error(error.message);
}

/** Standalone model/allotted provider update — used by inline dropdown in the table */
export async function updateLicenseModel(idOrKey: string, model: string): Promise<void> {
  const { column, value } = getLicenseFilter(idOrKey, "updateLicenseModel");
  const { error } = await supabaseAdmin
    .from("licenses").update({ model: model || "all" }).eq(column, value);
  if (error) throw new Error(error.message);
  const { invalidateLicenseAllotmentCache } = await import("@/lib/brain");
  invalidateLicenseAllotmentCache();
}


// ── API Key Pool (Supabase-backed) ───────────────────────────

export async function fetchPoolKeys(): Promise<PoolKey[]> {
  const { data, error } = await supabaseAdmin
    .from("api_key_pool")
    .select("id, key, label, used, added_at, status, last_checked_at, error_message")
    .order("added_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as PoolKey[]) || [];
}

/**
 * Fetch up to `limit` free (unused) keys from the pool, preferring active ones.
 * Priority: active > unchecked (null) > rate_limited. Never returns invalid/error.
 *
 * NOTE: Supabase .not("status", "eq", "invalid") filters OUT rows where status IS NULL
 * in some PostgREST versions, so we filter in JS instead.
 */
export async function fetchFreePoolKeys(limit: number = 3): Promise<PoolKey[]> {
  // Fetch all unused keys — we'll filter invalid/error in JS to preserve null-status rows
  const { data, error } = await supabaseAdmin
    .from("api_key_pool")
    .select("id, key, label, used, added_at, status, last_checked_at, error_message")
    .eq("used", false)
    .order("added_at", { ascending: true }); // FIFO drain

  if (error) throw new Error(error.message);
  const rows = (data as PoolKey[]) || [];

  // Filter out definitively bad keys; keep active, null (unchecked), rate_limited
  const eligible = rows.filter(k => k.status !== "invalid" && k.status !== "error");

  // Sort: active first, then null (unchecked), then rate_limited
  const ranked = eligible.sort((a, b) => {
    const rank = (s: string | null) => s === "active" ? 0 : s === null ? 1 : 2;
    return rank(a.status) - rank(b.status);
  });

  return ranked.slice(0, limit);
}

/**
 * Mark a set of pool key IDs as used/assigned to a license.
 */
export async function markPoolKeysUsed(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const { error } = await supabaseAdmin
    .from("api_key_pool")
    .update({ used: true })
    .in("id", ids);
  if (error) throw new Error(error.message);
}


export async function updatePoolKeyStatus(
  id: string,
  status: string,
  error_message?: string | null
): Promise<void> {
  requireId(id, "updatePoolKeyStatus");
  const { error } = await supabaseAdmin
    .from("api_key_pool")
    .update({ status, error_message, last_checked_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updatePoolKeyLabel(id: string, label: string): Promise<void> {
  requireId(id, "updatePoolKeyLabel");
  const cleanLabel = typeof label === "string" ? label.trim() || null : null;
  const { error } = await supabaseAdmin
    .from("api_key_pool")
    .update({ label: cleanLabel })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function testSinglePoolKey(id: string): Promise<{ success: boolean; status: string; message: string }> {
  requireId(id, "testSinglePoolKey");
  const { data, error } = await supabaseAdmin
    .from("api_key_pool")
    .select("key")
    .eq("id", id)
    .single();

  if (error || !data) throw new Error(error ? error.message : "Key not found");

  const apiKey = data.key;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${apiKey}`;

  let status = "error";
  let message = "Unknown error";

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: "Hi" }] }]
      }),
      signal: controller.signal
    });
    clearTimeout(timeoutId);
    
    const bodyText = await res.text();

    if (res.ok) {
      status = "active";
      message = "";
    } else {
      let parsedErr = "";
      try { parsedErr = JSON.parse(bodyText).error?.message; } catch {}
      
      if (res.status === 429) {
        status = "rate_limited";
        message = parsedErr || "Quota exceeded (429)";
      } else if (res.status === 400) {
        status = "invalid";
        message = parsedErr || "Invalid key format (400)";
      } else if (res.status === 403) {
        status = "invalid";
        message = parsedErr || "Forbidden or disabled (403)";
      } else if (res.status === 404) {
        status = "invalid";
        message = parsedErr || "Not found (404)";
      } else {
        status = "error";
        message = parsedErr || `HTTP ${res.status}`;
      }
    }
  } catch (err: any) {
    status = "error";
    message = err.name === "AbortError" ? "Timeout" : (err.message || String(err));
  }

  // Store null (not empty string) for active keys — empty string means "no error" ambiguously
  await updatePoolKeyStatus(id, status, status === "active" ? null : message || null);

  return { success: status === "active", status, message };
}

/** Test specific pool keys in small batches to avoid burst rate-limiting and Vercel timeouts */
export async function testPoolKeys(ids: string[]): Promise<{ id: string; status: string; error?: string }[]> {
  if (!ids.length) return [];
  const { data: keys, error } = await supabaseAdmin.from("api_key_pool").select("id, key").in("id", ids);
  if (error || !keys) throw new Error(error ? error.message : "Failed to fetch keys");

  const results: { id: string; status: string; error?: string }[] = [];

  // Process in chunks of 5 to avoid Vercel serverless timeouts (15s) and Google burst limits
  const chunkSize = 5;
  for (let i = 0; i < keys.length; i += chunkSize) {
    const chunk = keys.slice(i, i + chunkSize);
    
    await Promise.all(chunk.map(async (k) => {
      let status = "active";
      let errMsg: string | null = null;
      try {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-lite:generateContent?key=${k.key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: "1" }] }],
              generationConfig: { maxOutputTokens: 1 },
            }),
            signal: AbortSignal.timeout(6000),
          }
        );
        
        const bodyText = await res.text();
        let parsedErr = "";
        try { parsedErr = JSON.parse(bodyText).error?.message; } catch {}
        
        if (res.status === 429) { 
          status = "rate_limited"; 
          errMsg = parsedErr || "Quota exceeded (429)"; 
        }
        else if (res.status === 400 || res.status === 403 || res.status === 404) { 
          status = "invalid"; 
          errMsg = parsedErr || `HTTP ${res.status}`;
        }
        else if (!res.ok) { 
          status = "error"; 
          errMsg = parsedErr || `HTTP ${res.status}`; 
        }
      } catch (e) {
        status = "error";
        errMsg = e instanceof Error ? e.message : "Request failed";
      }
      // persist to DB — null for active (no error)
      await supabaseAdmin.from("api_key_pool").update({
        status,
        last_checked_at: new Date().toISOString(),
        error_message: status === "active" ? null : errMsg,
      }).eq("id", k.id);
      
      results.push({ id: k.id, status, error: errMsg ?? undefined });
    }));
    
    // Add a 300ms delay between chunks
    if (i + chunkSize < keys.length) {
      await new Promise(resolve => setTimeout(resolve, 300));
    }
  }

  return results;
}

export async function testAllPoolKeys(): Promise<{ id: string; status: string; error?: string }[]> {
  const keys = await fetchPoolKeys();
  return testPoolKeys(keys.map(k => k.id));
}

export async function addPoolKeys(keys: string[], label?: string): Promise<number> {
  if (!keys.length) return 0;
  const rows = keys.map((k) => ({ key: k, label: label || null, used: false }));
  // upsert — ignore duplicates
  const { data, error } = await supabaseAdmin
    .from("api_key_pool")
    .upsert(rows, { onConflict: "key", ignoreDuplicates: true })
    .select("id");
  if (error) throw new Error(error.message);
  return data?.length ?? 0;
}

export async function setPoolKeyUsed(id: string, used: boolean): Promise<void> {
  requireId(id, "setPoolKeyUsed");
  const { error } = await supabaseAdmin.from("api_key_pool").update({ used }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function removePoolKey(id: string): Promise<void> {
  requireId(id, "removePoolKey");
  const { error } = await supabaseAdmin.from("api_key_pool").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function clearPoolKeys(): Promise<void> {
  const { error } = await supabaseAdmin.from("api_key_pool").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (error) throw new Error(error.message);
}

// ── AI Bridge Diagnostic Actions ────────────────────────────

export async function checkBridgeStatus(): Promise<{
  online: boolean;
  edgeRegion: string;
  geminiCount: number;
  groqConfigured: boolean;
  latencyMs: number;
  error?: string;
}> {
  const start = Date.now();
  try {
    const envKeys = (process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "")
      .split(",")
      .map((k) => k.trim())
      .filter(Boolean);
    const hasGroq = Boolean(process.env.GROQ_API_KEY);

    return {
      online: true,
      edgeRegion: process.env.VERCEL_REGION || "local",
      geminiCount: envKeys.length,
      groqConfigured: hasGroq,
      latencyMs: Date.now() - start,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      online: false,
      edgeRegion: "unknown",
      geminiCount: 0,
      groqConfigured: false,
      latencyMs: Date.now() - start,
      error: msg,
    };
  }
}

export async function testBridgePrompt(
  prompt: string,
  mode: string = "code"
): Promise<{ success: boolean; text?: string; provider?: string; latencyMs: number; error?: string }> {
  const start = Date.now();
  const secret = process.env.APP_SECRET || "lockapp-secret-2026";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000");

  try {
    const res = await fetch(`${appUrl}/api/bridge/generate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-app-secret": secret,
      },
      body: JSON.stringify({ prompt, mode }),
      cache: "no-store",
    });

    const data = await res.json();
    return {
      success: Boolean(data.success),
      text: data.text,
      provider: data.provider,
      latencyMs: Date.now() - start,
      error: data.error,
    };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      success: false,
      latencyMs: Date.now() - start,
      error: msg,
    };
  }
}

export interface BrainProviderItem {
  id: string;
  provider: string;
  label: string;
  api_key: string;
  model: string;
  base_url: string | null;
  priority: number;
  weight?: number;
  preferred_for?: string | null;
  is_active: boolean;
  rate_limited_until: string | null;
  last_error: string | null;
  last_latency_ms: number;
  total_calls: number;
  successful_calls: number;
  created_at: string;
}

export async function getBrainProviders(): Promise<BrainProviderItem[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from("ai_providers")
      .select("*")
      .order("priority", { ascending: true })
      .order("created_at", { ascending: true });

    if (error || !data) return [];
    return data as BrainProviderItem[];
  } catch {
    return [];
  }
}

export async function saveBrainProvider(provider: {
  id?: string;
  provider: string;
  label: string;
  api_key: string;
  model: string;
  base_url?: string;
  priority?: number;
  weight?: number;
  preferred_for?: string | null;
  is_active?: boolean;
}): Promise<{ success: boolean; error?: string; provider?: BrainProviderItem }> {
  try {
    const cleanProvider = (provider.provider || "groq").toLowerCase().trim();
    const cleanLabel = (provider.label || `${cleanProvider} Provider`).trim();
    const cleanApiKey = (provider.api_key || "").trim();
    const cleanModel = (provider.model || "").trim();
    const cleanBaseUrl = provider.base_url ? provider.base_url.trim() || null : null;

    if (provider.id) {
      const { data, error } = await supabaseAdmin
        .from("ai_providers")
        .update({
          provider: cleanProvider,
          label: cleanLabel,
          api_key: cleanApiKey,
          model: cleanModel,
          base_url: cleanBaseUrl,
          priority: provider.priority ?? 1,
          weight: Math.max(1, Math.min(100, provider.weight ?? 50)),
          preferred_for: provider.preferred_for || null,
          is_active: provider.is_active ?? true,
        })
        .eq("id", provider.id)
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, provider: data as BrainProviderItem };
    } else {
      const { data, error } = await supabaseAdmin
        .from("ai_providers")
        .insert({
          provider: cleanProvider,
          label: cleanLabel,
          api_key: cleanApiKey,
          model: cleanModel,
          base_url: cleanBaseUrl,
          priority: provider.priority ?? 1,
          weight: Math.max(1, Math.min(100, provider.weight ?? 50)),
          preferred_for: provider.preferred_for || null,
          is_active: provider.is_active ?? true,
        })
        .select()
        .single();

      if (error) return { success: false, error: error.message };
      return { success: true, provider: data as BrainProviderItem };
    }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function toggleBrainProvider(id: string, is_active: boolean): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("ai_providers")
      .update({ is_active })
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function deleteBrainProvider(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from("ai_providers")
      .delete()
      .eq("id", id);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return { success: false, error: msg };
  }
}

export async function pingTestProvider(provider: {
  provider: string;
  api_key: string;
  model: string;
  base_url?: string;
}): Promise<{ success: boolean; latency_ms: number; message?: string }> {
  const { testProviderConnection } = await import("@/lib/brain");
  return testProviderConnection(provider);
}

// ── Bulk License Generation ──────────────────────────────────────────────────

export async function createBulkLicenses(
  count: number,
  trialDays: number,
  label: string,
  model: string = "all"
): Promise<{ created: number; keys: string[]; error?: string }> {
  try {
    const keys: string[] = [];
    const rows: Array<{ reg_key: string; label: string | null; expires_at: string; model: string }> = [];
    const expires_at = new Date(Date.now() + trialDays * 24 * 60 * 60 * 1000).toISOString();

    const existingKeys = new Set<string>();
    const { data: existing } = await supabaseAdmin.from("licenses").select("reg_key");
    for (const r of existing || []) existingKeys.add(r.reg_key);

    let attempts = 0;
    while (rows.length < count && attempts < count * 10) {
      attempts++;
      const key = String(Math.floor(10000000 + Math.random() * 90000000));
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        keys.push(key);
        rows.push({ reg_key: key, label: label || null, expires_at, model: model || "all" });
      }
    }

    const { error } = await supabaseAdmin.from("licenses").insert(rows);
    if (error) return { created: 0, keys: [], error: error.message };
    return { created: rows.length, keys };
  } catch (e: any) {
    return { created: 0, keys: [], error: e?.message ?? "Unknown error" };
  }
}

// ── Routing Strategy Management ──────────────────────────────────────────────

export interface RoutingConfig {
  strategy: "waterfall" | "weighted" | "round_robin";
  preferredCodeProvider: string;
  preferredMcqProvider: string;
}

export async function getRoutingStrategy(): Promise<RoutingConfig> {
  try {
    const { data, error } = await supabaseAdmin
      .from("admin_config")
      .select("key, value")
      .in("key", ["routing_strategy", "preferred_code_provider", "preferred_mcq_provider"]);
    if (!error && data) {
      const map: Record<string, string> = {};
      for (const row of data) map[row.key] = row.value;
      return {
        strategy: (map["routing_strategy"] || "waterfall") as RoutingConfig["strategy"],
        preferredCodeProvider: map["preferred_code_provider"] || "auto",
        preferredMcqProvider: map["preferred_mcq_provider"] || "auto",
      };
    }
  } catch { /* ignore */ }
  return { strategy: "waterfall", preferredCodeProvider: "auto", preferredMcqProvider: "auto" };
}

export async function saveRoutingStrategy(config: RoutingConfig): Promise<{ success: boolean; error?: string }> {
  try {
    const rows = [
      { key: "routing_strategy", value: config.strategy },
      { key: "preferred_code_provider", value: config.preferredCodeProvider },
      { key: "preferred_mcq_provider", value: config.preferredMcqProvider },
    ];
    for (const row of rows) {
      await supabaseAdmin
        .from("admin_config")
        .upsert(row, { onConflict: "key" });
    }
    const { invalidateRoutingCache } = await import("@/lib/brain");
    invalidateRoutingCache();
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Failed to save routing config" };
  }
}

// ── HWID / Machine Lock Management ──────────────────────────────────────────

export async function resetMachineLock(licenseIdOrKey: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { column, value } = getLicenseFilter(licenseIdOrKey, "resetMachineLock");
    const { error } = await supabaseAdmin
      .from("licenses")
      .update({ machine_id: null, activated_at: null })
      .eq(column, value);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Failed to reset machine lock" };
  }
}

export async function updateProviderWeight(
  providerId: string,
  weight: number,
  preferredFor: string | null
): Promise<{ success: boolean; error?: string }> {
  requireId(providerId, "updateProviderWeight");
  try {
    const { error } = await supabaseAdmin
      .from("ai_providers")
      .update({
        weight: Math.max(1, Math.min(100, weight)),
        preferred_for: preferredFor || null,
      })
      .eq("id", providerId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e?.message ?? "Failed to update provider weight" };
  }
}

// ── Live Watchers & Telemetry Server Actions ────────────────────────────────

export async function triggerHealthAudit(): Promise<{
  success: boolean;
  auditedCount: number;
  healthyCount: number;
  results: Array<{ id: string; label: string; healthy: boolean; latency_ms: number; error?: string }>;
  error?: string;
}> {
  try {
    const { testProviderConnection, invalidateProvidersCache } = await import("@/lib/brain");
    const { data: providers, error } = await supabaseAdmin
      .from("ai_providers")
      .select("*")
      .order("priority", { ascending: true });

    if (error || !providers) return { success: false, auditedCount: 0, healthyCount: 0, results: [], error: error?.message };

    const auditResults = await Promise.all(
      providers.map(async (p) => {
        const pingRes = await testProviderConnection(p);
        const isHealthy = pingRes.success;

        const updateData: Record<string, unknown> = {
          last_latency_ms: pingRes.latency_ms,
          last_error: isHealthy ? null : (pingRes.message || "Failed health ping").slice(0, 500),
        };
        if (!isHealthy) {
          updateData.rate_limited_until = new Date(Date.now() + 45_000).toISOString();
        } else if (p.rate_limited_until && new Date(p.rate_limited_until) <= new Date()) {
          updateData.rate_limited_until = null;
        }

        await supabaseAdmin.from("ai_providers").update(updateData).eq("id", p.id);

        return {
          id: p.id,
          label: p.label,
          healthy: isHealthy,
          latency_ms: pingRes.latency_ms,
          error: isHealthy ? undefined : pingRes.message,
        };
      })
    );

    invalidateProvidersCache();
    return {
      success: true,
      auditedCount: auditResults.length,
      healthyCount: auditResults.filter((r) => r.healthy).length,
      results: auditResults,
    };
  } catch (e: any) {
    return { success: false, auditedCount: 0, healthyCount: 0, results: [], error: e?.message };
  }
}

export async function getGlobalTelemetry(limit = 50): Promise<Array<any>> {
  try {
    const { getRecentSystemHistory } = await import("@/lib/history");
    return await getRecentSystemHistory(limit);
  } catch {
    return [];
  }
}

export async function getActiveClientPresence(): Promise<{
  activeNow: string[];
  activeToday: string[];
  totalSeen: number;
}> {
  try {
    const { getClientPresenceSummary } = await import("@/lib/watcher");
    return getClientPresenceSummary();
  } catch {
    return { activeNow: [], activeToday: [], totalSeen: 0 };
  }
}

export async function simulateChaosFailure(
  providerId: string,
  durationMs = 60_000
): Promise<{ success: boolean; message: string }> {
  try {
    const { triggerSimulatedFailure } = await import("@/lib/watcher");
    triggerSimulatedFailure(providerId, durationMs);
    return { success: true, message: `Simulated 429 outage active for ${Math.round(durationMs / 1000)}s` };
  } catch (e: any) {
    return { success: false, message: e?.message ?? "Failed to simulate outage" };
  }
}

export async function clearProviderBackoff(providerId: string): Promise<{ success: boolean }> {
  try {
    await supabaseAdmin
      .from("ai_providers")
      .update({ rate_limited_until: null, last_error: null })
      .eq("id", providerId);
    const { invalidateProvidersCache } = await import("@/lib/brain");
    invalidateProvidersCache();
    return { success: true };
  } catch {
    return { success: false };
  }
}

