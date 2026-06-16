import { type NextRequest, NextResponse } from "next/server";
import { proxyToN8n } from "@/lib/n8n";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.brand_run_id) {
    return NextResponse.json({ error: "brand_run_id required (decode first)" }, { status: 400 });
  }
  return proxyToN8n("design", body);
}
