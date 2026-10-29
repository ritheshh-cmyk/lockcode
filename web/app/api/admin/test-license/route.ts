import { NextRequest, NextResponse } from "next/server";
import { fetchAllLicenses, createLicense } from "@/app/admin/actions";
import { supabaseAdmin } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("x-app-secret");
  if (secret !== (process.env.APP_SECRET || "lockapp-secret-2026")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Fetch raw from supabase
    const { data: rawRows, error: rawError } = await supabaseAdmin
      .from("licenses")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);

    // 2. Fetch using fetchAllLicenses()
    let actionLicenses: unknown = null;
    let actionError: string | null = null;
    try {
      actionLicenses = await fetchAllLicenses();
    } catch (e: any) {
      actionError = e?.message ?? String(e);
    }

    return NextResponse.json({
      success: true,
      rawCount: rawRows?.length ?? 0,
      rawRows,
      rawError: rawError ? rawError.message : null,
      actionLicensesCount: Array.isArray(actionLicenses) ? actionLicenses.length : 0,
      actionError,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err?.message ?? String(err) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const secret = req.headers.get("x-app-secret");
  if (secret !== (process.env.APP_SECRET || "lockapp-secret-2026")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const res = await createLicense(body);
    return NextResponse.json({ result: res });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message ?? String(err) }, { status: 500 });
  }
}
