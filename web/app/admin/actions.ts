"use server";

import { supabaseAdmin } from "@/lib/supabase";

// ── Auth ────────────────────────────────────────────────────

export async function verifyAdminPassword(password: string): Promise<boolean> {
  // Hash the candidate password with SHA-256 before comparing.
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const candidateHash = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");

  // 1️⃣ Primary: verify against Supabase admin_config table (hash comparison)
  try {
    const { data: row, error } = await supabaseAdmin
      .from("admin_config")
      .select("value")
      .eq("key", "admin_password_hash")
      .single();

    if (!error && row) {
      return candidateHash === row.value;
    }
  } catch {
    // table may not exist yet — fall through
  }

  // 2️⃣ Fallback: ADMIN_PASSWORD_HASH env var (hash comparison)
  if (process.env.ADMIN_PASSWORD_HASH) {
    return candidateHash === process.env.ADMIN_PASSWORD_HASH;
  }

  // 3️⃣ Last resort: ADMIN_PASSWORD plain text env var
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
}

// ── Guards ──────────────────────────────────────────────────

/** Throw early if id is empty — prevents accidental full-table mutations. */
function requireId(id: string, op: string): void {
  if (!id || typeof id !== "string" || id.trim().length === 0) {
    throw new Error(`${op}: id must not be empty`);
  }
}

// ── CRUD Operations ─────────────────────────────────────────

export async function fetchAllLicenses(): Promise<License[]> {
  const { data, error } = await supabaseAdmin
    .from("licenses")
    .select("id, reg_key, label, gemini_key, language, expires_at, is_active, machine_id, activated_at, created_at")
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
  language: string
): Promise<License> {
  const reg_key = regKey.trim();
  if (!/^\d{8}$/.test(reg_key)) {
    throw new Error("Key must be exactly 8 digits");
  }
  const totalMs =
    trialDays * 24 * 60 * 60 * 1000 +
    trialHours * 60 * 60 * 1000;
  if (totalMs <= 0) {
    throw new Error("Duration must be greater than 0");
  }
  const expires_at = new Date(Date.now() + totalMs).toISOString();

  const { data, error } = await supabaseAdmin
    .from("licenses")
    .insert({
      reg_key,
      label: label.trim() || null,
      expires_at,
      gemini_key: geminiKey.trim() || null,
      language: language || "Java",
    })
    .select("id, reg_key, label, gemini_key, language, expires_at, is_active, machine_id, activated_at, created_at")
    .single();

  if (error) {
    // Supabase unique violation code
    if (error.code === "23505") throw new Error("Registration key already exists");
    throw new Error(error.message);
  }
  return data as License;
}

export async function revokeLicense(id: string): Promise<void> {
  requireId(id, "revokeLicense");
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function resetLicense(id: string): Promise<void> {
  requireId(id, "resetLicense");
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ machine_id: null, activated_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLicense(id: string): Promise<void> {
  requireId(id, "deleteLicense");
  const { error } = await supabaseAdmin
    .from("licenses")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateLicense(
  id: string,
  label: string,
  geminiKey: string,
  addDays: number = 0,
  addHours: number = 0
): Promise<void> {
  requireId(id, "updateLicense");

  // Fetch current expiry to extend it
  const { data: current, error: fetchErr } = await supabaseAdmin
    .from("licenses")
    .select("expires_at")
    .eq("id", id)
    .single();

  if (fetchErr || !current) throw new Error("Failed to fetch license");

  let newExpiresAt = current.expires_at;
  if (addDays > 0 || addHours > 0) {
    const totalMs = addDays * 24 * 60 * 60 * 1000 + addHours * 60 * 60 * 1000;
    // Add to current expiry if it's in the future, otherwise add to current time
    const baseTime = new Date(current.expires_at).getTime() > Date.now()
      ? new Date(current.expires_at).getTime()
      : Date.now();
    newExpiresAt = new Date(baseTime + totalMs).toISOString();
  }

  const { error } = await supabaseAdmin
    .from("licenses")
    .update({
      label: label.trim() || null,
      gemini_key: geminiKey.trim() || null,
      expires_at: newExpiresAt
    })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateLanguage(id: string, language: string): Promise<void> {
  requireId(id, "updateLanguage");
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ language: language || "Java" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
