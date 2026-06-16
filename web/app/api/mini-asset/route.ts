import { NextRequest } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 120;

const KIMI_URL = "https://api.moonshot.ai/v1/chat/completions";

const SYSTEM_PROMPT = `You are a senior frontend engineer building a UI snippet IN A SPECIFIC BRAND'S design system.

OUTPUT FORMAT
- A single self-contained HTML snippet — no <!doctype>, no <html>, no <head>, no <body>.
- Wrap your markup in <div class="brand">…</div> so the brand stylesheet's :scope rules apply.
- NO code fences. NO prose. Just raw HTML.

USING THE BRAND STYLESHEET (index.css)
The brand has an index.css ALREADY LOADED in the page. The full CSS is shown in the user message under "# BRAND INDEX.CSS (already linked)". You MUST:
- Read the available class names (.brand-btn, .brand-card, .brand-h1, etc.) and USE THEM in your markup. Don't redefine them.
- Only emit a small <style> block of your own if the snippet needs novel one-off styles that the index.css genuinely doesn't cover. Keep it minimal.
- Do NOT @import the brand fonts again — they're already loaded by index.css.
- Do NOT restate the brand palette as CSS variables.

USING THE BRAND TOKENS
The user message also contains BRAND TOKENS (exact hex colors, fonts) for reference. Don't invent colors.

VISUAL ANCHORING RULES
- Treat extracted brand evidence as the source of truth, in this order: attached visual references, og_url/brand images, index.css, design.md, tokens, then the user's prompt.
- Before choosing layout, infer the brand's actual visual language from the references: density, whitespace, corner radius, border weight, shadows, illustration/photo style, color proportions, typography scale, and UI chrome.
- The snippet should look like it came from the source site, not like a generic SaaS card recolored with brand colors.
- Preserve brand-specific quirks when visible: unusual spacing, hard edges vs rounded corners, pill language, grid rhythm, gradients only if the source uses them, and image treatment.
- Use the exact extracted palette and assets. Do not introduce generic blue/purple SaaS styling, stock gradients, fake dashboards, emoji, or unrelated placeholder art.
- If the request is vague, build a polished brand-native composition rather than explaining or listing features.

USING THE BRAND ASSETS
The user message includes BRAND ASSETS when available. When the snippet would naturally include the brand mark (header, footer, hero, nav, mobile bar), use logo_url directly. Do not embed og_url in HTML snippets unless the user explicitly selected it as image context or specifically asks for that image. Don't invent placeholder logos. If no logo asset is provided, fall back to a brand-named text mark.

USING SELECTED IMAGE ASSETS
The user may attach SELECTED IMAGE ASSETS. These are not just inspiration: if the prompt asks for decoration, image cards, hero visuals, background images, mockups, billboards, previews, or media, use the provided asset URLs directly in <img src="..."> or CSS background-image:url("..."). Use object-fit/object-position and accessible alt text. Do not use unrelated placeholder image services.

USING SELECTED HTML CONTEXT
The user may attach previous HTML snippets as context. Use them as structural references or source material when relevant. Adapt the layout and details to the new prompt instead of blindly duplicating the old snippet.

OUTPUT EXAMPLE
<div class="brand">
  <section class="brand-section">
    <h1 class="brand-h1">…</h1>
    <button class="brand-btn">…</button>
  </section>
</div>`;

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

type ReferenceImage = {
  url: string;
  asset_url?: string;
  original_url?: string;
  name?: string;
};

