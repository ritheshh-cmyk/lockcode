import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // ── Admin token check ──
  const adminToken = req.headers.get("x-admin-token");
  if (adminToken !== process.env.ADMIN_TOKEN) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // ── Parse body ──
  let body: { reg_key?: string; label?: string; trial_days?: number };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 }
    );
  }

  const { reg_key, label, trial_days } = body;

  if (!reg_key || !/^\d{8}$/.test(reg_key)) {
    return NextResponse.json(
      { error: "reg_key must be exactly 8 digits" },
      { status: 400 }
    );
  }

  if (!trial_days || trial_days < 1) {
    return NextResponse.json(
      { error: "trial_days must be a positive number" },
      { status: 400 }
    );
  }

  const expires_at = new Date(
    Date.now() + trial_days * 24 * 60 * 60 * 1000
  ).toISOString();

  // ── Insert into Supabase ──
  const { error } = await supabaseAdmin.from("licenses").insert({
    reg_key,
    label: label || null,
    expires_at,
  });

  if (error) {
    return NextResponse.json(
      { error: "Failed to create license", details: error.message },
      { status: 500 }
    );
  }

  return NextResponse.json({ reg_key, expires_at, label });
}
