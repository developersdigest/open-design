// HMAC signature verification for incoming webhooks (e.g. from n8n or third parties).
//
// Edge-runtime compatible. Uses the Web Crypto API and constant-time hex comparison.
//
// Example usage in a Next.js route handler:
//
//   import { verifyHmacSignature } from "@/lib/verify-webhook";
//
//   export async function POST(req: Request) {
//     // IMPORTANT: read the raw body as text — you can't read it twice.
//     const rawBody = await req.text();
//     const sig = req.headers.get("x-signature"); // or "x-hub-signature-256", etc.
//     const secret = process.env.WEBHOOK_SECRET ?? "";
//
//     if (!verifyHmacSignature(rawBody, sig, secret)) {
//       return new Response("invalid signature", { status: 401 });
//     }
//
//     // Parse the body yourself since we already consumed it:
//     const payload = JSON.parse(rawBody);
//     // ... handle payload
//     return new Response("ok");
//   }

const encoder = new TextEncoder();

function bytesToHex(bytes: ArrayBuffer): string {
  const view = new Uint8Array(bytes);
  let hex = "";
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, "0");
  }
  return hex;
}

/**
 * Constant-time hex string comparison. Returns false immediately on length
 * mismatch (length is not secret). Otherwise iterates the full string,
 * accumulating differences into a single byte to avoid early-exit timing leaks.
 */
function timingSafeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) {
    diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return diff === 0;
}

async function hmacSha256Hex(rawBody: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(rawBody));
  return bytesToHex(sig);
}

/**
 * Sign a raw body with HMAC-SHA256 and return a `sha256=<hex>` signature.
 * Useful for tests and for outbound webhooks.
 */
export async function signHmac(rawBody: string, secret: string): Promise<string> {
  const hex = await hmacSha256Hex(rawBody, secret);
  return `sha256=${hex}`;
}

/**
 * Verify an HMAC-SHA256 signature against a raw request body.
 *
 * Accepts both `sha256=<hex>` (GitHub style) and bare `<hex>` signature headers.
 * Returns false on any error (missing header, malformed signature, crypto
 * failure, etc.) — never throws.
 *
 * NOTE: This is async-under-the-hood (Web Crypto is async), but we expose a
 * synchronous-looking boolean signature. We achieve that by returning a
 * Promise<boolean> from the awaited path; callers must `await` the result.
 */
export function verifyHmacSignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): Promise<boolean> {
  return (async () => {
    try {
      if (!signatureHeader || !secret) return false;

      const trimmed = signatureHeader.trim();
      const provided = trimmed.startsWith("sha256=") ? trimmed.slice("sha256=".length) : trimmed;

      // Hex-only sanity check — any non-hex char means malformed.
      if (provided.length === 0 || !/^[0-9a-fA-F]+$/.test(provided)) {
        return false;
      }

      const expected = await hmacSha256Hex(rawBody, secret);
      return timingSafeEqualHex(provided.toLowerCase(), expected.toLowerCase());
    } catch {
      return false;
    }
  })();
}
