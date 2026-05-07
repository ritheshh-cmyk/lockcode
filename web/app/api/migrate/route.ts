import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

// One-time migration endpoint — protected by APP_SECRET header.
// DELETE this file after migration is confirmed successful.
export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-app-secret");
  if (secret !== process.env.APP_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Step 1: Create admin_config table using raw SQL via RPC
    // Supabase allows raw SQL through pg_catalog functions via service role
    const { error: createError } = await supabaseAdmin.rpc("exec_migration", {
      sql: `
        CREATE TABLE IF NOT EXISTS admin_config (
          key   TEXT PRIMARY KEY,
          value TEXT NOT NULL
        );
        INSERT INTO admin_config (key, value)
        VALUES ('admin_password_hash', '4016f2f6da63d9d07f20197b69aacc1c4cc65fb489fae9a178605233b2e07035')
        ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;
      `,
    });

    if (createError) {
      // RPC function doesn't exist — try direct upsert (table may already exist)
      const { error: upsertError } = await supabaseAdmin
        .from("admin_config")
        .upsert({ key: "admin_password_hash", value: "4016f2f6da63d9d07f20197b69aacc1c4cc65fb489fae9a178605233b2e07035" });

      if (upsertError) {
        return NextResponse.json({
          success: false,
          step: "upsert",
          error: upsertError.message,
          hint: "Run this SQL manually in Supabase SQL Editor:\n\nCREATE TABLE IF NOT EXISTS admin_config (key TEXT PRIMARY KEY, value TEXT NOT NULL);\nINSERT INTO admin_config (key, value) VALUES ('admin_password_hash', '4016f2f6da63d9d07f20197b69aacc1c4cc65fb489fae9a178605233b2e07035') ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value;",
        });
      }
    }

    // Step 2: Verify the row was inserted
    const { data: verify, error: verifyError } = await supabaseAdmin
      .from("admin_config")
      .select("key, value")
      .eq("key", "admin_password_hash")
      .single();

    return NextResponse.json({
      success: true,
      message: "Migration complete",
      row: verify,
      verifyError: verifyError?.message ?? null,
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
    });
  }
}
