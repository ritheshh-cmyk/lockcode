import { NextRequest, NextResponse } from "next/server";
import { getUserHistory, getRecentSystemHistory } from "@/lib/history";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regKey = searchParams.get("reg_key") || searchParams.get("key") || "";
  const adminToken = req.headers.get("x-admin-token") || searchParams.get("token") || searchParams.get("admin_token");
  const appSecret = req.headers.get("x-app-secret");

  const expectedToken = process.env.ADMIN_TOKEN || "lockapp-admin-token-2026";
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";

  const isAdmin = adminToken === expectedToken || appSecret === expectedSecret;

  // If asking for global/system overview
  if (searchParams.get("global") === "true" || searchParams.get("all") === "true" || (!regKey && isAdmin)) {
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50")));
    const recent = await getRecentSystemHistory(limit);
    return NextResponse.json({
      success: true,
      global: true,
      data: recent,
    });
  }

  // If a specific user reg_key is requested
  if (regKey) {
    const history = await getUserHistory(regKey);
    return NextResponse.json({
      success: true,
      data: history,
    });
  }

  return NextResponse.json(
    { success: false, error: "Please provide a reg_key parameter or authenticate as admin" },
    { status: 400 }
  );
}

export async function POST(req: NextRequest) {
  let body: { reg_key?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const regKey = body.reg_key || "";
  if (!regKey) {
    return NextResponse.json({ success: false, error: "reg_key is required" }, { status: 400 });
  }

  const history = await getUserHistory(regKey);
  return NextResponse.json({
    success: true,
    data: history,
  });
}
