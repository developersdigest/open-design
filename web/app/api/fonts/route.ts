import { type NextRequest, NextResponse } from "next/server";
import { proxyToN8n } from "@/lib/n8n";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 });
  return proxyToN8n("fonts", body);
}
