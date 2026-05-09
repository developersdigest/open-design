import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Attach an `x-request-id` to every request for traceability.
 * If the inbound request already carries one (e.g. forwarded from an
 * external system), pass it through; otherwise mint a fresh UUID.
 * The id is echoed back on the response so clients can correlate.
 */
export function middleware(req: NextRequest) {
  const incoming = req.headers.get("x-request-id");
  const requestId = incoming ?? crypto.randomUUID();

  const requestHeaders = new Headers(req.headers);
  if (!incoming) requestHeaders.set("x-request-id", requestId);

  const res = NextResponse.next({
    request: { headers: requestHeaders },
  });
  res.headers.set("x-request-id", requestId);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico)).*)",
  ],
};
