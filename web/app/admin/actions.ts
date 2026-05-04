"use server";

import { supabaseAdmin } from "@/lib/supabase";

// ── Auth ────────────────────────────────────────────────────

export async function verifyAdminPassword(password: string): Promise<boolean> {
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
  api_key: string | null;
  gemini_key: string | null;
  language: string | null;
}

// ── CRUD Operations ─────────────────────────────────────────

export async function fetchAllLicenses(): Promise<License[]> {
  const { data, error } = await supabaseAdmin
    .from("licenses")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as License[]) || [];
}

export async function createLicense(
  regKey: string,
  label: string,
  trialDays: number,
  trialHours: number,
  apiKey: string,
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
      label: label || null,
      expires_at,
      api_key: apiKey || null,
      gemini_key: geminiKey || null,
      language: language || "Java",
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as License;
}

export async function revokeLicense(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ is_active: false })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function resetLicense(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ machine_id: null, activated_at: null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteLicense(id: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("licenses")
    .delete()
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function rotateApiKey(id: string, newApiKey: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ api_key: newApiKey || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function rotateGeminiKey(id: string, newGeminiKey: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ gemini_key: newGeminiKey || null })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function updateLanguage(id: string, language: string): Promise<void> {
  const { error } = await supabaseAdmin
    .from("licenses")
    .update({ language: language || "Java" })
    .eq("id", id);
  if (error) throw new Error(error.message);
}
