# Security Policy

## Reporting a Vulnerability

Email security reports to **jonathan@sideguide.dev**. Do NOT open public GitHub issues for security bugs.

Include:

- A clear description of the issue
- Reproduction steps (minimal, deterministic if possible)
- Affected route, file, or component
- Impact assessment (what an attacker could do)

Expect an acknowledgement within 72 hours. Coordinated disclosure is preferred; please give a reasonable window before public discussion.

## Threat Model

This project is a self-hosted demo, not a multi-tenant SaaS. The web app trusts its local n8n instance, and n8n trusts upstream APIs (Firecrawl, Moonshot, Fal). Secrets live in `.env.local` and in n8n credentials storage. The intended deployment is a single-operator local or private network environment; running it exposed to the public internet without the hardening below is out of scope for the default configuration.

## Known Boundaries

- Webhooks have no auth by default - use `verify-webhook.ts` if exposing publicly.
- The `/decode` route fetches arbitrary URLs via Firecrawl - be aware of SSRF risk if exposing on a public network.
- The Kimi-streaming routes accept arbitrary prompt text from the client - no server-side prompt sanitization or length cap by default.
- The HTML route renders LLM-generated HTML in an iframe - if you embed it elsewhere, treat the output as untrusted.

## Hardening Checklist for Production

- TLS termination at a reverse proxy (Caddy, nginx, or a managed load balancer)
- Rate limiting via `web/lib/rate-limit.ts` on all public routes
- Webhook HMAC verification using `verify-webhook.ts`
- Input length caps on all prompt and URL fields
- A strict `Content-Security-Policy` header, especially for the HTML iframe route
- Run n8n in a separate network namespace or container with no access to internal services
- Rotate API keys (Firecrawl, Moonshot, Fal) on any suspected exposure
- Disable unused workflows in n8n

## Supported Versions

| Version | Supported |
| ------- | --------- |
| `main`  | Yes       |
| Other   | No        |

Only the `main` branch is supported. Dependency versions are pinned in `package.json`; update via PR and re-test before deploying.
