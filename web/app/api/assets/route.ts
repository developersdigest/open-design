import { NextRequest, NextResponse } from "next/server";
import { proxyToN8n } from "@/lib/n8n";

export const runtime = "nodejs";
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.brand_run_id) return NextResponse.json({ error: "brand_run_id required" }, { status: 400 });
  const n8n = await proxyToN8n("assets", body);
  if (n8n.status !== 502) return n8n;
  const errorBody = await n8n.json().catch(() => ({}));
  if (errorBody.error !== "empty response from n8n") {
    return NextResponse.json(errorBody, { status: n8n.status });
  }
  return generateWithFal(body, errorBody.request_id);
}

async function generateWithFal(body: any, requestId?: string) {
  const key = process.env.FAL_KEY;
  if (!key) {
    return NextResponse.json(
      {
        error: "Fal key missing",
        hint: "Restart the app with FAL_KEY set, then try generating again.",
        request_id: requestId,
      },
      { status: 502 },
    );
  }

  const branding = body.branding || {};
  const images = branding.images || {};
  const copy = body.copy || {};
  const strategy = body.strategy || {};
  const colors = Array.isArray(branding.colors) ? branding.colors : Object.values(branding.colors || {});
  const fontsList = Array.isArray(branding.fonts)
    ? branding.fonts.map((f: any) => typeof f === "string" ? f : f.family).filter(Boolean)
    : [];
  const selectedReferenceImages = normalizeReferenceImages(body.reference_images);
  const automaticBrandImages = [
    /^https?:\/\//.test(images.logo || "") ? images.logo : null,
    /^data:image\/(png|jpe?g|webp);base64,/.test(body.screenshot || "") ? body.screenshot : null,
    images.ogImage,
  ].filter(Boolean);
  const isCustomPrompt = Boolean(body.asset_prompt);
  const imageUrls = isCustomPrompt
    ? [...automaticBrandImages, ...selectedReferenceImages]
    : [...automaticBrandImages, ...selectedReferenceImages];
  const htmlContext = referenceHtmlContext(body.reference_html);
  const brandName = copy.brand_name || branding.title || "the brand";
  const prompt = [
    body.asset_prompt
      ? [
          "PRIMARY USER INSTRUCTION:",
          body.asset_prompt,
          "",
          "Follow the primary instruction literally. Brand references are inspiration only: borrow palette, composition quality, spacing, material, typography feel, and polish. Do not copy the OG image, make the logo the subject, or replace the requested subject unless the user explicitly asks for that.",
        ].join("\n")
      : `Create one premium brand image for ${brandName}.`,
    "",
    "Brand context:",
    isCustomPrompt
      ? "Logo, homepage screenshot, OG image, and selected references are soft inspiration only. The user's requested subject, scene, and content win."
      : "Reference priority: logo/brand mark first, homepage screenshot second, OG image only as secondary inspiration.",
    `Brand: ${brandName}.`,
    `Tone: ${(copy.tone || []).join(", ") || (strategy.mood_keywords || []).slice(0, 3).join(", ") || "modern, confident"}.`,
    `Palette: ${colors.slice(0, 6).join(", ") || "brand colors"}.`,
    fontsList.length ? `Typography: ${fontsList.slice(0, 3).join(", ")}.` : "",
    copy.hero_headline ? `Headline: ${copy.hero_headline}.` : "",
    body.design_md ? `Design system context: ${String(body.design_md).slice(0, 2400)}` : "",
    htmlContext,
  ].filter(Boolean).join("\n");

  const endpoint = imageUrls.length ? "https://fal.run/openai/gpt-image-2/edit" : "https://fal.run/openai/gpt-image-2";
  const payload: Record<string, unknown> = {
    prompt,
    image_size: body.image_size || "landscape_16_9",
    quality: "medium",
    num_images: 1,
    output_format: "png",
  };
  if (imageUrls.length) payload.image_urls = imageUrls;

  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Key ${key}`,
    },
    body: JSON.stringify(payload),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    return NextResponse.json(
      { error: "Fal image generation failed", upstream_status: res.status, detail: json.detail || json.error || json, request_id: requestId },
      { status: 502 },
    );
  }
  const image = json.images?.[0];
  if (!image?.url) {
    return NextResponse.json({ error: "Fal returned no image", detail: json, request_id: requestId }, { status: 502 });
  }
  return NextResponse.json({
    assets: [{
      type: body.asset_type || "custom",
      url: image.url,
      width: image.width || 1024,
      height: image.height || 576,
      prompt,
    }],
    mocked: false,
    fallback: "fal-direct",
  });
}

function normalizeReferenceImages(refs: any): string[] {
  if (!Array.isArray(refs)) return [];
  return refs
    .slice(0, 6)
    .map((ref) => ref?.asset_url || ref?.url)
    .filter((url): url is string => typeof url === "string" && (/^https?:\/\//.test(url) || /^data:image\/(png|jpe?g|webp);base64,/.test(url)));
}

function referenceHtmlContext(refs: any): string {
  if (!Array.isArray(refs) || refs.length === 0) return "";
  const blocks = refs.slice(0, 6).map((ref: any, index: number) => {
    const name = typeof ref?.name === "string" ? ref.name.slice(0, 120) : `HTML reference ${index + 1}`;
    const prompt = typeof ref?.prompt === "string" ? ref.prompt.slice(0, 400) : "";
    const html = typeof ref?.html === "string" ? ref.html.slice(0, 1600) : "";
    if (!html) return "";
    return [`${index + 1}. ${name}`, prompt ? `Source prompt: ${prompt}` : "", `HTML/style cues: ${html}`].filter(Boolean).join("\n");
  }).filter(Boolean);
  if (!blocks.length) return "";
  return [
    "Selected HTML context:",
    "Use these snippets for layout, surface treatment, visual hierarchy, and composition cues. Do not render raw UI screenshots unless requested.",
    ...blocks,
  ].join("\n\n");
}
