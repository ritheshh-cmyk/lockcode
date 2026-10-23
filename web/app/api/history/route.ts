import { NextRequest, NextResponse } from "next/server";
import { getUserHistory, getRecentSystemHistory } from "@/lib/history";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const regKey = searchParams.get("reg_key") || searchParams.get("key") || "";

  // If a specific user reg_key is requested
  if (regKey) {
    const history = await getUserHistory(regKey);
    return NextResponse.json({
      success: true,
      data: history,
    });
  }

  // If admin overview is requested
  const appSecret = req.headers.get("x-app-secret");
  const expectedSecret = process.env.APP_SECRET || "lockapp-secret-2026";
  if (appSecret === expectedSecret) {
    const recent = await getRecentSystemHistory(50);
    return NextResponse.json({
      success: true,
      data: recent,
    });
  }

  return NextResponse.json(
    { success: false, error: "Please provide a reg_key query parameter (e.g. ?reg_key=12345678)" },
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
