import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { invalidateProvidersCache } from "@/lib/brain";

export const runtime = "nodejs";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token") || req.headers.get("x-app-secret");
  const expectedToken = process.env.ADMIN_TOKEN || process.env.APP_SECRET || "lockapp-secret-2026";
  if (token && token === expectedToken) return true;

  // Check admin_session cookie
  const cookie = req.cookies.get("admin_session")?.value;
  if (cookie && cookie === "authenticated") return true;

  return false;
}

export async function GET(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabaseAdmin
    .from("ai_providers")
    .select("*")
    .order("priority", { ascending: true })
    .order("created_at", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ providers: data });
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    provider: string;
    label: string;
    api_key: string;
    model: string;
    base_url?: string;
    priority?: number;
    is_active?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.provider || !body.api_key || !body.model) {
    return NextResponse.json({ error: "Missing required fields (provider, api_key, model)" }, { status: 400 });
  }

  const { data, error } = await supabaseAdmin
    .from("ai_providers")
    .insert({
      provider: body.provider.toLowerCase().trim(),
      label: (body.label || `${body.provider} Provider`).trim(),
      api_key: body.api_key.trim(),
      model: body.model.trim(),
      base_url: body.base_url?.trim() || null,
      priority: body.priority ?? 1,
      is_active: body.is_active ?? true,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateProvidersCache();
  return NextResponse.json({ success: true, provider: data });
}

export async function PUT(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    id: string;
    provider?: string;
    label?: string;
    api_key?: string;
    model?: string;
    base_url?: string;
    priority?: number;
    is_active?: boolean;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.id) {
    return NextResponse.json({ error: "Missing provider id" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (body.provider) updates.provider = body.provider.toLowerCase().trim();
  if (body.label) updates.label = body.label.trim();
  if (body.api_key) updates.api_key = body.api_key.trim();
  if (body.model) updates.model = body.model.trim();
  if (body.base_url !== undefined) updates.base_url = body.base_url?.trim() || null;
  if (body.priority !== undefined) updates.priority = body.priority;
  if (body.is_active !== undefined) updates.is_active = body.is_active;

  const { data, error } = await supabaseAdmin
    .from("ai_providers")
    .update(updates)
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateProvidersCache();
  return NextResponse.json({ success: true, provider: data });
}

export async function DELETE(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing id query parameter" }, { status: 400 });
  }

  const { error } = await supabaseAdmin.from("ai_providers").delete().eq("id", id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  invalidateProvidersCache();
  return NextResponse.json({ success: true, deletedId: id });
}
