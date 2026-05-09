/**
 * Hand-written TypeScript types for the Brand Forge n8n API.
 * Mirrors workflow/openapi.yaml (OpenAPI 3.1.0).
 */

/** OpenAPI schema: BrandingTokens — Firecrawl-derived branding tokens. */
export interface BrandingTokens {
  colors?: string[];
  fonts?: string[];
  /** URI to logo image. */
  logo?: string;
  [key: string]: unknown;
}

/** OpenAPI schema: BrandCopy */
export interface BrandCopy {
  brand_name: string;
  tagline: string;
  hero_headline: string;
  tone: string[];
}

/** The 12 Jungian brand archetypes. */
export type BrandArchetype =
  | "The Innocent"
  | "The Sage"
  | "The Explorer"
  | "The Outlaw"
  | "The Magician"
  | "The Hero"
  | "The Lover"
  | "The Jester"
  | "The Everyman"
  | "The Caregiver"
  | "The Ruler"
  | "The Creator";

/** OpenAPI schema: Strategy */
export interface Strategy {
  brand_archetype?: BrandArchetype;
  [key: string]: unknown;
}

/** OpenAPI schema: AssetItem */
export interface AssetItem {
  type: "hero" | "ig_post" | "og_card" | "ig_story";
  /** URI to the generated asset. */
  url: string;
  width: number;
  height: number;
  prompt: string;
}

/** Request body for POST /decode */
export interface DecodeRequest {
  /** URI to scrape. */
  url: string;
}

/** OpenAPI schema: DecodeResponse */
export interface DecodeResponse {
  source_url: string;
  branding: BrandingTokens;
  copy: BrandCopy;
  /** Kimi token usage. */
  tokens: Record<string, unknown>;
}

/** Request body for POST /design */
export interface DesignRequest {
  brand_run_id: string;
  source_url: string;
  branding: BrandingTokens;
  copy: BrandCopy;
}

/** OpenAPI schema: DesignResponse */
export interface DesignResponse {
  design_md: string;
  strategy: Strategy;
  tokens_total: number;
}

/** Request body for POST /html */
export interface HtmlRequest {
  brand_run_id: string;
  design_md: string;
}

/** Outline section entry within HtmlResponse.outline.sections */
export interface HtmlOutlineSection {
  [key: string]: unknown;
}

/** OpenAPI schema: HtmlResponse */
export interface HtmlResponse {
  html: string;
  outline: {
    sections?: HtmlOutlineSection[];
    [key: string]: unknown;
  };
  tokens_total: number;
}

/** Request body for POST /assets */
export interface AssetsRequest {
  brand_run_id: string;
  branding: BrandingTokens;
  copy: BrandCopy;
  design_md: string;
  strategy: Strategy;
}

/** OpenAPI schema: AssetsResponse */
export interface AssetsResponse {
  assets: AssetItem[];
  mocked: boolean;
}

/** OpenAPI schema: ErrorResponse — returned on 502 from any endpoint. */
export interface BrandApiError {
  error: string;
  hint?: string;
  upstream_status?: number;
  url?: string;
}
