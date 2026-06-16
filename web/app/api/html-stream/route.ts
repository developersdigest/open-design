import type { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 300;

const KIMI_URL = "https://api.moonshot.ai/v1/chat/completions";

// Mirrors the n8n "Kimi: HTML" node (id d3000000-0000-0000-0000-000000000004) in workflow/brand-api.json
const SYSTEM_PROMPT_WITH_OUTLINE =
  "Senior frontend engineer. Output a complete HTML5 file (one <!doctype html>, full <html>, <head>, <body>). Inline CSS in <style> in <head>. Match the design system exactly using the actual hex codes, fonts, button styles. Google Fonts via <link>. Implement ALL sections from the outline. Vanilla JS for FAQ accordion. Responsive (640/1024px breakpoints). Output ONLY the HTML, NO code fences.";

// Single-pass variant for when no outline is supplied — same role, but instruct it to derive sections from design.md
const SYSTEM_PROMPT_NO_OUTLINE =
  "Senior frontend engineer. Output a complete HTML5 file (one <!doctype html>, full <html>, <head>, <body>). Inline CSS in <style> in <head>. Match the design system exactly using the actual hex codes, fonts, button styles. Google Fonts via <link>. Derive a sensible 8-section landing page (hero, features, social_proof, testimonial, pricing, faq, cta, footer) directly from the design.md. Vanilla JS for FAQ accordion. Responsive (640/1024px breakpoints). Output ONLY the HTML, NO code fences.";

type OutlineSection = {
  type?: string;
  heading?: string;
  subheading?: string;
  content?: string;
  cta_text?: string;
};

type Body = {
  design_md?: string;
  outline?: { sections?: OutlineSection[] };
  model?: string;
};

export async function POST(req: NextRequest) {
  const key = process.env.KIMI_API_KEY;
  if (!key) {
    return new Response(
      JSON.stringify({
        error: "KIMI_API_KEY not set",
        hint: "cp web/.env.example web/.env.local and fill in your Moonshot key",
      }),
      { status: 500 },
    );
  }

  const { design_md = "", outline, model = "kimi-k2.6" }: Body = await req.json();

  const hasOutline = !!(outline && Array.isArray(outline.sections) && outline.sections.length > 0);
  const systemPrompt = hasOutline ? SYSTEM_PROMPT_WITH_OUTLINE : SYSTEM_PROMPT_NO_OUTLINE;

  const userContent = hasOutline
    ? `Design spec:\n${design_md || "(no design.md provided)"}\n\nSection outline:\n${JSON.stringify(outline)}`
    : `Design spec:\n${design_md || "(no design.md provided)"}`;

  const upstream = await fetch(KIMI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      stream: true,
      temperature: 0.6,
      thinking: { type: "disabled" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userContent },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(
      JSON.stringify({
        error: "kimi failed",
        upstream_status: upstream.status,
        body: text.slice(0, 500),
      }),
      { status: 502 },
    );
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
