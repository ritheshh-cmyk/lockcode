import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

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
