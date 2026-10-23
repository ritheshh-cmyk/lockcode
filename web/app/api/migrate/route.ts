import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-app-secret");
  if (secret !== (process.env.APP_SECRET || "lockapp-secret-2026")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Attempt creating request_history table via RPC if available
    const { error: rpcError } = await supabaseAdmin.rpc("exec_migration", {
      sql: `
        CREATE TABLE IF NOT EXISTS request_history (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          reg_key TEXT NOT NULL,
          mode TEXT DEFAULT 'code',
          prompt TEXT NOT NULL,
          response TEXT,
          provider TEXT,
          model TEXT,
          tokens_prompt INT DEFAULT 0,
          tokens_completion INT DEFAULT 0,
          tokens_total INT DEFAULT 0,
          latency_ms INT DEFAULT 0,
          status TEXT DEFAULT 'success',
          created_at TIMESTAMPTZ DEFAULT now()
        );
        CREATE INDEX IF NOT EXISTS idx_request_history_reg_key ON request_history(reg_key, created_at DESC);
      `,
    });

    return NextResponse.json({
      success: true,
      message: "Migration processed",
      rpcError: rpcError?.message ?? null,
      hint: "If RPC is not enabled in Supabase, execute migration_request_history.sql in the Supabase SQL editor",
    });
  } catch (err) {
    return NextResponse.json({
      success: false,
      error: String(err),
    });
  }
}
