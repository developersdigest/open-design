<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes - APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Project shape

- App Router only. All API routes live at `app/api/<name>/route.ts`.
- Frontend is a single big client component at `app/page.tsx`. This is intentional - do not split it up without a reason.
- Shared library code in `lib/`. Root layout in `app/layout.tsx`, global tokens in `app/globals.css`.

## The proxyToN8n helper

Every `app/api/<name>/route.ts` that talks to n8n MUST use `proxyToN8n` from `@/lib/n8n` instead of hand-rolling `fetch`. It handles unreachable-n8n, 404 webhooks (workflow not active), and non-JSON upstream responses with actionable error messages routed back to the UI.

```ts
import { NextRequest, NextResponse } from "next/server";
import { proxyToN8n } from "@/lib/n8n";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.url) return NextResponse.json({ error: "url required" }, { status: 400 });
  return proxyToN8n("decode", body);
}
```

## Streaming routes

`app/api/mini-asset/route.ts` and `app/api/index-css/route.ts` stream from Kimi via SSE. Keep them as raw `Response` (not `NextResponse`) returning `upstream.body` directly with `Content-Type: text/event-stream` headers. Do NOT wrap them in `proxyToN8n` - it buffers the body and breaks streaming.

## Env vars

- `KIMI_API_KEY` - required for the streaming routes (`mini-asset`, `index-css`).
- `N8N_BASE_URL` - defaults to `http://localhost:5678/webhook/brand`. Override for staging/prod webhook hosts.

See `.env.example` for the canonical list.

## Design system

DevDigest spec - cream / ink / pink / yellow. Tokens live in `app/globals.css`.

- Buttons: `rounded-full`, `min-h-[44px]` for any tappable element.
- Cards: offset shadow via a sibling `bg-offset` div with `translate-x-1 translate-y-1 sm:translate-x-2 sm:translate-y-2`.
- No emojis. No em dashes (use ` - `). No gradients. No drop shadows.

## TypeScript

- `@/*` alias maps to the project root - see `tsconfig.json` paths. Import shared lib as `@/lib/n8n`, not relative paths.
- Run `bun run typecheck` before claiming a route works. Type errors in route handlers fail the build.