type ReferenceHtml = {
  name?: string;
  prompt?: string;
  html?: string;
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

export async function POST(req: NextRequest) {
  const key = process.env.KIMI_API_KEY;
  if (!key) return new Response(JSON.stringify({ error: "KIMI_API_KEY not set", hint: "cp web/.env.example web/.env.local and fill in your Moonshot key" }), { status: 500 });

  const { prompt, design_md = "", index_css = "", tokens = {}, assets = {}, reference_images = [], reference_html = [], model } = await req.json();
  if (!prompt) return new Response(JSON.stringify({ error: "prompt required" }), { status: 400 });

  const assetLines: string[] = [];
  if (assets.logo_url)    assetLines.push(`logo_url:    ${assets.logo_url}`);
  if (assets.favicon_url) assetLines.push(`favicon_url: ${assets.favicon_url}`);
  if (assets.og_url)      assetLines.push(`og_url:      ${assets.og_url}`);
  const assetsBlock = assetLines.length
    ? "# BRAND ASSETS (logo_url may be used for marks; og_url is only reference context unless explicitly selected)\n" + assetLines.join("\n")
    : "# BRAND ASSETS\n(none — use a text wordmark for the brand name)";
  const referenceHtmlBlock = referenceHtmlContextBlock(reference_html);

  const userContent = [
    tokensBlock(tokens),
    "",
    assetsBlock,
    "",
    "# BRAND INDEX.CSS (already linked into the page — use these classes)",
    "",
    index_css || "(no index.css available — feel free to write minimal inline styles)",
    "",
    "# BRAND DESIGN SYSTEM SPEC (for fuller context)",
    "",
    design_md || "(no design.md generated yet)",
    "",
    referenceHtmlBlock,
    "",
    "---",
    "",
    "# BUILD THIS",
    "",
    prompt,
  ].join("\n");

  const refImages = await normalizeReferenceImages(reference_images);
  const messageContent = refImages.length
    ? [
        ...refImages.map((image, index) => ({
          type: "image_url",
          image_url: { url: image.url },
        })),
        {
          type: "text",
          text: [
            userContent,
            "",
            "# VISUAL REFERENCES",
            "These images are the strongest evidence for the brand's actual look. Match their composition, color balance, spacing, image treatment, and UI material. Only embed images that were explicitly selected as image assets.",
            "",
            "# SELECTED IMAGE ASSETS",
            "These image URLs may be embedded directly in the HTML when useful. Use them for decorative images, backgrounds, cards, mockups, previews, or hero media if the prompt naturally calls for imagery.",
            ...refImages.map((image, index) => `${index + 1}. ${image.name || "reference image"}: ${image.asset_url || image.original_url || image.url}`),
          ].join("\n"),
        },
      ]
    : userContent;

  const upstream = await fetch(KIMI_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: model || "kimi-k2.6",
      stream: true,
      temperature: 0.6,
      thinking: { type: "disabled" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: messageContent },
      ],
    }),
  });

  if (!upstream.ok || !upstream.body) {
    const text = await upstream.text();
    return new Response(JSON.stringify({ error: "kimi failed", upstream_status: upstream.status, body: text.slice(0, 500) }), { status: 502 });
  }

  return new Response(upstream.body, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

function referenceHtmlContextBlock(refs: ReferenceHtml[]): string {
  const normalized = normalizeReferenceHtml(refs);
  if (!normalized.length) return "";
  return [
    "# SELECTED HTML CONTEXT",
    "Use these previous snippets as context for structure, components, wording density, and interaction patterns. Reuse or adapt the HTML only when it helps the new prompt.",
    "",
    ...normalized.map((ref, index) => [
      `## ${index + 1}. ${ref.name || ref.prompt || "HTML reference"}`,
      ref.prompt ? `Prompt: ${ref.prompt}` : "",
      "HTML:",
      ref.html,
    ].filter(Boolean).join("\n")),
  ].join("\n\n");
}

function normalizeReferenceHtml(refs: ReferenceHtml[]): ReferenceHtml[] {
  if (!Array.isArray(refs)) return [];
  return refs
    .slice(0, 6)
    .map((ref) => ({
      name: cleanText(ref?.name, 120),
      prompt: cleanText(ref?.prompt, 500),
      html: cleanText(ref?.html, 8000),
    }))
    .filter((ref) => Boolean(ref.html));
}

function cleanText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.trim().slice(0, max);
}

async function normalizeReferenceImages(images: ReferenceImage[]) {
  const refs = Array.isArray(images) ? images.slice(0, 6) : [];
  const normalized = await Promise.all(refs.map(async (image) => {
    if (!image?.url) return null;
    if (/^data:image\/(png|jpe?g|webp);base64,/i.test(image.url)) return image;
    if (!/^https?:\/\//i.test(image.url)) return null;
    try {
      const res = await fetch(image.url);
      if (!res.ok) return null;
      const contentType = res.headers.get("content-type") || "image/png";
      if (!/^image\/(png|jpe?g|webp)/i.test(contentType)) return null;
      const buffer = Buffer.from(await res.arrayBuffer());
      if (buffer.byteLength > 8 * 1024 * 1024) return null;
      return {
        ...image,
        asset_url: image.asset_url || image.url,
        original_url: image.url,
        url: `data:${contentType};base64,${buffer.toString("base64")}`,
      };
    } catch {
      return null;
    }
  }));
  return normalized.filter((image): image is ReferenceImage => Boolean(image));
}
