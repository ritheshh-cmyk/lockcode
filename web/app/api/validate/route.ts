import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";

export async function POST(req: NextRequest) {
  // ── Secret header check ──
  const appSecret = req.headers.get("x-app-secret");
  if (appSecret !== process.env.APP_SECRET) {
    return NextResponse.json(
      { valid: false, message: "Unauthorized" },
      { status: 401 }
    );
  }

  // ── Parse body ──
  let body: { reg_key?: string; machine_id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { valid: false, message: "Invalid request body" },
      { status: 400 }
    );
  }

  // ── Sanitize inputs ──
  const reg_key = (body.reg_key ?? "").trim();
  const machine_id = (body.machine_id ?? "").trim();

  // Edge case: empty strings must be treated as missing
  if (!reg_key || !machine_id) {
    return NextResponse.json(
      { valid: false, message: "Missing reg_key or machine_id" },
      { status: 400 }
    );
  }

  // reg_key must be exactly 8 digits (matches createLicense validation)
  if (!/^\d{8}$/.test(reg_key)) {
    return NextResponse.json(
      { valid: false, message: "Invalid registration key format" },
      { status: 400 }
    );
  }

  // machine_id: reasonable length guard (MAC address or similar identifier)
  if (machine_id.length > 256) {
    return NextResponse.json(
      { valid: false, message: "machine_id too long" },
      { status: 400 }
    );
  }

  // ── Look up license ──
  const { data: license, error } = await supabaseAdmin
    .from("licenses")
    .select("id, reg_key, machine_id, gemini_key, language, model, expires_at, is_active")
    .eq("reg_key", reg_key)
    .single();

  if (error || !license) {
    return NextResponse.json(
      { valid: false, message: "Invalid registration key" },
      { status: 404 }
    );
  }

  // ── Check if revoked ──
  if (!license.is_active) {
    return NextResponse.json(
      { valid: false, message: "License revoked" },
      { status: 403 }
    );
  }

  // ── Check if expired ──
  const now = new Date();
  const expiresAt = new Date(license.expires_at);

  // Guard against invalid date in DB
  if (isNaN(expiresAt.getTime())) {
    return NextResponse.json(
      { valid: false, message: "License has an invalid expiry date" },
      { status: 500 }
    );
  }

  if (expiresAt < now) {
    return NextResponse.json(
      { valid: false, message: "License expired" },
      { status: 403 }
    );
  }

  const totalMsRemaining = expiresAt.getTime() - now.getTime();
  const daysRemaining = Math.floor(totalMsRemaining / (1000 * 60 * 60 * 24));
  const hoursRemaining = Math.floor(
    (totalMsRemaining % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)
  );

  // ── Build the shared response payload ──
  const payload = {
    valid: true,
    days_remaining: daysRemaining,
    hours_remaining: hoursRemaining,
    reg_key: license.reg_key,
    expires_at: license.expires_at,
    // gemini_key may contain comma-separated keys — return as-is; final.py handles splitting
    gemini_key: license.gemini_key || null,
    language: license.language || "Java",
    model: license.model || "gemini",
  };

  // ── First activation (machine_id is null or empty) ──
  if (!license.machine_id) {
    const { error: updateError } = await supabaseAdmin
      .from("licenses")
      .update({
        machine_id: machine_id,
        activated_at: new Date().toISOString(),
      })
      .eq("id", license.id);

    if (updateError) {
      return NextResponse.json(
        { valid: false, message: "Activation failed. Try again." },
        { status: 500 }
      );
    }

    return NextResponse.json({ ...payload, message: "Activated" });
  }

  // ── Machine mismatch ──
  if (license.machine_id !== machine_id) {
    return NextResponse.json(
      {
        valid: false,
        message: "License already activated on another machine",
      },
      { status: 403 }
    );
  }

  // ── Valid returning user ──
  return NextResponse.json({ ...payload, message: "Welcome back" });
}
