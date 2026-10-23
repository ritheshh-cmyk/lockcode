import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder-titan.supabase.co";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "placeholder-anon-key";
const supabaseServiceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  "placeholder-service-role-key";

/**
 * Check if real Supabase credentials are configured in environment
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

/**
 * Public Supabase client (uses anon key).
 * Safe to use on the frontend — respects RLS.
 */
export const supabasePublic = createClient(supabaseUrl, supabaseAnonKey);

/**
 * Admin Supabase client (uses service role key).
 * ONLY use in server actions and API routes — bypasses RLS.
 * NEVER import this on the client side.
 */
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
