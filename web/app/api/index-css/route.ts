import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const KIMI_URL = "https://api.moonshot.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You write a single brand stylesheet — index.css — that captures a brand's design system as reusable CSS classes.

OUTPUT FORMAT
- Pure CSS only. No markdown, no fences, no prose, no <style> tags.
- Start with @import lines for any Google Fonts you need (substitute commercial fonts with the closest Google Font match).
- Then :root { ... } with CSS variables for the palette, typography, radii.
- Then a small set of opinionated, reusable utility/component classes scoped under .brand (e.g. .brand-btn, .brand-btn--ghost, .brand-card, .brand-pill, .brand-stack, .brand-cluster, .brand-hero, .brand-h1, .brand-h2, .brand-body, .brand-caption, .brand-input, .brand-section).
- Include sensible base styles (body font, color, background) under a .brand wrapper class so styles don't bleed.
- Keep it under ~250 lines. Be opinionated, not exhaustive.

REUSE
- Anyone generating an HTML snippet for this brand will link this stylesheet and use these classes. Make the class names predictable and intuitive.
- Don't define one-off classes for hypothetical content — only the brand's general system.`;

type Tokens = {
  primary?: string;
  secondary?: string;
  accent?: string;
  background?: string;
  textPrimary?: string;
  link?: string;
  headingFont?: string;
  bodyFont?: string;
  borderRadius?: string;
  brandName?: string;
};

function tokensBlock(t: Tokens): string {
  const lines: string[] = ["# BRAND TOKENS — use these EXACTLY"];
  if (t.brandName) lines.push(`Brand: ${t.brandName}`);
  if (t.primary) lines.push(`primary: ${t.primary}`);
  if (t.secondary) lines.push(`secondary: ${t.secondary}`);
  if (t.accent) lines.push(`accent: ${t.accent}`);
  if (t.background) lines.push(`background: ${t.background}`);
  if (t.textPrimary) lines.push(`text: ${t.textPrimary}`);
  if (t.link) lines.push(`link: ${t.link}`);
  if (t.headingFont) lines.push(`heading font: ${t.headingFont}`);
  if (t.bodyFont) lines.push(`body font: ${t.bodyFont}`);
  if (t.borderRadius) lines.push(`border radius: ${t.borderRadius}`);
  return lines.join("\n");
}

function stripFences(s: string): string {
  return s.replace(/^```(?:css)?\n?/i, "").replace(/\n?```\s*$/i, "").trim();
}

export async function POST(req: NextRequest) {
  const key = process.env.KIMI_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "KIMI_API_KEY not set", hint: "cp web/.env.example web/.env.local and fill in your Moonshot key" }), { status: 500 });

  const { design_md = "", tokens = {}, model = "kimi-k2-turbo-preview" } = await req.json();

  const userContent = [
    tokensBlock(tokens),
    "",
    "# BRAND DESIGN SYSTEM SPEC",
    "",
    design_md || "(no design.md available — derive the system from the tokens above)",
    "",
    "---",
    "",
    "Write the index.css now. Pure CSS only.",
  ].join("\n");

  const upstream = await fetch(KIMI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!upstream.ok) {
    const text = await upstream.text();
    return new Response(JSON.stringify({ error: "kimi failed", upstream_status: upstream.status, body: text.slice(0, 500) }), { status: 502 });
  }

  const json = await upstream.json();
  const css = stripFences(json.choices?.[0]?.message?.content || "");

  return new Response(JSON.stringify({ css }), {
    headers: { "Content-Type": "application/json" },
  });
}
