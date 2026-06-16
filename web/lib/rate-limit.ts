// Tiny in-memory token-bucket rate limiter for Next.js route handlers.
// NOTE: This is fine for single-instance demos; for production use Upstash/Redis.

import { NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const store: Map<string, Bucket> = new Map();

export type RateLimitOptions = {
  limit?: number;
  windowMs?: number;
  key?: (req: Request) => string;
};

export type RateLimitResult = {
  ok: boolean;
  remaining: number;
  resetMs: number;
};

function defaultKey(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) {
    const first = xff.split(",")[0]?.trim();
    if (first) return first;
  }
  return "unknown";
}

export function rateLimit(req: Request, opts: RateLimitOptions = {}): RateLimitResult {
  const limit = opts.limit ?? 30;
  const windowMs = opts.windowMs ?? 60_000;
  const keyFn = opts.key ?? defaultKey;
  const key = keyFn(req);
  const now = Date.now();

  // Lazy eviction: drop entries older than resetAt + windowMs
  for (const [k, v] of store) {
    if (now > v.resetAt + windowMs) {
      store.delete(k);
    }
  }

  let bucket = store.get(key);
  if (!bucket || now > bucket.resetAt) {
    bucket = { count: 0, resetAt: now + windowMs };
    store.set(key, bucket);
  }

  bucket.count += 1;

  const remaining = Math.max(0, limit - bucket.count);
  const resetMs = Math.max(0, bucket.resetAt - now);
  const ok = bucket.count <= limit;

  return { ok, remaining, resetMs };
}

export function rateLimitResponse({
  remaining,
  resetMs,
}: {
  remaining: number;
  resetMs: number;
}): NextResponse {
  return NextResponse.json(
    { error: "rate_limited", retry_after_ms: resetMs },
    {
      status: 429,
      headers: {
        "Retry-After": String(Math.ceil(resetMs / 1000)),
        "X-RateLimit-Remaining": String(remaining),
      },
    },
  );
}
