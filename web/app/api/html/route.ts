import { type NextRequest, NextResponse } from "next/server";
import { proxyToN8n } from "@/lib/n8n";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.brand_run_id) return NextResponse.json({ error: "brand_run_id required" }, { status: 400 });
  if (!body.design_md) return NextResponse.json({ error: "design_md required" }, { status: 400 });
  return proxyToN8n("html", body);
}
