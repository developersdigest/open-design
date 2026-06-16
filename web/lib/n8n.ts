import { headers } from "next/headers";
import { NextResponse } from "next/server";

const BASE = process.env.N8N_BASE_URL ?? "http://localhost:5678/webhook/brand";

/**
 * Proxy a JSON POST to a `brand/<route>` webhook on the local (or N8N_BASE_URL) n8n instance.
 * Surfaces actionable errors when n8n isn't running, the workflow isn't active,
 * or the response isn't JSON — so the UI shows something useful instead of a stack trace.
 *
 * Reads `x-request-id` from the inbound request (set by middleware), forwards it
 * to n8n, and includes it in error response bodies for traceability.
 */
export async function proxyToN8n(route: string, body: unknown): Promise<NextResponse> {
  const url = `${BASE}/${route}`;

  const hdrs = await headers();
  const requestId = hdrs.get("x-request-id") ?? crypto.randomUUID();

  let res: Response;
  try {
    res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-request-id": requestId,
      },
      body: JSON.stringify(body),
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "couldn't reach n8n — is it running?",
        url,
        hint: "start it with `n8n start` (or `make n8n`) and re-import the workflow.",
        cause: err instanceof Error ? err.message : String(err),
        request_id: requestId,
      },
      { status: 502 },
    );
  }

  const text = await res.text();
  if (!text) {
    return NextResponse.json(
      {
        error: "empty response from n8n",
        upstream_status: res.status,
        hint:
          res.status === 404
            ? "the webhook isn't registered — import the workflow and toggle Active in the n8n UI."
            : route === "assets"
              ? "n8n returned no body. Restart n8n with FAL_KEY set, then try generating again."
              : "check the n8n execution log for this run.",
        request_id: requestId,
      },
      { status: 502 },
    );
  }

  try {
    return NextResponse.json(JSON.parse(text), { status: res.status });
  } catch {
    return NextResponse.json(
      {
        error: "non-JSON response from n8n",
        upstream_status: res.status,
        body: text.slice(0, 500),
        request_id: requestId,
      },
      { status: 502 },
    );
  }
}
