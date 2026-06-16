import { type NextRequest, NextResponse } from "next/server";
import { proxyToN8n } from "@/lib/n8n";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 });
  const res = await proxyToN8n("decode", body);
  if (!res.ok) return res;

  const decoded = await res.json();
  const id = decoded.id || decoded.brand_run_id || brandRunId(decoded.source_url || body.url);
  return NextResponse.json({ ...decoded, id, brand_run_id: id }, { status: res.status });
}

function brandRunId(url: string) {
  return `local-${hostnameOf(url || "brand")
    .replace(/[^a-z0-9]+/gi, "-")
    .toLowerCase()}`;
}

function hostnameOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}
