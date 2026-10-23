import { NextRequest, NextResponse } from "next/server";
import { testProviderConnection } from "@/lib/brain";

export const runtime = "nodejs";

function checkAdminAuth(req: NextRequest): boolean {
  const token = req.headers.get("x-admin-token") || req.headers.get("x-app-secret");
  const expectedToken = process.env.ADMIN_TOKEN || process.env.APP_SECRET || "lockapp-secret-2026";
  if (token && token === expectedToken) return true;

  const cookie = req.cookies.get("admin_session")?.value;
  if (cookie && cookie === "authenticated") return true;

  return false;
}

export async function POST(req: NextRequest) {
  if (!checkAdminAuth(req)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: {
    provider: string;
    api_key: string;
    model: string;
    base_url?: string;
  };

  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.provider || !body.api_key) {
    return NextResponse.json({ error: "Missing required fields (provider, api_key)" }, { status: 400 });
  }

  const result = await testProviderConnection({
    provider: body.provider,
    api_key: body.api_key,
    model: body.model,
    base_url: body.base_url,
  });

  return NextResponse.json(result);
}
