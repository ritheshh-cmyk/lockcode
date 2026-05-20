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

// ── License CRUD ─────────────────────────────────────────────

export async function fetchAllLicenses(): Promise<License[]> {
  const { data, error } = await supabaseAdmin
    .from("licenses")
    .select("id, reg_key, label, gemini_key, language, model, expires_at, is_active, machine_id, activated_at, created_at")
    .order("created_at", { ascending: false });
  if (error) throw new Error(error.message);
  return (data as License[]) || [];
}

export async function createLicense(
  regKey: string,
  label: string,
  trialDays: number,
  trialHours: number,
  geminiKey: string,
  language: string,
  model: string = "gemini"
): Promise<License> {
  const reg_key = regKey.trim();
  if (!/^\d{8}$/.test(reg_key)) throw new Error("Key must be exactly 8 digits");
  const totalMs = trialDays * 24 * 60 * 60 * 1000 + trialHours * 60 * 60 * 1000;
  if (totalMs <= 0) throw new Error("Duration must be greater than 0");
  const expires_at = new Date(Date.now() + totalMs).toISOString();

  const { data, error } = await supabaseAdmin
    .from("licenses")
    .insert({
      reg_key,
      label: label.trim() || null,
      expires_at,
      // Sanitize each key in a comma-separated list, remove empty slots
      gemini_key: geminiKey.split(",").map(k => k.trim()).filter(Boolean).join(",") || null,
      language: language || "Java",
      model
    })
    .select("id, reg_key, label, gemini_key, language, model, expires_at, is_active, machine_id, activated_at, created_at")
    .single();

  if (error) {
    if (error.code === "23505") throw new Error("Registration key already exists");
    throw new Error(error.message);
  }
  return data as License;
}

export async function revokeLicense(id: string): Promise<void> {
  requireId(id, "revokeLicense");
  const { error } = await supabaseAdmin.from("licenses").update({ is_active: false }).eq("id", id);
  if (error) throw new Error(error.message);
}

/** Hard-terminate: set expires_at to now so the client is blocked on next check */
export async function terminateLicense(id: string): Promise<void> {
  requireId(id, "terminateLicense");
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ expires_at: new Date().toISOString(), is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function resetLicense(id: string): Promise<void> {
  requireId(id, "resetLicense");
  const { error } = await supabaseAdmin.from("licenses").update({ machine_id: null, activated_at: null }).eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLicense(id: string): Promise<void> {
  requireId(id, "deleteLicense");
  const { error } = await supabaseAdmin.from("licenses").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateLicense(
  id: string,
  label: string,
  geminiKey: string,
  language: string,
  addDays: number = 0,
  addHours: number = 0,
  deductDays: number = 0,
  deductHours: number = 0,
  model: string = "gemini"
): Promise<void> {
  requireId(id, "updateLicense");

  const { data: current, error: fetchErr } = await supabaseAdmin
    .from("licenses").select("expires_at").eq("id", id).single();
  if (fetchErr || !current) throw new Error("Failed to fetch license");

  let newExpiresAt = current.expires_at;
  const addMs    = (addDays * 24 * 60 * 60 + addHours * 60 * 60) * 1000;
  const deductMs = (deductDays * 24 * 60 * 60 + deductHours * 60 * 60) * 1000;

  if (addMs > 0) {
    const base = new Date(current.expires_at).getTime() > Date.now()
      ? new Date(current.expires_at).getTime() : Date.now();
    newExpiresAt = new Date(base + addMs).toISOString();
  } else if (deductMs > 0) {
    const current_ts = new Date(current.expires_at).getTime();
    // Clamp: never go below now (would still leave the key technically expired but not negative)
    const newTs = Math.max(Date.now(), current_ts - deductMs);
    newExpiresAt = new Date(newTs).toISOString();
  }

  const { error } = await supabaseAdmin
    .from("licenses")
    .update({
      label: label.trim() || null,
      // Per-key trim so " AIza1, AIza2 " → "AIza1,AIza2"
      gemini_key: geminiKey.split(",").map(k => k.trim()).filter(Boolean).join(",") || null,
      language: language || "Java",
      expires_at: newExpiresAt,
      model
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

/** Standalone language update — used by the inline dropdown in the table */
export async function updateLanguage(id: string, language: string): Promise<void> {
  requireId(id, "updateLanguage");
  const { error } = await supabaseAdmin
    .from("licenses").update({ language: language || "Java" }).eq("id", id);
  if (error) throw new Error(error.message);
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
  const { error } = await supabaseAdmin
    .from("api_key_pool")
    .update({ label: label.trim() || null })
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
