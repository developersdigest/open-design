"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Branding = {
  colorScheme?: string;
  fonts?: { family: string; role?: string }[];
  colors?: Record<string, string>;
  typography?: { fontFamilies?: Record<string, string>; fontSizes?: Record<string, string> };
  components?: {
    buttonPrimary?: { background?: string; textColor?: string; borderRadius?: string };
    buttonSecondary?: { background?: string; textColor?: string; borderRadius?: string };
    input?: { background?: string; textColor?: string; borderColor?: string; borderRadius?: string };
  };
  spacing?: { baseUnit?: number; borderRadius?: string };
  images?: { logo?: string; favicon?: string; ogImage?: string };
  personality?: { tone?: string; energy?: string; targetAudience?: string };
  designSystem?: { framework?: string; componentLibrary?: string };
  confidence?: { buttons?: number; colors?: number; overall?: number };
};

type Decoded = {
  id?: string;
  source_url: string;
  screenshot?: string;
  branding?: Branding;
  copy?: {
    brand_name?: string;
    tagline?: string;
    hero_headline?: string;
    hero_subheadline?: string;
    primary_cta?: string;
    three_bullets?: string[];
    tone?: string[];
  };
  tokens?: { total_tokens?: number };
};

type Strategy = {
  positioning_statement?: string;
  target_audience?: string;
  brand_archetype?: string;
  voice_examples?: string[];
  mood_keywords?: string[];
  what_to_avoid?: string[];
  expansion_opportunities?: string[];
};

type Designed = { id?: string; design_md: string; strategy?: Strategy; tokens_total?: number };

type Outline = {
  sections: { type: string; heading: string; subheading?: string; content?: string; cta_text?: string }[];
};

type Built = { id?: string; html: string; outline?: Outline; tokens_total?: number };

type Asset = { type: string; url: string; width: number; height: number; prompt?: string; createdAt?: number };
type AssetPack = { id?: string; assets: Asset[]; mocked?: boolean };
type AssetCanvas = {
  id: string;
  name: string;
  zoom?: number;
  view?: "canvas" | "tiles";
  assetUrls?: string[];
  positions: Record<string, { x: number; y: number }>;
};

type MiniAsset = { id: string; prompt: string; html: string; createdAt: number };
type PendingImage = { id: string; prompt: string; createdAt: number };
type PendingHtml = { id: string; prompt: string; createdAt: number };
type ReferenceImage = { id: string; url: string; assetUrl?: string; name: string; source: "drop" | "asset" };
type ReferenceHtml = { id: string; miniId: string; name: string; prompt: string; html: string };
type CreateMode = "html" | "image";
type GenerationLoadingContext = {
  labels: string[];
  colors: string[];
  images: { url: string; label: string }[];
};
type GenerationContext = {
  referenceImages?: { url: string; asset_url?: string; name?: string }[];
  referenceHtml?: { name: string; prompt: string; html: string }[];
};

const AUTO_PROMPTS = [
  "Hero section with a bold headline and one CTA button",
  "Pricing card with 3 tiers (Starter / Pro / Enterprise)",
  "FAQ accordion with 4 questions",
];

type Run = {
  decoded: Decoded;
  designed?: Designed;
  built?: Built;
  assets?: AssetPack;
  minis?: MiniAsset[];
  indexCss?: string;
  activeCanvasId?: string;
  assetCanvases?: AssetCanvas[];
  assetCanvas?: Record<string, { x: number; y: number }>;
};

const HISTORY_KEY = "open-design-history";

function brandRunId(decoded: Decoded) {
  return decoded.id || `local-${hostnameOf(decoded.source_url || "brand").replace(/[^a-z0-9]+/gi, "-").toLowerCase()}`;
}

function leanDecodedForDesign(decoded: Decoded): Decoded {
  const branding = decoded.branding || {};
  const images = branding.images || {};
  return {
    id: decoded.id,
    source_url: decoded.source_url,
    branding: {
      ...branding,
      images: {
        favicon: keepHttpUrl(images.favicon),
        logo: keepHttpUrl(images.logo),
        ogImage: keepHttpUrl(images.ogImage),
      },
    },
    copy: decoded.copy,
    tokens: decoded.tokens,
  };
}

function keepHttpUrl(value?: string) {
  return /^https?:\/\//.test(value || "") ? value : undefined;
}

function normalizeRun(run: Run): Run {
  if (run.decoded.id) return run;
  return { ...run, decoded: { ...run.decoded, id: brandRunId(run.decoded) } };
}

export default function Page() {
  const [url, setUrl] = useState("");
  const [error, setError] = useState<string | null>(null);

  // History of all runs (sorted newest first)
  const [history, setHistory] = useState<Run[]>([]);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const loaded = useRef(false);

  // Hydrate from localStorage once + listen for changes (e.g. mini-asset additions from child components)
  useEffect(() => {
    const reload = () => {
      try {
        const raw = localStorage.getItem(HISTORY_KEY);
        if (raw) {
          const arr = (JSON.parse(raw) as Run[]).map(normalizeRun);
          localStorage.setItem(HISTORY_KEY, JSON.stringify(arr.slice(0, 30)));
          setHistory(arr);
          if (!loaded.current) {
            // First load: honour ?brand=<host> query param
            const params = new URLSearchParams(window.location.search);
            const brandParam = params.get("brand");
            if (brandParam) {
              const i = arr.findIndex((r) => hostnameOf(r.decoded.source_url) === brandParam);
              if (i >= 0) { setActiveIdx(i); return; }
            }
          }
        }
      } catch {}
    };
    if (!loaded.current) {
      reload();
      loaded.current = true;
    }
    const onStorage = (e: StorageEvent) => { if (e.key === HISTORY_KEY) reload(); };
    const onPop = () => {
      const params = new URLSearchParams(window.location.search);
      const brandParam = params.get("brand");
      if (!brandParam) { setActiveIdx(null); return; }
      const i = history.findIndex((r) => hostnameOf(r.decoded.source_url) === brandParam);
      setActiveIdx(i >= 0 ? i : null);
    };
    window.addEventListener("storage", onStorage);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("popstate", onPop);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync ?brand=<host> in the URL whenever the active brand changes.
  useEffect(() => {
    if (!loaded.current) return;
    const params = new URLSearchParams(window.location.search);
    if (activeIdx != null && history[activeIdx]) {
      const host = hostnameOf(history[activeIdx].decoded.source_url);
      const brandParam = params.get("brand");
      const queryMatchesAnotherRun = brandParam &&
        brandParam !== host &&
        history.some((r) => hostnameOf(r.decoded.source_url) === brandParam);
      if (queryMatchesAnotherRun) return;
      if (params.get("brand") === host) return;
      params.set("brand", host);
      window.history.replaceState({}, "", `?${params.toString()}`);
    } else {
      if (!params.has("brand")) return;
      params.delete("brand");
      const qs = params.toString();
      window.history.replaceState({}, "", qs ? `?${qs}` : window.location.pathname);
    }
  }, [activeIdx, history]);

  // Keep direct links like ?brand=stripe.com aligned with the selected run
  // after localStorage hydration or when a brand is decoded in another tab.
  useEffect(() => {
    if (!loaded.current) return;
    const brandParam = new URLSearchParams(window.location.search).get("brand");
    if (!brandParam) return;
    const i = history.findIndex((r) => hostnameOf(r.decoded.source_url) === brandParam);
    if (i >= 0 && i !== activeIdx) setActiveIdx(i);
  }, [activeIdx, history]);

  function persist(next: Run[]) {
    const normalized = next.map(normalizeRun);
    setHistory(normalized);
    try {
      localStorage.setItem(HISTORY_KEY, JSON.stringify(normalized.slice(0, 30)));
    } catch {}
  }

  function updateActive(patch: Partial<Run>) {
    if (activeIdx == null) return;
    const next = history.slice();
    next[activeIdx] = { ...next[activeIdx], ...patch };
    persist(next);
  }

  function updateRunById(runId: string, patch: Partial<Run>) {
    const next = history.map((run) =>
      brandRunId(run.decoded) === runId ? { ...run, ...patch } : run
    );
    persist(next);
  }

  function selectBrand(i: number) {
    const run = history[i];
    setActiveIdx(i);
    if (run && typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      params.set("brand", hostnameOf(run.decoded.source_url));
      window.history.replaceState({}, "", `?${params.toString()}`);
    }
  }

  const [decoding, setDecoding] = useState(false);
  const [designing, setDesigning] = useState(false);
  const [building, setBuilding] = useState(false);
  const [genAssetsCount, setGenAssetsCount] = useState(0);
  const genAssets = genAssetsCount > 0;
  type WTab = "brand" | "studio";
  const [tab, setTab] = useState<WTab>("brand");
  const [libraryOpen, setLibraryOpen] = useState(false);

  useEffect(() => {
    setError(null);
  }, [activeIdx]);

  async function startDecode(e?: React.FormEvent) {
    e?.preventDefault();
    setError(null);
    if (!url.trim()) return;
    const normalized = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    setDecoding(true);
    try {
      const r = await fetch("/api/decode", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: normalized }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "decode failed");
      const decoded = { ...j, id: j.id || brandRunId(j) };
      const next: Run[] = [{ decoded }, ...history];
      persist(next);
      setActiveIdx(0);
      setTab("brand");
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDecoding(false);
    }
  }

  async function genDesign() {
    if (activeIdx == null) return;
    const run = history[activeIdx];
    const runId = brandRunId(run.decoded);
    setError(null);
    setDesigning(true);
    try {
      const r = await fetch("/api/design", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...leanDecodedForDesign(run.decoded), id: runId, brand_run_id: runId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "design failed");
      updateActive({ designed: j });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setDesigning(false);
    }
  }

  async function genAssetsCall(assetPrompt?: string, generationContext?: GenerationContext) {
    if (activeIdx == null) return;
    const run = history[activeIdx];
    const runId = brandRunId(run.decoded);
    setError(null);
    setGenAssetsCount((count) => count + 1);
    try {
      const r = await fetch("/api/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...run.decoded,
          id: runId,
          brand_run_id: runId,
          design_md: run.designed?.design_md || "",
          strategy: run.designed?.strategy || null,
          asset_prompt: assetPrompt,
          asset_type: assetPrompt ? "custom" : undefined,
          image_size: "landscape_16_9",
          reference_images: generationContext?.referenceImages || [],
          reference_html: generationContext?.referenceHtml || [],
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "assets failed");
      const generatedAt = Date.now();
      const generatedAssets = Array.isArray(j.assets)
        ? (j.assets as Asset[]).map((asset, index) => ({ ...asset, createdAt: generatedAt - index }))
        : [];
      const latestAll = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Run[];
      const latestIndex = latestAll.findIndex((r) => brandRunId(r.decoded) === runId);
      const latestRun = latestIndex >= 0 ? latestAll[latestIndex] : run;
      const nextAssets = latestRun.assets?.assets?.length
        ? { ...j, assets: [...generatedAssets, ...latestRun.assets.assets] }
        : j;
      const canvases = latestRun.assetCanvases?.length
        ? [{ ...latestRun.assetCanvases[0], name: "Canvas" }]
        : [{
            id: latestRun.activeCanvasId || "default",
            name: "Canvas",
            assetUrls: latestRun.assets?.assets?.map((asset) => asset.url) || [],
            positions: latestRun.assetCanvas || {},
          }];
      const activeCanvasId = canvases[0].id;
      const nextCanvases = canvases.map((canvas) =>
        canvas.id === activeCanvasId
          ? {
              ...canvas,
              assetUrls: [
                ...generatedAssets.map((asset) => asset.url),
                ...(canvas.assetUrls || []),
              ],
            }
          : canvas
      );
      if (latestIndex >= 0) {
        latestAll[latestIndex] = { ...latestAll[latestIndex], assets: nextAssets, assetCanvases: nextCanvases, activeCanvasId };
        persist(latestAll);
      } else {
        updateActive({ assets: nextAssets, assetCanvases: nextCanvases, activeCanvasId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setGenAssetsCount((count) => Math.max(0, count - 1));
    }
  }

  async function genBuild() {
    if (activeIdx == null) return;
    const run = history[activeIdx];
    if (!run.designed?.design_md) return setError("design_md required");
    const runId = brandRunId(run.decoded);
    setError(null);
    setBuilding(true);
    try {
      const r = await fetch("/api/html", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brand_run_id: runId,
          design_md: run.designed.design_md,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "html failed");
      updateActive({ built: j });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBuilding(false);
    }
  }

  // Homepage / library view — shown when no brand is selected (or none decoded yet)
  if (history.length === 0 || activeIdx == null) {
    return (
      <>
        <Homepage
          url={url}
          setUrl={setUrl}
          decoding={decoding}
          onSubmit={startDecode}
          history={history}
          onSelect={selectBrand}
          onDelete={(i) => {
            const next = history.slice();
            next.splice(i, 1);
            persist(next);
            if (activeIdx != null) {
              if (activeIdx === i) setActiveIdx(null);
              else if (activeIdx > i) setActiveIdx(activeIdx - 1);
            }
          }}
          error={error}
        />
        {decoding && <DecodingLoader url={url} />}
      </>
    );
  }

  // Workspace — a brand is open
  const active = history[activeIdx];
  const brandReady = Boolean(active?.designed?.design_md && active?.indexCss && !designing);

  // Auto-fire design.md generation in the background once when a brand opens (if not already done)
  // (handled in BrandWorkspace via useEffect to avoid stale closure)

  return (
    <div className="flex min-h-screen bg-cream">
      <aside
        className={`sticky top-0 h-screen shrink-0 overflow-hidden bg-white transition-[width] duration-200 ${
          libraryOpen ? "w-80" : "w-0"
        }`}
        aria-hidden={!libraryOpen}
      >
        <div className="h-full w-80">
          <div className="flex items-center justify-end px-4 py-3">
            <button
              type="button"
              aria-label="Close library"
              onClick={() => setLibraryOpen(false)}
              className="h-8 w-8 rounded-full bg-cream text-bodysm hover:bg-offset"
            >
              ×
            </button>
          </div>
          <BrandSidebar
            history={history}
            activeIdx={activeIdx}
            onSelect={selectBrand}
            onHome={() => { setActiveIdx(null); setLibraryOpen(false); }}
          />
        </div>
      </aside>

      {/* MAIN BRAND CONTENT */}
      <main className="flex-1 min-w-0 overflow-x-hidden">
        <div className="border-b-2 border-ink bg-white px-4 md:px-8 py-3 md:py-4 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 sticky top-0 z-10">
          <div className="min-w-0 flex items-center gap-3">
            {active?.decoded.branding?.images?.favicon ? (
              <div className="w-10 h-10 rounded border-2 border-ink shrink-0 bg-white flex items-center justify-center overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={active.decoded.branding.images.favicon} alt="" className="w-6 h-6 object-contain" />
              </div>
            ) : (
              <div
                className="w-10 h-10 rounded border-2 border-ink shrink-0"
                style={{ background: active?.decoded.branding?.colors?.primary || "#000" }}
              />
            )}
            <div className="min-w-0">
              <p className="text-caption uppercase tracking-widest text-dark-gray">Brand</p>
              <p className="text-large font-bold truncate">
                {active?.decoded.copy?.brand_name || hostnameOf(active?.decoded.source_url || "")}
              </p>
            </div>
          </div>
          {active && (
            <div className="flex flex-wrap items-center gap-2 md:gap-3 pb-1 lg:pb-0">
              <div className="flex items-center gap-1 shrink-0">
                {[
                  { key: "brand"  as const, label: "Brand",  emoji: "◐", loading: designing, disabled: false },
                  { key: "studio" as const, label: "Generate", emoji: "◇", disabled: !brandReady },
                ].map((t) => {
                  const isActive = tab === t.key;
                  return (
                    <button
                      key={t.key}
                      onClick={() => {
                        if (t.disabled) return;
                        setTab(t.key);
                      }}
                      disabled={t.disabled}
                      title={t.disabled ? "Brand setup is still running" : undefined}
                      className={`relative px-3 md:px-4 py-2 text-bodysm font-medium border-2 border-ink rounded-pill transition-colors whitespace-nowrap ${
                        t.disabled
                          ? "cursor-not-allowed bg-offset text-dark-gray opacity-55"
                          : isActive ? "bg-ink text-white" : "bg-cream hover:bg-white text-ink"
                      }`}
                    >
                      <span className={`mr-2 ${isActive && !t.disabled ? "text-white" : "text-dark-gray"}`}>{t.emoji}</span>
                      {t.label}
                      {"loading" in t && t.loading && (
                        <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse align-middle" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        <div className={tab === "studio" ? "" : "p-4 md:p-8"}>
          {error && tab === "brand" && (
            <Card className="mb-6">
              <p className="text-body"><b>Error:</b> {error}</p>
            </Card>
          )}
          {active && (
            <BrandWorkspace
              run={active}
              designing={designing}
              genAssets={genAssets}
              onGenDesign={genDesign}
              onGenAssets={genAssetsCall}
              onUpdateRun={updateActive}
              tab={tab}
            />
          )}
          {error && tab !== "brand" && (
            <div className="fixed bottom-24 left-1/2 z-30 max-w-[min(28rem,calc(100vw-2rem))] -translate-x-1/2 rounded-pill border border-ink/20 bg-white/95 px-3 py-2 text-caption text-dark-gray shadow-sm">
              <b>Error:</b> {error}
            </div>
          )}
        </div>
      </main>

      {/* studio is now a tab inside BrandWorkspace */}
    </div>
  );
}

function Icon({ name, className = "h-4 w-4" }: { name: "copy" | "download" | "edit" | "trash" | "expand" | "context"; className?: string }) {
  const paths: Record<string, React.ReactNode> = {
    copy: (<><rect x="9" y="9" width="13" height="13" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></>),
    download: (<><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></>),
    edit: (<><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>),
    trash: (<><polyline points="3 6 5 6 21 6" /><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" /><path d="M10 11v6M14 11v6" /><path d="M9 6V4a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v2" /></>),
    expand: (<><polyline points="15 3 21 3 21 9" /><polyline points="9 21 3 21 3 15" /><line x1="21" y1="3" x2="14" y2="10" /><line x1="3" y1="21" x2="10" y2="14" /></>),
    context: (<><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></>),
  };
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      {paths[name]}
    </svg>
  );
}

function hostnameOf(u: string) {
  try { return new URL(u).hostname.replace(/^www\./, ""); } catch { return u; }
}

const DECODE_STEPS = [
  "Preparing the website",
  "Reading the homepage",
  "Finding the design system",
  "Writing the brand kit",
  "Building the page",
  "Finishing up",
];

const STEP_GLYPHS = ["◇", "✦", "◧", "▢", "◆", "●"];

function faviconDataUrl(glyph: string): string {
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'><rect width='64' height='64' fill='%23F4F4F0'/><text x='50%' y='50%' dominant-baseline='central' text-anchor='middle' font-size='52' fill='%23000'>${glyph}</text></svg>`;
  return `data:image/svg+xml;utf8,${svg}`;
}

function DecodingLoader({ url }: { url: string }) {
  const [stepIdx, setStepIdx] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setStepIdx((i) => (i + 1) % DECODE_STEPS.length), 2400);
    return () => clearInterval(id);
  }, []);

  // Alternate browser tab title + favicon through the steps so progress shows
  // in the tab strip while the user is on another tab.
  useEffect(() => {
    const origTitle = document.title;
    const link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    const origIconHref = link?.href ?? null;
    return () => {
      document.title = origTitle;
      if (link && origIconHref) link.href = origIconHref;
    };
  }, []);

  useEffect(() => {
    document.title = `${DECODE_STEPS[stepIdx]}…`;
    let link = document.querySelector("link[rel='icon']") as HTMLLinkElement | null;
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = faviconDataUrl(STEP_GLYPHS[stepIdx % STEP_GLYPHS.length]);
  }, [stepIdx]);

  const host = (() => {
    try { return new URL(/^https?:\/\//.test(url) ? url : `https://${url}`).hostname.replace(/^www\./, ""); }
    catch { return url; }
  })();

  return (
    <div className="fixed inset-0 z-50 bg-cream/95 backdrop-blur-sm flex flex-col">
      {/* scan line sweeping vertically */}
      <div className="absolute inset-x-0 top-0 h-px bg-pink scan-line shadow-[0_0_24px_4px_rgba(255,144,232,0.7)]" />

      {/* full-bleed marquee strip mid-page */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden border-y-2 border-ink bg-white">
        <div className="flex marquee-x whitespace-nowrap py-6">
          {Array.from({ length: 2 }).map((_, dup) => (
            <div key={dup} className="flex items-center shrink-0 gap-12 pr-12">
              {Array.from({ length: 8 }).map((_, i) => (
                <span key={i} className="text-h2 font-bold tracking-tight flex items-center gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://www.google.com/s2/favicons?domain=${host}&sz=64`}
                    alt=""
                    className="w-12 h-12 rounded border-2 border-ink bg-white"
                  />
                  Preparing {host}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* center content */}
      <div className="relative flex-1 flex flex-col items-center justify-center px-6">
        <div className="absolute top-12 inset-x-0 text-center">
          <p className="text-caption tracking-widest uppercase text-dark-gray">Decoding</p>
          <p className="text-large font-medium mt-1">{host}</p>
        </div>

        <div className="absolute bottom-16 inset-x-0 text-center">
          <p key={stepIdx} className="word-fade text-h3 font-bold">
            {DECODE_STEPS[stepIdx]}…
          </p>
          <div className="mt-6 mx-auto h-2 w-72 overflow-hidden rounded-pill border-2 border-ink">
            <div className="h-full stripe-progress" />
          </div>
        </div>
      </div>
    </div>
  );
}

const PRESET_SITES = [
  "n8n.io", "stripe.com", "linear.app", "vercel.com",
];

function Homepage({
  url, setUrl, decoding, onSubmit, history, onSelect, onDelete, error,
}: {
  url: string;
  setUrl: (s: string) => void;
  decoding: boolean;
  onSubmit: (e?: React.FormEvent) => void;
  history: Run[];
  onSelect: (i: number) => void;
  onDelete: (i: number) => void;
  error: string | null;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(0);
  const PER_PAGE = 10;
  const filtered = history
    .map((r, i) => ({ r, i }))
    .filter(({ r }) => {
      if (!search.trim()) return true;
      const s = search.toLowerCase();
      return (
        r.decoded.source_url.toLowerCase().includes(s) ||
        (r.decoded.copy?.brand_name || "").toLowerCase().includes(s) ||
        (r.decoded.copy?.tagline || "").toLowerCase().includes(s)
      );
    });
  const pageCount = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const safePage = Math.min(page, pageCount - 1);
  const visible = filtered.slice(safePage * PER_PAGE, safePage * PER_PAGE + PER_PAGE);
  // reset to page 0 if search narrows results below current page
  useEffect(() => { if (page > pageCount - 1) setPage(0); }, [pageCount, page]);

  return (
    <main className="min-h-screen px-5 py-8 md:px-10 md:py-12">
      <section className="mx-auto flex min-h-[calc(100dvh-3rem)] max-w-6xl flex-col items-center justify-center text-center">
        <h1 className="max-w-5xl text-[64px] leading-[0.94] font-bold sm:text-[88px] md:text-[112px]">
          Open Design
        </h1>

        <div className="mt-8 w-full max-w-4xl animate-fade-up delay-100">
          <form onSubmit={onSubmit} className="relative flex items-center rounded-[36px] border-[3px] border-ink bg-white p-2.5 shadow-[12px_12px_0_0_rgba(255,144,232,0.55)]">
            <input
              type="text"
              required
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="firecrawl.dev"
              className="flex-1 min-w-0 bg-transparent px-5 py-4 text-large outline-none"
            />
            <button
              type="submit"
              disabled={decoding}
              aria-label="Decode brand"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-ink text-white hover:bg-dark-gray disabled:opacity-50"
            >
              {decoding ? (
                <span className="h-4 w-4 rounded-full border-2 border-white/40 border-t-white animate-spin" />
              ) : (
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 12h14" />
                  <path d="m12 5 7 7-7 7" />
                </svg>
              )}
            </button>
          </form>
          <div className="mx-auto mt-7 grid max-w-5xl grid-cols-2 gap-3 md:grid-cols-4">
            {PRESET_SITES.map((s) => (
              <button
                key={s}
                onClick={() => { setUrl(s); }}
                disabled={decoding}
                className="min-h-16 rounded-card bg-white px-5 py-4 text-body font-medium shadow-sm transition-colors hover:bg-pink/25 disabled:opacity-50"
              >
                {s}
              </button>
            ))}
          </div>
          {error && <p className="mt-4 text-bodysm"><b>Error:</b> {error}</p>}
        </div>
      </section>

      {history.length > 0 && (
      <section className="mx-auto mt-24 max-w-7xl border-t-2 border-ink pt-6">
          <div className="flex items-end justify-between gap-3 mb-5 flex-wrap">
            <div>
              <p className="text-caption uppercase tracking-widest text-dark-gray">Saved brands</p>
              <h2 className="text-h3 font-bold">Library</h2>
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={`Search ${history.length} brand${history.length === 1 ? "" : "s"}…`}
              className="px-4 py-2 bg-white border-2 border-ink rounded-pill text-bodysm w-64 outline-none focus:bg-cream"
            />
          </div>

          {filtered.length === 0 ? (
            <Card>
              <p className="text-bodysm text-dark-gray">No brands match &quot;{search}&quot;.</p>
            </Card>
          ) : (
            <>
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 items-stretch">
                {visible.map(({ r, i }) => (
                  <BrandCard key={i} run={r} onClick={() => onSelect(i)} onDelete={() => onDelete(i)} />
                ))}
              </div>
              {pageCount > 1 && (
                <div className="mt-6 flex items-center justify-between">
                  <p className="text-caption text-dark-gray">
                    Showing {safePage * PER_PAGE + 1}–{safePage * PER_PAGE + visible.length} of {filtered.length}
                  </p>
                  <div className="flex gap-2 items-center text-caption text-dark-gray">
                    <button
                      onClick={() => setPage((p) => Math.max(0, p - 1))}
                      disabled={safePage === 0}
                      className="px-3 py-1 bg-white border-2 border-ink rounded-pill disabled:opacity-30"
                    >‹ Prev</button>
                    <span>{safePage + 1} / {pageCount}</span>
                    <button
                      onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
                      disabled={safePage >= pageCount - 1}
                      className="px-3 py-1 bg-white border-2 border-ink rounded-pill disabled:opacity-30"
                    >Next ›</button>
                  </div>
                </div>
              )}
            </>
          )}
      </section>
      )}
    </main>
  );
}

function BrandCard({ run, onClick, onDelete }: { run: Run; onClick: () => void; onDelete?: () => void }) {
  const [confirming, setConfirming] = useState(false);
  const c = run.decoded;
  const primary = c.branding?.colors?.primary || "#000";
  const bg = c.branding?.colors?.background || "#fff";
  const og = c.branding?.images?.ogImage;
  const favicon = c.branding?.images?.favicon;
  const counts = [
    run.assets ? `${run.assets.assets.length} visuals` : null,
    run.minis?.length ? `${run.minis.length} snippets` : null,
  ].filter(Boolean);
  return (
    <div className="relative h-full group">
      {onDelete && (
        <div className="absolute top-1 right-[-2px] z-10 flex flex-col items-end gap-1">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (confirming) {
                onDelete();
              } else {
                setConfirming(true);
                setTimeout(() => setConfirming(false), 3000);
              }
            }}
            aria-label={confirming ? "Confirm delete" : "Delete brand"}
            title={confirming ? "Click again to confirm" : "Delete brand"}
            className={`w-7 h-7 flex items-center justify-center border-2 border-ink rounded-full transition-colors ${
              confirming ? "bg-pink text-ink" : "bg-white text-ink opacity-0 group-hover:opacity-100 hover:bg-pink/30"
            }`}
          >
            {confirming ? (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            )}
          </button>
          {confirming && (
            <span className="text-caption bg-white border-2 border-ink rounded-pill px-2 py-0.5 whitespace-nowrap">click again to confirm</span>
          )}
        </div>
      )}
      <button onClick={onClick} className="text-left w-full h-full relative block">
        <div className="absolute top-2 left-2 right-[-8px] bottom-[-8px] rounded-card bg-offset -z-10 group-hover:bg-pink/30 transition-colors" />
        <div className="relative bg-white border-2 border-ink rounded-card overflow-hidden h-full flex flex-col">
        {og ? (
          <div className="h-32 relative bg-offset overflow-hidden">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={og} alt="" className="w-full h-full object-cover" />
            <div className="absolute bottom-2 left-2 flex gap-1.5">
              {[c.branding?.colors?.primary, c.branding?.colors?.secondary, c.branding?.colors?.accent]
                .filter(Boolean)
                .map((hex, i) => (
                  <div key={i} className="w-5 h-5 rounded border-2 border-ink" style={{ background: hex }} />
                ))}
            </div>
          </div>
        ) : (
          <div className="h-32 relative" style={{ background: bg }}>
            <div className="absolute inset-0 flex items-center justify-center">
              {c.branding?.images?.logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={c.branding.images.logo} alt="" className="max-h-12 max-w-[60%]" />
              ) : (
                <div className="w-12 h-12 rounded-full" style={{ background: primary }} />
              )}
            </div>
            <div className="absolute bottom-2 left-2 flex gap-1.5">
              {[c.branding?.colors?.primary, c.branding?.colors?.secondary, c.branding?.colors?.accent]
                .filter(Boolean)
                .map((hex, i) => (
                  <div key={i} className="w-5 h-5 rounded border-2 border-ink" style={{ background: hex }} />
                ))}
            </div>
          </div>
        )}
        <div className="p-4 border-t-2 border-ink flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-1">
            {favicon && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={favicon} alt="" className="w-4 h-4 rounded shrink-0" />
            )}
            <p className="text-bodysm font-bold truncate">{c.copy?.brand_name || hostnameOf(c.source_url)}</p>
          </div>
          <p className="text-caption text-dark-gray truncate">{hostnameOf(c.source_url)}</p>
          {c.copy?.tagline && (
            <p className="text-caption text-dark-gray mt-2 line-clamp-2">{c.copy.tagline}</p>
          )}
          <div className="mt-auto pt-3 flex flex-wrap gap-1">
            {counts.length === 0 ? (
              <span className="text-caption text-dark-gray italic">decoded only</span>
            ) : (
              counts.map((c, i) => (
                <span key={i} className="text-caption bg-cream border border-ink rounded-pill px-2 py-0.5">{c}</span>
              ))
            )}
          </div>
        </div>
      </div>
      </button>
    </div>
  );
}

function BrandSidebar({
  history, activeIdx, onSelect, onHome,
}: {
  history: Run[];
  activeIdx: number;
  onSelect: (i: number) => void;
  onHome: () => void;
}) {
  return (
    <aside className="w-full h-full shrink-0 bg-white flex flex-col">
      <button
        onClick={onHome}
        className="m-4 px-4 py-2.5 bg-ink text-white rounded-pill text-bodysm font-medium hover:bg-dark-gray shrink-0 whitespace-nowrap"
      >
        + New brand
      </button>

      <nav className="flex-1 min-w-0 overflow-y-auto px-2 py-3 pb-3">
        <p className="text-caption uppercase tracking-widest text-dark-gray px-3 py-2">
          Library ({history.length})
        </p>
        <div>
        {history.map((run, i) => {
          const c = run.decoded;
          const primary = c.branding?.colors?.primary || "#000";
          const favicon = c.branding?.images?.favicon;
          const isActive = i === activeIdx;
          const counts = [
            run.minis?.length ? `${run.minis.length}` : null,
          ].filter(Boolean);
          return (
            <button
              key={i}
              onClick={() => onSelect(i)}
              className={`w-full shrink-0 text-left px-3 py-2.5 rounded-xl mb-1 transition-colors flex items-center gap-3 min-h-[44px] ${
                isActive ? "bg-pink/30 border-2 border-ink" : "hover:bg-offset border-2 border-transparent"
              }`}
            >
              {favicon ? (
                <div className="w-8 h-8 rounded border-2 border-ink shrink-0 bg-white flex items-center justify-center overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={favicon} alt="" className="w-5 h-5 object-contain" />
                </div>
              ) : (
                <div
                  className="w-8 h-8 rounded border-2 border-ink shrink-0"
                  style={{ background: primary }}
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-bodysm font-medium truncate">
                  {c.copy?.brand_name || hostnameOf(c.source_url)}
                </p>
                <p className="text-caption text-dark-gray truncate">{hostnameOf(c.source_url)}</p>
              </div>
              {counts.length > 0 && (
                <p className="text-caption text-dark-gray font-mono shrink-0">◇{counts.join("·")}</p>
              )}
            </button>
          );
        })}
        </div>
      </nav>
    </aside>
  );
}

function ActionRow({ children }: { children: React.ReactNode }) {
  return <div className="my-6 flex flex-wrap items-center gap-3">{children}</div>;
}

function Card({ children, featured = false, className = "" }: { children: React.ReactNode; featured?: boolean; className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <div className={`absolute top-2 left-2 right-[-8px] bottom-[-8px] rounded-card -z-10 ${featured ? "bg-pink/30" : "bg-offset"}`} />
      <div className="relative bg-white border-2 border-ink rounded-card p-6 h-full flex flex-col">{children}</div>
    </div>
  );
}

// Commercial / non-Google fonts → free Google Fonts near-equivalents.
// Anything not in this map and not in GOOGLE_FONTS is left alone (will fall back).
const FONT_SUBSTITUTES: Record<string, string> = {
  suisse: "Inter",
  "suisse int'l": "Inter",
  sohne: "Inter",
  söhne: "Inter",
  helvetica: "Inter",
  "helvetica neue": "Inter",
  arial: "Inter",
  circular: "Manrope",
  aeonik: "DM Sans",
  "gt walsheim": "Manrope",
  walsheim: "Manrope",
  "founders grotesk": "Inter",
  brown: "Manrope",
  "abc diatype": "Inter",
  "abc favorit": "Inter",
  whyte: "Manrope",
  roobert: "Inter",
  graphik: "Inter",
  tiempos: "Source Serif 4",
};

// Known Google Fonts families we can safely <link> without 404
const GOOGLE_FONTS = new Set(
  [
    "Inter", "Manrope", "DM Sans", "Geist", "Geist Mono", "Roboto", "Open Sans",
    "Lato", "Poppins", "Montserrat", "Source Sans 3", "Work Sans", "Nunito",
    "Plus Jakarta Sans", "Space Grotesk", "Outfit", "Figtree", "Albert Sans",
    "Public Sans", "IBM Plex Sans", "IBM Plex Mono", "JetBrains Mono",
    "DM Serif Display", "Source Serif 4", "Playfair Display", "Lora", "Merriweather",
  ].map((s) => s.toLowerCase())
);

function pickGoogleFont(raw: string | undefined): string | null {
  if (!raw) return null;
  // Take the first family name from "Foo, Bar, sans-serif"
  const first = raw.split(",")[0].trim().replace(/^["']|["']$/g, "").toLowerCase();
  if (FONT_SUBSTITUTES[first]) return FONT_SUBSTITUTES[first];
  if (GOOGLE_FONTS.has(first)) return raw.split(",")[0].trim().replace(/^["']|["']$/g, "");
  return null;
}

function googleFontsHref(families: string[]): string | null {
  const unique = Array.from(new Set(families.filter(Boolean)));
  if (unique.length === 0) return null;
  const params = unique.map((f) => `family=${encodeURIComponent(f)}:wght@400;500;700`).join("&");
  return `https://fonts.googleapis.com/css2?${params}&display=swap`;
}

function downloadText(filename: string, text: string, type = "text/plain") {
  const blob = new Blob([text], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(reader.error || new Error("failed to read image"));
    reader.readAsDataURL(file);
  });
}

function assetFilename(asset: Asset) {
  try {
    const url = new URL(asset.url);
    const ext = url.pathname.match(/\.(png|jpe?g|webp|gif)(?:$|\?)/i)?.[1] || "png";
    return `${asset.type || "asset"}.${ext.replace("jpeg", "jpg")}`;
  } catch {
    return `${asset.type || "asset"}.png`;
  }
}

function useGoogleFontLink(href: string | null) {
  useEffect(() => {
    if (!href) return;
    if (document.querySelector(`link[data-brand-font="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = href;
    link.dataset.brandFont = href;
    document.head.appendChild(link);
  }, [href]);
}

function useStalledProgress(active: boolean, done: boolean, stallMs = 60000) {
  const [visible, setVisible] = useState(active);
  const [progress, setProgress] = useState(active ? 8 : 0);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!active) return;
    setVisible(true);
    setProgress(8);
    setElapsed(0);
    const tickMs = 500;
    const increment = (88 - 8) / (stallMs / tickMs);
    const id = window.setInterval(() => {
      setElapsed((value) => value + tickMs);
      setProgress((value) => {
        if (value >= 87.8) return 87.8;
        return Math.min(88, Number((value + increment).toFixed(2)));
      });
    }, tickMs);
    return () => window.clearInterval(id);
  }, [active, stallMs]);

  useEffect(() => {
    if (!done || !visible) return;
    setProgress(100);
    const id = window.setTimeout(() => setVisible(false), 450);
    return () => window.clearTimeout(id);
  }, [done, visible]);

  return { visible, progress, elapsed };
}

function ArtifactLoadingBar({ title, progress, elapsed }: { title: string; progress: number; elapsed: number }) {
  const seconds = Math.max(0, Math.floor(elapsed / 1000));
  const label = progress < 100
    ? seconds >= 90
      ? `still generating (${Math.floor(seconds / 60)}m ${seconds % 60}s)`
      : `generating (${seconds}s)`
    : "ready";

  return (
    <div className="rounded-card border-2 border-ink bg-white p-4">
      <div className="mb-3 flex items-center justify-between gap-4">
        <p className="text-caption uppercase tracking-widest text-dark-gray">{title}</p>
        <p className="text-caption text-dark-gray">{label}</p>
      </div>
      <div className="h-3 overflow-hidden rounded-pill border-2 border-ink bg-cream">
        <div
          className="h-full progress-fill transition-[width] duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function useCyclingLabel(active: boolean, labels: string[]) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (!active || labels.length <= 1) return;
    setIndex(0);
    const id = window.setInterval(() => {
      setIndex((value) => (value + 1) % labels.length);
    }, 1400);
    return () => window.clearInterval(id);
  }, [active, labels.length]);

  return labels[index] || labels[0] || "Preparing";
}

function Step1View({
  decoded,
  designed,
  designPending,
  indexCss,
  indexCssPending,
}: {
  decoded: Decoded;
  designed?: Designed;
  designPending?: boolean;
  indexCss?: string;
  indexCssPending?: boolean;
}) {
  const b = decoded.branding || {};
  const c = decoded.copy || {};
  const colors = b.colors || {};
  const components = b.components || {};
  const rawHeading = b.typography?.fontFamilies?.heading || b.fonts?.[0]?.family;
  const rawBody = b.typography?.fontFamilies?.primary || b.fonts?.[0]?.family;

  const headingFontName = pickGoogleFont(rawHeading) || "Inter";
  const bodyFontName = pickGoogleFont(rawBody) || "Inter";
  const headingFont = '"' + headingFontName + '", system-ui, sans-serif';
  const bodyFont = '"' + bodyFontName + '", system-ui, sans-serif';
  useGoogleFontLink(googleFontsHref([headingFontName, bodyFontName]));

  const colorEntries = Object.entries(colors).filter(([, value]) => Boolean(value)).slice(0, 6);
  const primary = colors.primary || colorEntries[0]?.[1] || "#000000";
  const secondary = colors.secondary || colors.background || "#ffffff";
  const brandName = c.brand_name || hostnameOf(decoded.source_url);
  const designProgress = useStalledProgress(Boolean(designPending && !designed?.design_md), Boolean(designed?.design_md));
  const indexCssProgress = useStalledProgress(Boolean(indexCssPending && !indexCss), Boolean(indexCss));

  return (
    <section className="relative mx-auto min-h-[calc(100dvh-120px)] max-w-6xl px-4 py-10 md:px-8 md:py-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px] lg:items-start">
        <div className="min-w-0">
          <div className="mb-8 flex items-center gap-4">
            {b.images?.favicon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={b.images.favicon} alt="" className="h-10 w-10 rounded border-2 border-ink bg-white p-1" />
            ) : (
              <div className="h-10 w-10 rounded border-2 border-ink" style={{ background: primary }} />
            )}
            <div>
              <p className="text-caption uppercase tracking-widest text-dark-gray">Brand context</p>
              <h2 className="text-large font-bold leading-tight">{brandName}</h2>
            </div>
          </div>

          {c.hero_headline && (
            <h1 className="max-w-4xl text-h2 font-bold leading-[1.02] md:text-h1" style={{ fontFamily: headingFont }}>
              {c.hero_headline}
            </h1>
          )}
          {c.hero_subheadline && (
            <p className="mt-5 max-w-3xl text-bodyxl leading-relaxed text-dark-gray" style={{ fontFamily: bodyFont }}>
              {c.hero_subheadline}
            </p>
          )}

          {c.three_bullets?.length ? (
            <div className="mt-8 flex max-w-4xl flex-col gap-3 border-y-2 border-ink py-5 md:flex-row md:gap-6">
              {c.three_bullets.slice(0, 3).map((bullet) => (
                <p key={bullet} className="flex-1 text-bodysm leading-snug text-dark-gray">{bullet}</p>
              ))}
            </div>
          ) : null}
        </div>

        <aside className="space-y-6">
          {b.images?.logo && (
            <div>
              <p className="mb-2 text-caption uppercase tracking-widest text-dark-gray">Logo</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={b.images.logo} alt="logo" className="max-h-16 max-w-full" />
            </div>
          )}
          <div>
            <p className="mb-2 text-caption uppercase tracking-widest text-dark-gray">Palette</p>
            <div className="flex flex-wrap gap-2">
              {colorEntries.map(([name, value]) => (
                <div key={name} title={name + ' ' + value} className="h-9 w-9 rounded-full border-2 border-ink" style={{ background: value }} />
              ))}
            </div>
          </div>
          <div>
            <p className="mb-2 text-caption uppercase tracking-widest text-dark-gray">Type</p>
            <p className="text-body font-medium">{headingFontName}</p>
            {bodyFontName !== headingFontName && <p className="text-bodysm text-dark-gray">{bodyFontName}</p>}
          </div>
          <div>
            <p className="mb-2 text-caption uppercase tracking-widest text-dark-gray">Surface</p>
            <div className="h-24 rounded-card border-2 border-ink" style={{ background: secondary }} />
          </div>
        </aside>
      </div>

      <div className="mt-12 grid gap-4 md:grid-cols-3">
        {components.buttonPrimary && (
          <button
            style={{
              background: components.buttonPrimary.background,
              color: components.buttonPrimary.textColor,
              borderRadius: components.buttonPrimary.borderRadius,
            }}
            className="px-5 py-3 text-body font-medium"
          >
            {c.primary_cta || "Primary"}
          </button>
        )}
        {c.tone?.length ? (
          <p className="text-bodysm text-dark-gray md:col-span-2">{c.tone.join(" · ")}</p>
        ) : null}
      </div>

      <div className="mt-14 space-y-3 border-t-2 border-ink pt-5">
        {designProgress.visible && (
          <ArtifactLoadingBar title="design.md" progress={designProgress.progress} elapsed={designProgress.elapsed} />
        )}
        {designed?.design_md && (
          <details>
            <summary className="flex cursor-pointer items-center justify-between gap-3 text-caption uppercase tracking-widest text-dark-gray">
              <span>design.md</span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(designed.design_md); }}
                  aria-label="Copy design.md"
                  title="Copy"
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white hover:bg-cream"
                >
                  <Icon name="copy" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); downloadText("design.md", designed.design_md, "text/markdown"); }}
                  aria-label="Download design.md"
                  title="Download"
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white hover:bg-cream"
                >
                  <Icon name="download" />
                </button>
              </span>
            </summary>
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-card border-2 border-ink bg-white p-4 text-caption">{designed.design_md}</pre>
          </details>
        )}
        {indexCssProgress.visible && (
          <ArtifactLoadingBar title="index.css" progress={indexCssProgress.progress} elapsed={indexCssProgress.elapsed} />
        )}
        <details>
          <summary className="flex cursor-pointer items-center justify-between gap-3 text-caption uppercase tracking-widest text-dark-gray">
            <span>
              index.css {indexCss ? '(' + (indexCss.length / 1024).toFixed(1) + 'KB)' : indexCssPending ? "writing..." : "pending"}
            </span>
            {indexCss && (
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); navigator.clipboard.writeText(indexCss); }}
                  aria-label="Copy index.css"
                  title="Copy"
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white hover:bg-cream"
                >
                  <Icon name="copy" />
                </button>
                <button
                  type="button"
                  onClick={(e) => { e.preventDefault(); downloadText("index.css", indexCss, "text/css"); }}
                  aria-label="Download index.css"
                  title="Download"
                  className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white hover:bg-cream"
                >
                  <Icon name="download" />
                </button>
              </span>
            )}
          </summary>
          {indexCss ? (
            <pre className="mt-3 max-h-80 overflow-auto whitespace-pre-wrap rounded-card border-2 border-ink bg-white p-4 text-caption">{indexCss}</pre>
          ) : indexCssPending ? (
            <p className="mt-3 text-bodysm text-dark-gray">Writing index.css.</p>
          ) : (
            <p className="mt-3 text-bodysm text-dark-gray">Waiting on design.md.</p>
          )}
        </details>
      </div>
      {b.images?.ogImage && (
        <div className="pointer-events-none fixed bottom-6 right-6 hidden w-56 overflow-hidden rounded-card border-2 border-ink bg-white shadow-[6px_6px_0_0_rgba(255,144,232,0.28)] lg:block">
          <p className="px-3 py-2 text-caption uppercase tracking-widest text-dark-gray">OG</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={b.images.ogImage} alt="" className="aspect-video w-full object-cover" />
        </div>
      )}
    </section>
  );
}

function BrandWorkspace({
  run, designing, genAssets, onGenDesign, onGenAssets, onUpdateRun, tab,
}: {
  run: Run;
  designing: boolean;
  genAssets: boolean;
  onGenDesign: () => void;
  onGenAssets: (prompt?: string, generationContext?: GenerationContext) => Promise<void> | void;
  onUpdateRun: (patch: Partial<Run>) => void;
  tab: "brand" | "studio";
}) {
  const [indexCssPending, setIndexCssPending] = useState(false);
  const designRequestedFor = useRef<string | null>(null);

  // Auto-fire design.md generation in the background once per brand open.
  useEffect(() => {
    const runId = brandRunId(run.decoded);
    if (run.designed || designing || designRequestedFor.current === runId) return;
    designRequestedFor.current = runId;
    onGenDesign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandRunId(run.decoded)]);

  // Once design.md is ready (and we don't already have it), auto-generate the brand index.css.
  useEffect(() => {
    if (!run.designed?.design_md || run.indexCss || indexCssPending) return;
    const b = run.decoded.branding || {};
    const c = run.decoded.copy || {};
    const tokens = {
      primary: b.colors?.primary,
      secondary: b.colors?.secondary,
      accent: b.colors?.accent,
      background: b.colors?.background,
      textPrimary: b.colors?.textPrimary,
      link: b.colors?.link,
      headingFont: b.typography?.fontFamilies?.heading || b.fonts?.[0]?.family,
      bodyFont: b.typography?.fontFamilies?.primary || b.fonts?.[0]?.family,
      borderRadius: b.spacing?.borderRadius,
      brandName: c.brand_name,
    };
    setIndexCssPending(true);
    fetch("/api/index-css", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ design_md: run.designed.design_md, tokens }),
    })
      .then(async (res) => {
        const j = await res.json();
        if (!res.ok || !j.css) return;
        const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Run[];
        const i = all.findIndex((r) => brandRunId(r.decoded) === brandRunId(run.decoded));
        if (i >= 0) {
          all[i] = { ...all[i], indexCss: j.css };
          localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
          window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
        }
      })
      .catch(() => {})
      .finally(() => setIndexCssPending(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [run.designed?.design_md, run.indexCss, brandRunId(run.decoded)]);

  return (
    <div>
      {tab === "studio" && (
        <StudioTab
          run={run}
          designing={designing}
          generatingAssets={genAssets}
          onGenerateAssets={onGenAssets}
          onUpdateRun={onUpdateRun}
        />
      )}
      {tab === "brand"  && (
        <Step1View
          decoded={run.decoded}
          designed={run.designed}
          designPending={designing}
          indexCss={run.indexCss}
          indexCssPending={indexCssPending}
        />
      )}
    </div>
  );
}

function AssetGenerationCard({ labels }: { labels: string[] }) {
  const progress = useStalledProgress(true, false);
  const label = useCyclingLabel(true, labels);

  return (
    <div className="flex h-full min-h-[210px] flex-col justify-between rounded-card bg-white">
      <div>
        <p className="text-caption uppercase tracking-widest text-dark-gray">Generating image</p>
        <p className="mt-3 text-large font-bold leading-tight">{label}</p>
      </div>
      <div>
        <div className="mb-3 flex items-center justify-between text-caption text-dark-gray">
          <span>Composing asset</span>
          <span>{progress.progress}%</span>
        </div>
        <div className="h-3 overflow-hidden rounded-pill border-2 border-ink bg-cream">
          <div
            className="h-full progress-fill transition-[width] duration-500 ease-out"
            style={{ width: `${progress.progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}

function AssetsTab({
  run,
  generatingAssets,
  onGenerateAssets,
  onUpdateRun,
}: {
  run: Run;
  generatingAssets: boolean;
  onGenerateAssets: (prompt?: string, generationContext?: GenerationContext) => Promise<void> | void;
  onUpdateRun: (patch: Partial<Run>) => void;
}) {
  const b = run.decoded.branding || {};
  const c = run.decoded.copy || {};
  const [imagePrompt, setImagePrompt] = useState(
    "Create one premium brand image that matches the logo mark and homepage screenshot first. Use the OG image only as secondary inspiration.",
  );
  const [previewAsset, setPreviewAsset] = useState<Asset | null>(null);
  const [dragging, setDragging] = useState<null | { id: string; dx: number; dy: number }>(null);
  const allAssets = run.assets?.assets || [];
  const brandName = c.brand_name || hostnameOf(run.decoded.source_url);
  const canvases = run.assetCanvases?.length
    ? [{ ...run.assetCanvases[0], name: "Canvas" }]
    : [{ id: "default", name: "Canvas", assetUrls: allAssets.map((asset) => asset.url), positions: run.assetCanvas || {} }];
  const activeCanvasId = run.activeCanvasId || canvases[0].id;
  const activeCanvas = canvases.find((canvas) => canvas.id === activeCanvasId) || canvases[0];
  const positions = activeCanvas.positions || {};
  const zoom = activeCanvas.zoom || 1;
  const view = activeCanvas.view || "canvas";
  const assets = activeCanvas.assetUrls
    ? activeCanvas.assetUrls
        .map((url) => allAssets.find((asset) => asset.url === url))
        .filter((asset): asset is Asset => Boolean(asset))
    : allAssets;
  const canvasWidth = Math.max(1400, 520 + assets.length * 340);
  const canvasHeight = Math.max(860, 620 + Math.ceil(assets.length / 3) * 220);
  const colorCount = Object.values(b.colors || {}).filter(Boolean).length;
  const assetContextLabels = [
    `Reading ${hostnameOf(run.decoded.source_url)}`,
    b.images?.logo ? `Using ${brandName} logo` : `Finding ${brandName} identity`,
    colorCount ? `Applying ${colorCount} colors` : "Applying brand colors",
    run.designed?.design_md ? "Using design.md" : "Waiting for design.md",
    run.indexCss ? "Using index.css" : "Preparing CSS",
    imagePrompt.trim() ? "Shaping image prompt" : "Preparing image prompt",
  ];

  function defaultPosition(index: number) {
    const col = index % 3;
    const row = Math.floor(index / 3);
    return {
      x: 420 + col * 330 + (row % 2) * 70,
      y: 120 + row * 310 + (col % 2) * 48,
    };
  }

  function savePosition(id: string, x: number, y: number) {
    const next = canvases.map((canvas) =>
      canvas.id === activeCanvas.id
        ? { ...canvas, positions: { ...(canvas.positions || {}), [id]: { x, y } } }
        : canvas
    );
    onUpdateRun({ assetCanvases: next, activeCanvasId: activeCanvas.id, assetCanvas: next.find((canvas) => canvas.id === activeCanvas.id)?.positions });
  }

  function saveZoom(nextZoom: number) {
    const next = canvases.map((canvas) =>
      canvas.id === activeCanvas.id ? { ...canvas, zoom: nextZoom } : canvas
    );
    onUpdateRun({ assetCanvases: next, activeCanvasId: activeCanvas.id, assetCanvas: activeCanvas.positions || {} });
  }

  function saveView(nextView: "canvas" | "tiles") {
    const next = canvases.map((canvas) =>
      canvas.id === activeCanvas.id ? { ...canvas, view: nextView } : canvas
    );
    onUpdateRun({ assetCanvases: next, activeCanvasId: activeCanvas.id, assetCanvas: activeCanvas.positions || {} });
  }

  function autoOrganize() {
    const next: Record<string, { x: number; y: number }> = {};
    assets.forEach((asset, index) => {
      next[asset.url] = defaultPosition(index);
    });
    const updated = canvases.map((canvas) => canvas.id === activeCanvas.id ? { ...canvas, positions: next } : canvas);
    onUpdateRun({ assetCanvases: updated, activeCanvasId: activeCanvas.id, assetCanvas: next });
  }

  return (
    <section className="relative h-[calc(100dvh-96px)] overflow-hidden bg-cream">
      <div className="absolute right-4 top-4 z-10 md:right-8">
          <div className="flex shrink-0 rounded-pill border-2 border-ink bg-white p-0.5">
            <button
              type="button"
              onClick={() => saveView("canvas")}
              title="Canvas view"
              aria-label="Canvas view"
              className={`h-7 w-8 rounded-full text-caption ${view === "canvas" ? "bg-ink text-white" : "text-ink hover:bg-cream"}`}
            >
              ◫
            </button>
            <button
              type="button"
              onClick={() => saveView("tiles")}
              title="Tile view"
              aria-label="Tile view"
              className={`h-7 w-8 rounded-full text-caption ${view === "tiles" ? "bg-ink text-white" : "text-ink hover:bg-cream"}`}
            >
              ▦
            </button>
          </div>
      </div>

      {view === "tiles" ? (
        <div className="h-full overflow-auto px-4 pb-32 pt-20 md:px-8">
          <div className="mx-auto grid max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {generatingAssets && (
              <AssetGenerationCard labels={assetContextLabels} />
            )}
            {assets.map((asset) => (
              <div key={asset.url} className="group">
                <button
                  type="button"
                  onClick={() => setPreviewAsset(asset)}
                  className="block w-full overflow-hidden rounded-card border-2 border-ink bg-white text-left shadow-[6px_6px_0_0_rgba(255,144,232,0.22)] transition-transform hover:-translate-y-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.type} className="aspect-video w-full rounded object-cover" />
                </button>
                <div className="mt-2 flex items-center gap-2">
                  <button onClick={() => setPreviewAsset(asset)} className="rounded-pill bg-ink px-3 py-1 text-caption text-white">Open</button>
                  <button onClick={() => navigator.clipboard.writeText(asset.prompt || asset.url)} className="rounded-pill border-2 border-ink bg-white px-3 py-1 text-caption">Copy prompt</button>
                  <a href={asset.url} download={assetFilename(asset)} className="rounded-pill border-2 border-ink bg-white px-3 py-1 text-caption">Download</a>
                </div>
              </div>
            ))}
            {!generatingAssets && assets.length === 0 && (
              <div className="rounded-card border-2 border-ink bg-white p-6">
                <p className="text-bodysm text-dark-gray">Start with one image.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div
        className="h-full overflow-auto pb-32 pt-16"
        onWheel={(e) => {
          if (!e.metaKey && !e.ctrlKey) return;
          e.preventDefault();
          const rect = e.currentTarget.getBoundingClientRect();
          const cursorX = (e.clientX - rect.left + e.currentTarget.scrollLeft) / zoom;
          const cursorY = (e.clientY - rect.top + e.currentTarget.scrollTop) / zoom;
          const direction = e.deltaY > 0 ? -1 : 1;
          const nextZoom = Math.min(2.2, Math.max(0.35, Number((zoom + direction * 0.08).toFixed(2))));
          saveZoom(nextZoom);
          e.currentTarget.scrollLeft = cursorX * nextZoom - (e.clientX - rect.left);
          e.currentTarget.scrollTop = cursorY * nextZoom - (e.clientY - rect.top);
        }}
        onMouseMove={(e) => {
          if (!dragging) return;
          const rect = e.currentTarget.getBoundingClientRect();
          savePosition(
            dragging.id,
            (e.clientX - rect.left + e.currentTarget.scrollLeft) / zoom - dragging.dx,
            (e.clientY - rect.top + e.currentTarget.scrollTop) / zoom - dragging.dy,
          );
        }}
        onMouseUp={() => setDragging(null)}
        onMouseLeave={() => setDragging(null)}
      >
        <div
          className="absolute right-4 top-28 z-10 rounded-pill border-2 border-ink bg-white px-3 py-1 text-caption uppercase tracking-widest"
        >
          {Math.round(zoom * 100)}%
        </div>
        <div
          className="relative mx-auto"
          style={{ width: canvasWidth * zoom, height: canvasHeight * zoom }}
        >
        <div
          className="relative origin-top-left"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            transform: `scale(${zoom})`,
            backgroundImage: "radial-gradient(rgba(0,0,0,0.16) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {generatingAssets && (
            <div className="absolute rounded-card border-2 border-ink bg-white p-5" style={{ left: 420, top: 140, width: 420, height: 250 }}>
              <AssetGenerationCard labels={assetContextLabels} />
            </div>
          )}

          {assets.map((asset, index) => {
            const fallback = defaultPosition(index);
            const left = positions[asset.url]?.x ?? fallback.x;
            const top = positions[asset.url]?.y ?? fallback.y;
            const width = asset.width > asset.height ? 380 : 260;
            return (
              <div
                key={asset.url}
                className="absolute group cursor-grab active:cursor-grabbing"
                style={{ left, top, width }}
                onMouseDown={(e) => {
                  const target = e.target as HTMLElement;
                  if (target.closest("button[data-action]")) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  setDragging({ id: asset.url, dx: (e.clientX - rect.left) / zoom, dy: (e.clientY - rect.top) / zoom });
                }}
              >
                <button
                  onClick={() => { if (!dragging) setPreviewAsset(asset); }}
                  className="block w-full overflow-hidden rounded-card border-2 border-ink bg-white text-left shadow-[6px_6px_0_0_rgba(255,144,232,0.28)] transition-transform hover:-translate-y-1"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.type} className="w-full rounded object-cover" />
                </button>
                <div className="mt-2 flex items-center gap-2 opacity-0 transition-opacity group-hover:opacity-100">
                  <button data-action onClick={() => setPreviewAsset(asset)} className="rounded-pill bg-ink px-3 py-1 text-caption text-white">Open</button>
                  <button data-action onClick={() => navigator.clipboard.writeText(asset.prompt || asset.url)} className="rounded-pill border-2 border-ink bg-white px-3 py-1 text-caption">Copy prompt</button>
                  <a data-action href={asset.url} download={assetFilename(asset)} className="rounded-pill border-2 border-ink bg-white px-3 py-1 text-caption">Download</a>
                </div>
              </div>
            );
          })}

          {!generatingAssets && assets.length === 0 && (
            <div className="absolute left-[420px] top-[140px] w-80 rounded-card border-2 border-ink bg-white p-6">
              <p className="text-bodysm text-dark-gray">Start with one image.</p>
            </div>
          )}
        </div>
        </div>
      </div>
      )}

      <div className="absolute bottom-4 left-4 right-4 z-20 md:bottom-6">
        <div className="mx-auto flex max-w-4xl items-center gap-2 rounded-pill border-2 border-ink bg-white p-2 shadow-[6px_6px_0_0_rgba(255,144,232,0.35)]">
          <button
            type="button"
            onClick={autoOrganize}
            title="Organize"
            aria-label="Organize canvas"
            className="h-10 w-10 shrink-0 rounded-full border-2 border-ink bg-cream text-bodysm font-medium hover:bg-white"
          >
            ↟
          </button>
          <input
            value={imagePrompt}
            onChange={(e) => setImagePrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && onGenerateAssets(imagePrompt)}
            placeholder="Generate an image..."
            className="min-w-0 flex-1 bg-transparent px-4 py-2 text-bodysm outline-none md:text-body"
          />
          <button
            onClick={() => onGenerateAssets(imagePrompt)}
            disabled={generatingAssets || !imagePrompt.trim()}
            className="h-10 shrink-0 rounded-full bg-ink px-4 text-bodysm font-medium text-white hover:bg-dark-gray disabled:opacity-50 md:px-5"
          >
            {generatingAssets ? "Making" : "Generate"}
          </button>
        </div>
      </div>

      {previewAsset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/75 p-4">
          <button type="button" aria-label="Close image preview" className="absolute inset-0" onClick={() => setPreviewAsset(null)} />
          <div className="relative z-10 max-h-[92dvh] w-full max-w-5xl rounded-card border-2 border-ink bg-white p-4 shadow-[10px_10px_0_0_rgba(255,144,232,0.45)]">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-caption uppercase tracking-widest text-dark-gray">{previewAsset.width}x{previewAsset.height}</p>
              <button type="button" onClick={() => setPreviewAsset(null)} className="h-9 w-9 rounded-full border-2 border-ink bg-cream text-body hover:bg-white" aria-label="Close">x</button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={previewAsset.url} alt={previewAsset.type} className="max-h-[70dvh] w-full rounded-card object-contain bg-cream" />
            <div className="mt-3 flex flex-wrap gap-2">
              <a href={previewAsset.url} target="_blank" rel="noreferrer" className="text-bodysm bg-ink text-white px-4 py-1.5 rounded-pill">Open in new tab</a>
              <a href={previewAsset.url} download={assetFilename(previewAsset)} className="text-bodysm bg-white border-2 border-ink text-ink px-4 py-1.5 rounded-pill">Download</a>
              <button onClick={() => navigator.clipboard.writeText(previewAsset.prompt || previewAsset.url)} className="text-bodysm bg-white border-2 border-ink text-ink px-4 py-1.5 rounded-pill">Copy prompt</button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}

function StudioTab({
  run,
  designing,
  generatingAssets,
  onGenerateAssets,
  onUpdateRun,
}: {
  run: Run;
  designing: boolean;
  generatingAssets: boolean;
  onGenerateAssets: (prompt?: string, generationContext?: GenerationContext) => Promise<void> | void;
  onUpdateRun: (patch: Partial<Run>) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [viewer, setViewer] = useState<ViewerInfo | null>(null);
  const [studioView, setStudioView] = useState<"canvas" | "preview">("canvas");
  const [createMode, setCreateMode] = useState<CreateMode>("html");
  const [modeFlyoutOpen, setModeFlyoutOpen] = useState(false);
  const [expandedMini, setExpandedMini] = useState<MiniAsset | null>(null);
  const [expandedAsset, setExpandedAsset] = useState<Asset | null>(null);
  const [pendingImages, setPendingImages] = useState<PendingImage[]>([]);
  const [pendingHtml, setPendingHtml] = useState<PendingHtml[]>([]);
  const [referenceImages, setReferenceImages] = useState<ReferenceImage[]>([]);
  const [referenceHtml, setReferenceHtml] = useState<ReferenceHtml[]>([]);
  const [copied, setCopied] = useState<null | "html" | "agent">(null);
  const visualAssets = run.assets?.assets || [];
  const studioBrand = run.decoded.branding || {};
  const studioCopy = run.decoded.copy || {};
  const studioColors = Object.values(studioBrand.colors || {}).filter((value): value is string => Boolean(value)).slice(0, 6);
  const studioImages = [
    studioBrand.images?.logo ? { url: studioBrand.images.logo, label: "Logo" } : null,
    studioBrand.images?.ogImage ? { url: studioBrand.images.ogImage, label: "OG image" } : null,
    ...referenceImages.map((image) => ({ url: image.assetUrl || image.url, label: image.name })),
  ].filter((image): image is { url: string; label: string } => Boolean(image)).slice(0, 5);
  const generationLoadingContext: GenerationLoadingContext = {
    labels: [
      `Reading ${hostnameOf(run.decoded.source_url)}`,
      studioBrand.images?.logo ? `Using ${studioCopy.brand_name || "brand"} logo` : `Finding ${studioCopy.brand_name || "brand"} identity`,
      studioColors.length ? `Applying ${studioColors.length} brand colors` : "Applying brand colors",
      run.designed?.design_md ? "Using design.md" : "Waiting for design.md",
      run.indexCss ? "Using index.css" : "Preparing index.css",
      referenceImages.length ? `Using ${referenceImages.length} image reference${referenceImages.length === 1 ? "" : "s"}` : "Checking image references",
      referenceHtml.length ? `Using ${referenceHtml.length} HTML reference${referenceHtml.length === 1 ? "" : "s"}` : "Checking HTML references",
      "Shaping image prompt",
    ],
    colors: studioColors,
    images: studioImages,
  };
  const creating = streaming;
  const promptLines = useMemo(() => splitPrompts(prompt), [prompt]);
  function flash(kind: "html" | "agent") {
    setCopied(kind);
    setTimeout(() => setCopied(null), 1200);
  }
  function copyForAgent() {
    if (!viewer) return;
    const text = viewer.item.kind === "html"
      ? wrapSnippet(viewer.item.mini.html, run.indexCss)
      : [
          `Image: ${viewer.item.asset.url}`,
          viewer.item.asset.prompt ? `Prompt: ${viewer.item.asset.prompt}` : "",
          `Type: ${viewer.item.asset.type}`,
        ].filter(Boolean).join("\n");
    navigator.clipboard.writeText(text);
    flash("agent");
  }
  const livePreviewRef = useRef<HTMLIFrameElement>(null);
  const promptInputRef = useRef<HTMLTextAreaElement>(null);
  const accumulatedRef = useRef("");
  const rafPendingRef = useRef(false);
  const submitLockRef = useRef(false);

  function pinPromptScroll() {
    requestAnimationFrame(() => {
      if (promptInputRef.current) promptInputRef.current.scrollTop = 0;
    });
  }

  function editPrompt(nextPrompt: string, mode: "html" | "image") {
    setPrompt(nextPrompt);
    setCreateMode(mode);
    setModeFlyoutOpen(false);
    setStudioView("canvas");
    requestAnimationFrame(() => {
      promptInputRef.current?.focus();
      if (promptInputRef.current) promptInputRef.current.scrollTop = 0;
    });
  }

  function addReferenceImage(image: Omit<ReferenceImage, "id">) {
    setReferenceImages((images) => {
      if (images.some((existing) => existing.url === image.url)) return images;
      return [{ ...image, id: crypto.randomUUID() }, ...images].slice(0, 6);
    });
    setCreateMode("html");
    setModeFlyoutOpen(false);
    requestAnimationFrame(() => promptInputRef.current?.focus());
  }

  function addReferenceHtml(mini: MiniAsset) {
    addReferenceHtmlValue({
      id: crypto.randomUUID(),
      miniId: mini.id,
      name: mini.prompt || "HTML context",
      prompt: mini.prompt,
      html: mini.html,
    });
  }

  function addReferenceHtmlValue(reference: ReferenceHtml) {
    setReferenceHtml((items) => {
      if (items.some((item) => item.miniId === reference.miniId)) return items;
      return [reference, ...items].slice(0, 6);
    });
    setCreateMode("html");
    setModeFlyoutOpen(false);
    requestAnimationFrame(() => promptInputRef.current?.focus());
  }

  function currentGenerationContext(): GenerationContext {
    const b = run.decoded.branding || {};
    const brandImages = [
      b.images?.ogImage ? { url: b.images.ogImage, asset_url: b.images.ogImage, name: "Extracted OG image" } : null,
      b.images?.logo ? { url: b.images.logo, asset_url: b.images.logo, name: "Extracted logo" } : null,
      b.images?.favicon ? { url: b.images.favicon, asset_url: b.images.favicon, name: "Extracted favicon" } : null,
    ].filter((image): image is { url: string; asset_url: string; name: string } => Boolean(image));
    const selectedImages = referenceImages.map(({ url, assetUrl, name }) => ({ url, asset_url: assetUrl || url, name }));
    const seen = new Set<string>();
    const referenceImagePayload = [...brandImages, ...selectedImages].filter((image) => {
      if (seen.has(image.url)) return false;
      seen.add(image.url);
      return true;
    }).slice(0, 6);
    return {
      referenceImages: referenceImagePayload,
      referenceHtml: referenceHtml.map(({ name, prompt, html }) => ({ name, prompt, html })),
    };
  }

  function clearContextStack() {
    setReferenceImages([]);
    setReferenceHtml([]);
    requestAnimationFrame(() => promptInputRef.current?.focus());
  }

  function addViewerToContext() {
    if (!viewer) return;
    if (viewer.item.kind === "image") {
      const asset = viewer.item.asset;
      addReferenceImage({ url: asset.url, assetUrl: asset.url, name: asset.type === "custom" ? "Generated image" : asset.type, source: "asset" });
      return;
    }
    addReferenceHtml(viewer.item.mini);
  }

  async function addDroppedFiles(files: FileList | File[]) {
    const incomingFiles = Array.from(files);
    const imageFiles = incomingFiles.filter((file) => file.type.startsWith("image/")).slice(0, 6);
    for (const file of imageFiles) {
      const url = await fileToDataUrl(file);
      addReferenceImage({ url, name: file.name || "Dropped image", source: "drop" });
    }
    const htmlFiles = incomingFiles
      .filter((file) => file.type === "text/html" || file.name.toLowerCase().endsWith(".html"))
      .slice(0, 6);
    for (const file of htmlFiles) {
      const html = await file.text();
      addReferenceHtmlValue({
        id: crypto.randomUUID(),
        miniId: `drop-${file.name}-${file.size}-${file.lastModified}`,
        name: file.name || "Dropped HTML",
        prompt: file.name || "Dropped HTML",
        html,
      });
    }
  }

  function flushCount() {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      setCharCount(accumulatedRef.current.length);
    });
  }

  function splitPrompts(value: string) {
    return value
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
  }

  function studioTokens() {
    const b = run.decoded.branding || {};
    const c = run.decoded.copy || {};
    return {
      tokens: {
        primary: b.colors?.primary,
        secondary: b.colors?.secondary,
        accent: b.colors?.accent,
        background: b.colors?.background,
        textPrimary: b.colors?.textPrimary,
        link: b.colors?.link,
        headingFont: b.typography?.fontFamilies?.heading || b.fonts?.[0]?.family,
        bodyFont: b.typography?.fontFamilies?.primary || b.fonts?.[0]?.family,
        borderRadius: b.spacing?.borderRadius,
        brandName: c.brand_name,
      },
      assets: {
        logo_url: b.images?.logo,
        favicon_url: b.images?.favicon,
        og_url: b.images?.ogImage,
      },
    };
  }

  async function collectMini(p: string): Promise<MiniAsset> {
    const context = studioTokens();
    const res = await fetch("/api/mini-asset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        prompt: p,
        design_md: run.designed?.design_md || "",
        index_css: run.indexCss || "",
        tokens: context.tokens,
        assets: context.assets,
        reference_images: currentGenerationContext().referenceImages,
        reference_html: currentGenerationContext().referenceHtml,
      }),
    });
    if (!res.ok || !res.body) {
      const j = await res.json().catch(() => ({}));
      throw new Error(j.error || `kimi stream failed (${res.status})`);
    }
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let html = "";
    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      while ((idx = buffer.indexOf("\n\n")) !== -1) {
        const evt = buffer.slice(0, idx);
        buffer = buffer.slice(idx + 2);
        for (const line of evt.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const payload = line.slice(6).trim();
          if (payload === "[DONE]") continue;
          try {
            const json = JSON.parse(payload);
            const delta = json.choices?.[0]?.delta?.content;
            if (delta) html += delta;
          } catch {}
        }
      }
    }
    return {
      id: crypto.randomUUID(),
      prompt: p,
      html: html.replace(/^```html\n?/, "").replace(/\n?```$/, ""),
      createdAt: Date.now(),
    };
  }

  async function generateMany(prompts: string[]) {
    if (prompts.length === 0 || streaming) return;
    if (prompts.length === 1) return generate(prompts[0]);
    setError(null);
    const pending = prompts.map((p) => ({ id: crypto.randomUUID(), prompt: p, createdAt: Date.now() }));
    setPendingHtml((items) => [...pending, ...items]);
    setStreaming(true);
    setCharCount(0);
    accumulatedRef.current = "";
    try {
      const minis = await Promise.all(prompts.map((p) => collectMini(p)));
      const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Run[];
      const i = all.findIndex((r) => brandRunId(r.decoded) === brandRunId(run.decoded));
      if (i >= 0) {
        all[i] = { ...all[i], minis: [...minis, ...(all[i].minis || [])] };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
        window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
      }
      setPrompt("");
      setStudioView("canvas");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingHtml((items) => items.filter((item) => !pending.some((pendingItem) => pendingItem.id === item.id)));
      setStreaming(false);
    }
  }

  async function generateMixed(prompts: string[]) {
    if (prompts.length === 0 || streaming) return;
    setError(null);
    const pending = prompts.map((p) => ({ id: crypto.randomUUID(), prompt: p, createdAt: Date.now() }));
    setPendingHtml((items) => [...pending, ...items]);
    setStreaming(true);
    setCharCount(0);
    accumulatedRef.current = "";
    queueImageGenerations(prompts);
    try {
      const minis = await Promise.all(prompts.map((p) => collectMini(p)));
      const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Run[];
      const i = all.findIndex((r) => brandRunId(r.decoded) === brandRunId(run.decoded));
      if (i >= 0) {
        all[i] = { ...all[i], minis: [...minis, ...(all[i].minis || [])] };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
        window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
      }
      setPrompt("");
      setStudioView("canvas");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setPendingHtml((items) => items.filter((item) => !pending.some((pendingItem) => pendingItem.id === item.id)));
      setStreaming(false);
    }
  }

  function queueImageGenerations(prompts: string[]) {
    if (!prompts.length) {
      submitLockRef.current = false;
      return;
    }
    setError(null);
    setPrompt("");
    setStudioView("canvas");
    const pending = prompts.map((p) => ({ id: crypto.randomUUID(), prompt: p, createdAt: Date.now() }));
    setPendingImages((items) => [...pending, ...items]);
    for (const item of pending) {
      Promise.resolve(onGenerateAssets(item.prompt, currentGenerationContext()))
        .catch((err) => setError(err instanceof Error ? err.message : String(err)))
        .finally(() => {
          setPendingImages((items) => items.filter((pendingItem) => pendingItem.id !== item.id));
        });
    }
  }

  async function runPrompts() {
    if (submitLockRef.current) return;
    submitLockRef.current = true;
    const prompts = promptLines.slice(0, 4);
    if (!prompts.length) {
      submitLockRef.current = false;
      return;
    }
    setModeFlyoutOpen(false);
    try {
      if (promptLines.length > prompts.length) {
        setError(`Running first ${prompts.length} prompts. Split the rest into another batch.`);
      }
      if (createMode === "image") {
        queueImageGenerations(prompts);
        return;
      }
      await generateMany(prompts);
    } finally {
      setTimeout(() => {
        submitLockRef.current = false;
      }, 500);
    }
  }

  async function generate(p: string) {
    if (!p.trim() || streaming) return;
    setError(null);
    const pending = { id: crypto.randomUUID(), prompt: p, createdAt: Date.now() };
    setPendingHtml((items) => [pending, ...items]);
    setStreaming(true);
    setCharCount(0);
    accumulatedRef.current = "";

    const iframe = livePreviewRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) {
      setError("preview iframe not mounted");
      setStreaming(false);
      return;
    }
    doc.open();
    const brandStyle = run.indexCss ? `<style>${run.indexCss}</style>` : "";
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:0;font-family:system-ui,sans-serif;background:#fff;color:#000;}</style>${brandStyle}</head><body>`);

    try {
      const b = run.decoded.branding || {};
      const c = run.decoded.copy || {};
      const tokens = {
        primary: b.colors?.primary,
        secondary: b.colors?.secondary,
        accent: b.colors?.accent,
        background: b.colors?.background,
        textPrimary: b.colors?.textPrimary,
        link: b.colors?.link,
        headingFont: b.typography?.fontFamilies?.heading || b.fonts?.[0]?.family,
        bodyFont: b.typography?.fontFamilies?.primary || b.fonts?.[0]?.family,
        borderRadius: b.spacing?.borderRadius,
        brandName: c.brand_name,
      };
      const assets = {
        logo_url: b.images?.logo,
        favicon_url: b.images?.favicon,
        og_url: b.images?.ogImage,
      };
      const res = await fetch("/api/mini-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          design_md: run.designed?.design_md || "",
          index_css: run.indexCss || "",
          tokens,
          assets,
          reference_images: currentGenerationContext().referenceImages,
          reference_html: currentGenerationContext().referenceHtml,
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `kimi stream failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const evt = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of evt.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedRef.current += delta;
                doc.write(delta);
                flushCount();
              }
            } catch {}
          }
        }
      }
      doc.write(`</body></html>`);
      doc.close();
      const finalHtml = accumulatedRef.current.replace(/^```html\n?/, "").replace(/\n?```$/, "");
      const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Run[];
      const i = all.findIndex((r) => brandRunId(r.decoded) === brandRunId(run.decoded));
      if (i >= 0) {
        const newMini = { id: crypto.randomUUID(), prompt: p, html: finalHtml, createdAt: Date.now() };
        all[i] = { ...all[i], minis: [newMini, ...(all[i].minis || [])] };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
        window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
      }
      setPrompt("");
      // hide the live stream so the GenerationViewer below isn't a duplicate
      accumulatedRef.current = "";
      setCharCount(0);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      try { doc.close(); } catch {}
    } finally {
      setPendingHtml((items) => items.filter((item) => item.id !== pending.id));
      setStreaming(false);
    }
  }

  return (
    <div className="p-4 md:p-0 pb-4 md:pb-0">
      {/* floating view-toggle, pinned to the right edge */}
      <div className="fixed right-5 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-1 rounded-full border-2 border-ink bg-white p-1.5 shadow-[0_12px_32px_rgba(0,0,0,0.12)]">
        <button
          type="button"
          onClick={() => setStudioView("canvas")}
          title="Canvas view"
          aria-label="Studio canvas view"
          className={`h-9 w-9 rounded-full text-body ${studioView === "canvas" ? "bg-ink text-white" : "text-ink hover:bg-cream"}`}
        >
          ◫
        </button>
        <button
          type="button"
          onClick={() => setStudioView("preview")}
          title="Preview view"
          aria-label="Studio preview view"
          className={`h-9 w-9 rounded-full text-body ${studioView === "preview" ? "bg-ink text-white" : "text-ink hover:bg-cream"}`}
        >
          ▣
        </button>
      </div>
      {/* live stream — always-mounted iframe; hidden until first token arrives */}
      <iframe
        ref={livePreviewRef}
        className={`w-full h-[calc(100dvh-96px)] bg-white border-0 rounded-none block ${charCount === 0 && !streaming ? "hidden" : ""}`}
        title="Streaming preview"
      />

      {/* generations viewer — hidden while a new one is streaming so the live preview takes over */}
      {(charCount === 0 || !streaming) && ((run.minis && run.minis.length > 0) || visualAssets.length > 0 || pendingImages.length > 0 || pendingHtml.length > 0) && (
        <GenerationsList
          minis={run.minis || []}
          assets={visualAssets}
          pendingImages={pendingImages}
          pendingHtml={pendingHtml}
          indexCss={run.indexCss}
          generationContext={generationLoadingContext}
          view={studioView}
          onExpand={setExpandedMini}
          onExpandAsset={setExpandedAsset}
          onEditHtml={(mini) => {
            addReferenceHtml(mini);
            editPrompt(mini.prompt, "html");
          }}
          onEditAsset={(asset) => editPrompt(asset.prompt || "", "image")}
          onUseAssetAsContext={(asset) => addReferenceImage({ url: asset.url, assetUrl: asset.url, name: asset.type === "custom" ? "Generated image" : asset.type, source: "asset" })}
          onUseHtmlAsContext={addReferenceHtml}
          onDeleteAsset={(asset) => {
            const nextAssets = visualAssets.filter((a) => a.url !== asset.url);
            onUpdateRun({ assets: { ...(run.assets || {}), assets: nextAssets } });
          }}
          onDeleteHtml={(mini) => {
            const nextMinis = (run.minis || []).filter((m) => m.id !== mini.id);
            onUpdateRun({ minis: nextMinis });
          }}
          onViewerChange={setViewer}
        />
      )}


      {/* unified bottom dock: viewer toolbar + prompt input + suggestions */}
      <div className="relative z-20 mt-4 overflow-visible rounded-card border-2 border-ink bg-white md:fixed md:bottom-16 md:left-1/2 md:mt-0 md:w-[min(68rem,calc(100vw-3rem))] md:-translate-x-1/2 md:rounded-[34px] md:shadow-[0_16px_50px_rgba(0,0,0,0.12)]">
        {viewer && !streaming && studioView === "preview" && (
          <div className="px-4 py-2 border-b border-ink/15 flex items-center gap-2 flex-wrap">
            <button
              onClick={viewer.onPrev}
              disabled={!viewer.canOlder}
              aria-label="Older generation"
              className="w-8 h-8 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white disabled:opacity-30"
            >‹</button>
            <span className="text-caption text-dark-gray tabular-nums">{viewer.number} / {viewer.total}</span>
            <button
              onClick={viewer.onNext}
              disabled={!viewer.canNewer}
              aria-label="Newer generation"
              className="w-8 h-8 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white disabled:opacity-30"
            >›</button>
            <p className="text-caption text-dark-gray md:ml-3 truncate italic max-w-[14rem] md:max-w-md">{viewer.prompt}</p>
            <div className="md:ml-auto flex items-center gap-2 overflow-x-auto">
              {viewer.item.kind === "html" ? (
                <>
                  <button
                    onClick={() => { navigator.clipboard.writeText(viewer.item.kind === "html" ? viewer.item.mini.html : ""); flash("html"); }}
                    title={copied === "html" ? "Copied!" : "Copy HTML"}
                    aria-label="Copy HTML"
                    className="w-8 h-8 flex items-center justify-center bg-ink text-white rounded-full hover:bg-dark-gray"
                  >
                    {copied === "html" ? (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                    ) : (
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    )}
                  </button>
                  <button
                    onClick={() => {
                      if (viewer.item.kind !== "html") return;
                      const blob = new Blob([viewer.item.mini.html], { type: "text/html" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = `generation-${viewer.number}.html`;
                      a.click();
                    }}
                    title="Download .html"
                    aria-label="Download"
                    className="w-8 h-8 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                  </button>
                </>
              ) : (
                <>
                  <button
                    onClick={() => navigator.clipboard.writeText(viewer.item.kind === "image" ? viewer.item.asset.prompt || viewer.item.asset.url : "")}
                    title="Copy prompt"
                    aria-label="Copy prompt"
                    className="w-8 h-8 flex items-center justify-center bg-ink text-white rounded-full hover:bg-dark-gray"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                  </button>
                  {viewer.item.kind === "image" && (
                    <a
                      href={viewer.item.asset.url}
                      download={assetFilename(viewer.item.asset)}
                      title="Download image"
                      aria-label="Download image"
                      className="w-8 h-8 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                    </a>
                  )}
                </>
              )}
              <button
                onClick={() => setPrompt(viewer.prompt)}
                title="Edit prompt"
                aria-label="Edit prompt"
                className="w-8 h-8 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
              </button>
              <button
                onClick={addViewerToContext}
                title="Add current item to context stack"
                aria-label="Add current item to context stack"
                className="w-8 h-8 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white"
              >
                +
              </button>
              <button
                onClick={() => viewer.item.kind === "image" ? queueImageGenerations([viewer.prompt]) : generate(viewer.prompt)}
                title="Regenerate"
                aria-label="Regenerate"
                className="w-8 h-8 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10"/><path d="M20.49 15a9 9 0 0 1-14.85 3.36L1 14"/></svg>
              </button>
              <button
                onClick={copyForAgent}
                title={copied === "agent" ? "Copied!" : "Copy for agent (prompt + brand context)"}
                aria-label="Copy for agent"
                className="px-3 h-8 flex items-center gap-2 bg-cream border-2 border-ink text-ink rounded-pill text-caption hover:bg-white whitespace-nowrap"
              >
                {copied === "agent" ? (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
                )}
                {copied === "agent" ? "Copied" : "Copy for agent"}
              </button>
            </div>
          </div>
        )}
        <div
          className="px-5 py-2"
          onDragOver={(e) => {
            e.preventDefault();
            e.dataTransfer.dropEffect = "copy";
          }}
          onDrop={(e) => {
            e.preventDefault();
            addDroppedFiles(e.dataTransfer.files);
          }}
        >
          {(referenceImages.length > 0 || referenceHtml.length > 0) && (
            <div className="mx-auto mb-2 flex max-w-6xl items-center gap-2 overflow-x-auto px-1">
              <div className="flex shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-ink px-3 py-1.5 text-caption text-white">
                <span>Context stack</span>
                <span className="rounded-full bg-white px-2 py-0.5 text-ink">{referenceImages.length + referenceHtml.length}</span>
              </div>
              {referenceImages.map((image, index) => (
                <div key={image.id} className="flex shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-white p-1 pr-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cream text-caption text-ink">{index + 1}</span>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image.url} alt="" className="h-7 w-7 rounded-full object-cover" />
                  <span className="max-w-28 truncate text-caption text-dark-gray">Image · {image.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${image.name}`}
                    onClick={() => setReferenceImages((images) => images.filter((item) => item.id !== image.id))}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-cream text-caption hover:bg-offset"
                  >
                    ×
                  </button>
                </div>
              ))}
              {referenceHtml.map((html, index) => (
                <div key={html.id} className="flex shrink-0 items-center gap-2 rounded-full border-2 border-ink bg-white p-1 pr-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-cream text-caption text-ink">{referenceImages.length + index + 1}</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-ink text-caption text-white">▧</span>
                  <span className="max-w-36 truncate text-caption text-dark-gray">HTML · {html.name}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${html.name}`}
                    onClick={() => setReferenceHtml((items) => items.filter((item) => item.id !== html.id))}
                    className="flex h-5 w-5 items-center justify-center rounded-full bg-cream text-caption hover:bg-offset"
                  >
                    ×
                  </button>
                </div>
              ))}
              <button
                type="button"
                onClick={clearContextStack}
                className="flex h-9 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-white px-3 text-caption text-ink hover:bg-cream"
              >
                Clear
              </button>
            </div>
          )}
          <div className="mx-auto flex max-w-6xl flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-11 shrink-0 items-center gap-1 rounded-full bg-cream p-1.5" role="tablist" aria-label="Generation type">
              {[
                { key: "html" as const, label: "HTML" },
                { key: "image" as const, label: "Image" },
              ].map((mode) => {
                const isActive = createMode === mode.key;
                return (
                  <button
                    key={mode.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => setCreateMode(mode.key)}
                    className={`flex h-8 items-center justify-center rounded-full px-4 text-caption font-medium transition ${
                      isActive ? "bg-ink text-white" : "text-ink hover:bg-white"
                    }`}
                  >
                    {mode.label}
                  </button>
                );
              })}
            </div>
            <textarea
              ref={promptInputRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value);
                pinPromptScroll();
              }}
              onScroll={pinPromptScroll}
              onKeyDown={(e) => {
                if (e.key !== "Enter") return;
                if (e.shiftKey) return;
                e.preventDefault();
                runPrompts();
              }}
              placeholder="Describe what to generate..."
              disabled={creating}
              rows={1}
              className="composer-textarea h-11 flex-1 resize-none rounded-[24px] border-0 bg-cream px-5 py-0 text-body leading-[44px] outline-none focus:bg-offset disabled:opacity-50"
            />
            <button
              onClick={runPrompts}
              disabled={creating || !prompt.trim()}
              aria-label="Generate"
              className="flex h-11 min-w-11 items-center justify-center rounded-full bg-ink px-4 text-body font-medium leading-none text-white hover:bg-dark-gray disabled:bg-dark-gray disabled:opacity-60"
            >
              {creating ? "…" : promptLines.length > 1 ? promptLines.length : "↗"}
            </button>
          </div>
          {error && <p className="mt-2 text-bodysm"><b>Error:</b> {error}</p>}
        </div>
      </div>
      {expandedMini && (
        <div className="fixed inset-0 z-50 bg-white">
          <button
            type="button"
            aria-label="Close full screen preview"
            onClick={() => setExpandedMini(null)}
            className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full border-2 border-ink bg-white text-body hover:bg-cream"
          >
            ×
          </button>
          <iframe
            srcDoc={wrapSnippet(expandedMini.html, run.indexCss)}
            loading="lazy"
            sandbox="allow-scripts"
            className="h-full w-full bg-white"
            title={expandedMini.prompt}
          />
        </div>
      )}
      {expandedAsset && (
        <div className="fixed inset-0 z-50 bg-black">
          <button
            type="button"
            aria-label="Close full screen image"
            onClick={() => setExpandedAsset(null)}
            className="absolute right-4 top-4 z-10 h-10 w-10 rounded-full border-2 border-white bg-black text-body text-white hover:bg-dark-gray"
          >
            ×
          </button>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={expandedAsset.url}
            alt={expandedAsset.type}
            className="h-full w-full object-contain"
          />
          <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 gap-2 rounded-full bg-white p-2">
            <button
              type="button"
              onClick={() => navigator.clipboard.writeText(expandedAsset.prompt || expandedAsset.url)}
              className="rounded-full bg-ink px-4 py-2 text-caption text-white"
            >
              Copy
            </button>
            <a
              href={expandedAsset.url}
              download={assetFilename(expandedAsset)}
              className="rounded-full border-2 border-ink bg-white px-4 py-1.5 text-caption"
            >
              Download
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

type SlideItem =
  | { kind: "html"; mini: MiniAsset; sortKey: number }
  | { kind: "image"; asset: Asset; sortKey: number };

type ViewerInfo = {
  item: SlideItem;
  prompt: string;
  number: number;
  total: number;
  canOlder: boolean;
  canNewer: boolean;
  onPrev: () => void;
  onNext: () => void;
};

function interleaveCanvasItems<T extends { sortKey: number }, U extends { sortKey: number }>(left: T[], right: U[]): Array<T | U> {
  const result: Array<T | U> = [];
  const queues: [Array<T | U>, Array<T | U>] = left[0]?.sortKey >= right[0]?.sortKey
    ? [left, right]
    : [right, left];
  let index = 0;
  while (queues[0].length > index || queues[1].length > index) {
    if (queues[0][index]) result.push(queues[0][index]);
    if (queues[1][index]) result.push(queues[1][index]);
    index += 1;
  }
  return result;
}

function GenerationsList({
  minis, assets, pendingImages, pendingHtml, indexCss, generationContext, view, onExpand, onExpandAsset, onEditHtml, onEditAsset, onUseAssetAsContext, onUseHtmlAsContext, onDeleteAsset, onDeleteHtml, onViewerChange,
}: {
  minis: MiniAsset[];
  assets: Asset[];
  pendingImages: PendingImage[];
  pendingHtml: PendingHtml[];
  indexCss?: string;
  generationContext: GenerationLoadingContext;
  view: "canvas" | "preview";
  onExpand: (mini: MiniAsset) => void;
  onExpandAsset: (asset: Asset) => void;
  onEditHtml: (mini: MiniAsset) => void;
  onEditAsset: (asset: Asset) => void;
  onUseAssetAsContext: (asset: Asset) => void;
  onUseHtmlAsContext: (mini: MiniAsset) => void;
  onDeleteAsset: (asset: Asset) => void;
  onDeleteHtml: (mini: MiniAsset) => void;
  onViewerChange: (v: ViewerInfo | null) => void;
}) {
  const [idx, setIdx] = useState(0);
  const completedItems = useMemo<SlideItem[]>(() => {
    const htmlItems: SlideItem[] = minis.map((mini) => ({ kind: "html", mini, sortKey: mini.createdAt }));
    const imageItems: SlideItem[] = assets.map((asset, index) => ({ kind: "image", asset, sortKey: asset.createdAt || Number.MAX_SAFE_INTEGER - index }));
    return interleaveCanvasItems(htmlItems, imageItems);
  }, [minis, assets]);
  const firstCompletedId = completedItems[0]?.kind === "html" ? completedItems[0].mini.id : completedItems[0]?.asset.url;
  const lastFirstId = useRef(firstCompletedId);
  useEffect(() => {
    if (firstCompletedId !== lastFirstId.current) {
      lastFirstId.current = firstCompletedId;
      setIdx(0);
    }
  }, [firstCompletedId]);
  const safeIdx = completedItems.length ? Math.min(idx, completedItems.length - 1) : 0;
  const current = completedItems[safeIdx];
  const canvasItems = useMemo(() => {
    const htmlItems = [
      ...pendingHtml.map((pending) => ({ kind: "pending-html" as const, pending, sortKey: pending.createdAt })),
      ...minis.map((mini) => ({ kind: "html" as const, mini, sortKey: mini.createdAt })),
    ];
    const imageItems = [
      ...pendingImages.map((pending) => ({ kind: "pending-image" as const, pending, sortKey: pending.createdAt })),
      ...assets.map((asset, index) => ({ kind: "image" as const, asset, sortKey: asset.createdAt || Number.MAX_SAFE_INTEGER - index })),
    ];
    return interleaveCanvasItems(htmlItems, imageItems);
  }, [minis, assets, pendingImages, pendingHtml]);

  useEffect(() => {
    if (!current) { onViewerChange(null); return; }
    onViewerChange({
      item: current,
      prompt: current.kind === "html" ? current.mini.prompt : current.asset.prompt || current.asset.type,
      number: completedItems.length - safeIdx,
      total: completedItems.length,
      canOlder: safeIdx < completedItems.length - 1,
      canNewer: safeIdx > 0,
      onPrev: () => setIdx((i) => Math.min(completedItems.length - 1, i + 1)),
      onNext: () => setIdx((i) => Math.max(0, i - 1)),
    });
    return () => onViewerChange(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.sortKey, safeIdx, completedItems.length]);

  if (!current && canvasItems.length === 0) return null;
  if (view === "canvas") {
    const totalItems = canvasItems.length;
    const tileWidth = 300;
    const tileHeight = 200;
    const canvasWidth = Math.max(1180, 420 + totalItems * 250);
    const canvasHeight = Math.max(980, 520 + Math.ceil(totalItems / 4) * 260);
    return (
      <div className="h-[calc(100dvh-96px)] max-w-full overflow-auto bg-cream pb-32 pt-8">
        <div
          className="relative"
          style={{
            width: canvasWidth,
            height: canvasHeight,
            backgroundImage: "radial-gradient(rgba(0,0,0,0.16) 1px, transparent 1px)",
            backgroundSize: "28px 28px",
          }}
        >
          {canvasItems.map((item, index) => {
            const col = index % 4;
            const row = Math.floor(index / 4);
            const left = 64 + col * 330 + (row % 2) * 34;
            const top = 54 + row * 260;
            if (item.kind === "pending-html") {
              return (
                <div
                  key={item.pending.id}
                  className="absolute overflow-hidden rounded-card border-2 border-ink bg-white shadow-[6px_6px_0_0_rgba(255,144,232,0.22)]"
                  style={{ left, top, width: tileWidth, height: tileHeight }}
                >
                  <div className="relative h-full overflow-hidden bg-ink p-4 text-white">
                    <div className="absolute inset-0 generation-gradient opacity-90" />
                    <div className="relative z-10 flex h-full flex-col justify-between">
                      <div className="flex items-center justify-between">
                        <div className="h-2 w-16 rounded-full bg-white/70" />
                        <span className="inline-block h-2 w-2 rounded-full bg-pink dot-pulse" />
                      </div>
                      <div>
                        <div className="mb-3 h-12 rounded-card border border-white/30 bg-white/20 backdrop-blur-sm" />
                        <p className="line-clamp-2 text-caption text-white/80">{item.pending.prompt}</p>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }
            if (item.kind === "pending-image") {
              return (
                <div
                  key={item.pending.id}
                  className="absolute overflow-hidden rounded-card border-2 border-ink bg-white shadow-[6px_6px_0_0_rgba(255,144,232,0.22)]"
                  style={{ left, top, width: tileWidth, height: tileHeight }}
                >
                  <PendingImageCard pending={item.pending} context={generationContext} />
                </div>
              );
            }
            if (item.kind === "image") {
              const asset = item.asset;
              return (
                <div
                  key={asset.url}
                  className="group absolute overflow-hidden rounded-card border-2 border-ink bg-white shadow-[6px_6px_0_0_rgba(255,144,232,0.22)] transition-transform hover:-translate-y-1"
                  style={{ left, top, width: tileWidth, height: tileHeight }}
                >
                  <button
                    type="button"
                    onClick={() => onExpandAsset(asset)}
                    className="absolute inset-0 z-10"
                    aria-label={`Open ${asset.type} full screen`}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={asset.url} alt={asset.type} className="h-full w-full object-contain bg-white" />
                  <div className="absolute inset-0 bg-black/0 transition group-hover:bg-black/10" />
                  <div className="absolute bottom-3 right-3 z-20 flex translate-y-1 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onEditAsset(asset); }}
                      aria-label={`Edit ${asset.type} prompt`}
                      title="Edit prompt"
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-cream"
                    >
                      <Icon name="edit" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onUseAssetAsContext(asset); }}
                      aria-label={`Use ${asset.type} as context`}
                      title="Use as context"
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-cream"
                    >
                      <Icon name="context" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onExpandAsset(asset); }}
                      aria-label={`Open ${asset.type} full screen`}
                      title="Expand"
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-cream"
                    >
                      <Icon name="expand" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(asset.prompt || asset.url); }}
                      aria-label="Copy prompt"
                      title="Copy prompt"
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white hover:bg-dark-gray"
                    >
                      <Icon name="copy" />
                    </button>
                    <a
                      onClick={(e) => e.stopPropagation()}
                      href={asset.url}
                      download={assetFilename(asset)}
                      aria-label="Download asset"
                      title="Download"
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-cream"
                    >
                      <Icon name="download" />
                    </a>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteAsset(asset); }}
                      aria-label={`Delete ${asset.type}`}
                      title="Delete"
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-pink"
                    >
                      <Icon name="trash" />
                    </button>
                  </div>
                </div>
              );
            }
            const mini = item.mini;
            const miniIndex = Math.max(0, completedItems.findIndex((slide) => slide.kind === "html" && slide.mini.id === mini.id));
            return (
              <div
                key={mini.id}
                className={`group absolute overflow-hidden rounded-card border-2 bg-white text-left shadow-[6px_6px_0_0_rgba(255,144,232,0.22)] transition-transform hover:-translate-y-1 ${
                  current?.kind === "html" && mini.id === current.mini.id ? "border-ink" : "border-ink/40"
                }`}
                style={{ left, top, width: tileWidth, height: tileHeight }}
              >
                <button
                  type="button"
                  onClick={() => { setIdx(miniIndex); onExpand(mini); }}
                  className="absolute inset-0 z-10"
                  aria-label={`Open ${mini.prompt}`}
                />
                <HtmlTilePreview mini={mini} indexCss={indexCss} tileWidth={tileWidth} />
                <div className="pointer-events-none absolute bottom-3 right-3 z-20 flex translate-y-1 gap-1 opacity-0 transition group-hover:translate-y-0 group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onEditHtml(mini); }}
                    aria-label="Edit prompt"
                    title="Edit prompt"
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-cream"
                  >
                    <Icon name="edit" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onUseHtmlAsContext(mini); }}
                    aria-label="Use as context"
                    title="Use as context"
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-cream"
                  >
                    <Icon name="context" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); navigator.clipboard.writeText(mini.html); }}
                    aria-label="Copy HTML"
                    title="Copy HTML"
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full bg-ink text-white hover:bg-dark-gray"
                  >
                    <Icon name="copy" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      const blob = new Blob([mini.html], { type: "text/html" });
                      const a = document.createElement("a");
                      a.href = URL.createObjectURL(blob);
                      a.download = "generation.html";
                      a.click();
                    }}
                    aria-label="Download HTML"
                    title="Download"
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-cream"
                  >
                    <Icon name="download" />
                  </button>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); onDeleteHtml(mini); }}
                    aria-label="Delete generation"
                    title="Delete"
                    className="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-full border-2 border-ink bg-white text-ink hover:bg-pink"
                  >
                    <Icon name="trash" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }
  if (!current) return null;
  if (current.kind === "image") {
    return (
      <div className="flex h-[calc(100dvh-300px)] items-center justify-center bg-white md:h-[calc(100vh-256px)]">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={current.asset.url} alt={current.asset.type} className="h-full w-full object-contain" />
      </div>
    );
  }
  return (
    <iframe
      srcDoc={wrapSnippet(current.mini.html, indexCss)}
      loading="lazy"
      sandbox="allow-scripts"
      className="w-full h-[calc(100dvh-300px)] md:h-[calc(100vh-256px)] bg-white block"
      title={current.mini.prompt}
    />
  );
}

function PendingImageCard({ pending, context }: { pending: PendingImage; context: GenerationLoadingContext }) {
  const progress = useStalledProgress(true, false);
  const colorFocus = Math.floor(Date.now() / 1400) % Math.max(1, context.colors.length);
  const colors = context.colors.length ? context.colors : ["#111111", "#666666", "#f4f1ec"];

  return (
    <div className="flex h-full min-h-0 flex-col justify-between overflow-hidden bg-cream p-3.5">
      <div className="min-h-0">
        <div className="flex items-center justify-between gap-3">
          <p className="text-caption uppercase tracking-widest text-dark-gray">Generating image</p>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-pink dot-pulse" />
        </div>
        <div className="mt-4 grid grid-cols-[minmax(0,1fr)_76px] items-center gap-3">
          <div className="flex min-w-0 flex-col justify-center gap-2">
            {colors.slice(0, 3).map((color, index) => (
              <div key={`${color}-${index}`} className="flex items-center gap-2">
                <span
                  className={`h-6 w-6 shrink-0 rounded-full border-2 border-ink transition-transform duration-300 ${index === colorFocus ? "scale-110" : "scale-100"}`}
                  style={{ background: color }}
                  title={color}
                />
                <div className="h-2 flex-1 overflow-hidden rounded-pill bg-white">
                  <div
                    className={`h-full transition-[width] duration-500 ${index === colorFocus ? "w-full" : "w-1/3"}`}
                    style={{ background: color }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="flex flex-col gap-2">
            {context.images.slice(0, 2).map((image, index) => (
              <span key={image.url} className={`overflow-hidden rounded-card border-2 border-ink bg-white ${index === 0 ? "h-8" : "h-11"}`} title={image.label}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image.url} alt="" className="h-full w-full object-contain" />
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-2">
        <div>
          <div className="mb-1 flex items-center justify-between text-caption text-dark-gray">
            <span>Composing</span>
            <span>{Math.round(progress.progress)}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-pill border-2 border-ink bg-white">
            <div
              className="h-full progress-fill transition-[width] duration-500 ease-out"
              style={{ width: `${progress.progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function HtmlTilePreview({
  mini,
  indexCss,
  tileWidth,
}: {
  mini: MiniAsset;
  indexCss?: string;
  tileWidth: number;
}) {
  const srcDoc = useMemo(() => wrapSnippet(mini.html, indexCss), [mini.html, indexCss]);
  return (
    <div className="h-full w-full overflow-hidden bg-white">
      <iframe
        srcDoc={srcDoc}
        loading="lazy"
        sandbox="allow-scripts"
        className="pointer-events-none origin-top-left bg-white"
        style={{
          width: 960,
          height: 640,
          transform: `scale(${tileWidth / 960})`,
        }}
        title={mini.prompt}
      />
    </div>
  );
}

// — old tabbed ActiveRun replaced by BrandWorkspace + right-side Studio panel —
function _DeadActiveRun(props: {
  run: Run;
  onGenAll: () => void;
  onGenVisuals: () => void;
  onGenDesign: () => void;
  designing: boolean;
  genAssets: boolean;
}) {
  const { run, onGenDesign, designing } = props;
  type TabKey = "studio" | "brand";
  const [tab, setTab] = useState<TabKey>("studio");

  useEffect(() => {
    if (!run.designed && !designing) onGenDesign();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [brandRunId(run.decoded)]);

  const tabs: { key: TabKey; label: string; ready: boolean; loading: boolean; emoji: string }[] = [
    { key: "studio",  label: "Studio",  ready: true,                                  emoji: "◇", loading: false },
    { key: "brand",   label: "Brand",   ready: true,                                  emoji: "◐", loading: false },
  ];

  return (
    <section>
      {/* tab bar */}
      <div className="flex items-center gap-1 mb-6">
        {tabs.map((t) => {
          const isActive = tab === t.key;
          return (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`relative px-4 py-2.5 text-bodysm font-medium border-2 border-ink rounded-pill transition-colors ${
                isActive ? "bg-ink text-white" : "bg-cream hover:bg-white text-ink"
              }`}
            >
              <span className={`mr-2 ${isActive ? "text-white" : "text-dark-gray"}`}>{t.emoji}</span>
              {t.label}
              {t.loading && (
                <span className="ml-2 inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse align-middle" />
              )}
              {!t.loading && t.ready && t.key !== "brand" && (
                <span className={`ml-2 inline-block w-1.5 h-1.5 rounded-full align-middle ${isActive ? "bg-pink" : "bg-ink"}`} />
              )}
            </button>
          );
        })}
      </div>

      {/* tab content */}
      <div className="min-h-[300px]">
        {tab === "studio" && <MiniAssetsPanel run={run} designing={designing} />}
        {tab === "brand"  && <Step1View decoded={run.decoded} designed={run.designed} />}
      </div>
    </section>
  );
}

function PendingPanel({
  title, subtitle, generating, onGenerate, ctaLabel, ctaDisabled = false, tilesCount = 1,
}: {
  title: string;
  subtitle: string;
  generating: boolean;
  onGenerate: () => void;
  ctaLabel: string;
  ctaDisabled?: boolean;
  tilesCount?: number;
}) {
  if (generating) {
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-5 h-5 border-2 rounded-full spin-ring" />
          <p className="text-large font-bold">{title}</p>
        </div>
        <div className="h-2 w-full overflow-hidden rounded-pill border-2 border-ink mb-6">
          <div className="h-full stripe-progress" />
        </div>
        <div className={`grid gap-6 ${tilesCount > 1 ? "md:grid-cols-2" : "md:grid-cols-1"}`}>
          {Array.from({ length: tilesCount }).map((_, i) => (
            <div key={i} className="border-2 border-ink rounded-card p-6 bg-white">
              <div className="h-3 w-1/3 rounded shimmer mb-4" />
              <div className="h-48 rounded-card shimmer" />
              <div className="h-3 w-2/3 rounded shimmer mt-4" />
              <div className="h-3 w-1/2 rounded shimmer mt-2" />
            </div>
          ))}
        </div>
        <p className="text-caption text-dark-gray mt-4 flex items-center gap-2">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse" />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse" />
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse" />
          <span className="ml-2">{subtitle}</span>
        </p>
      </div>
    );
  }
  return (
    <Card>
      <p className="text-large font-bold">{title}</p>
      <p className="text-bodysm text-dark-gray mt-1">{subtitle}</p>
      <button
        onClick={onGenerate}
        disabled={ctaDisabled}
        className="mt-5 px-5 py-2.5 bg-ink text-white rounded-pill text-bodysm font-medium hover:bg-dark-gray disabled:opacity-50"
      >
        {ctaLabel}
      </button>
    </Card>
  );
}

const MINI_PROMPT_PRESETS = [
  "Hero section with a bold headline and one CTA button",
  "Pricing card with 3 tiers (Starter / Pro / Enterprise)",
  "Testimonial card with avatar circle and quote",
  "FAQ accordion with 4 questions",
  "Feature row of 3 icons with titles + descriptions",
  "Email capture form with bold headline and inline button",
  "Stats strip: 4 numbers with labels (e.g. '2.4M users')",
  "Footer with 4 link columns and a brand wordmark",
];

const STREAM_DOC_PREFIX = `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:1rem;font-family:system-ui,sans-serif;background:#fff;color:#000;}</style></head><body>`;
const STREAM_DOC_SUFFIX = `</body></html>`;

type ChatMsg =
  | { role: "user"; id: string; prompt: string }
  | { role: "assistant"; id: string; prompt: string; html: string; streaming?: boolean };

function ChatPanel({ run, designing }: { run: Run; designing: boolean }) {
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [error, setError] = useState<string | null>(null);
  const accumulatedRef = useRef("");
  const rafPendingRef = useRef(false);
  const liveIdRef = useRef<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Hydrate from saved minis on first mount / brand switch
  useEffect(() => {
    const minis = run.minis || [];
    setMessages(
      minis.slice().reverse().flatMap((m) => [
        { role: "user", id: `u-${m.id}`, prompt: m.prompt } as ChatMsg,
        { role: "assistant", id: `a-${m.id}`, prompt: m.prompt, html: m.html } as ChatMsg,
      ])
    );
  }, [brandRunId(run.decoded), run.minis]);

  // Auto-scroll to bottom on new content
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length, streaming]);

  function flushLive() {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      const id = liveIdRef.current;
      if (!id) return;
      setMessages((msgs) =>
        msgs.map((m) => (m.id === id && m.role === "assistant" ? { ...m, html: accumulatedRef.current } : m))
      );
    });
  }

  async function generate(p: string) {
    if (!p.trim() || streaming) return;
    setError(null);
    setStreaming(true);
    accumulatedRef.current = "";
    const userId = `u-${crypto.randomUUID()}`;
    const asstId = `a-${crypto.randomUUID()}`;
    liveIdRef.current = asstId;
    setMessages((m) => [
      ...m,
      { role: "user", id: userId, prompt: p },
      { role: "assistant", id: asstId, prompt: p, html: "", streaming: true },
    ]);

    try {
      const b = run.decoded.branding || {};
      const c = run.decoded.copy || {};
      const tokens = {
        primary: b.colors?.primary,
        secondary: b.colors?.secondary,
        accent: b.colors?.accent,
        background: b.colors?.background,
        textPrimary: b.colors?.textPrimary,
        link: b.colors?.link,
        headingFont: b.typography?.fontFamilies?.heading || b.fonts?.[0]?.family,
        bodyFont: b.typography?.fontFamilies?.primary || b.fonts?.[0]?.family,
        borderRadius: b.spacing?.borderRadius,
        brandName: c.brand_name,
      };
      const res = await fetch("/api/mini-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: p, design_md: run.designed?.design_md || "", tokens }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `kimi stream failed (${res.status})`);
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const evt = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of evt.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedRef.current += delta;
                flushLive();
              }
            } catch {}
          }
        }
      }
      const finalHtml = accumulatedRef.current.replace(/^```html\n?/, "").replace(/\n?```$/, "");
      setMessages((msgs) =>
        msgs.map((m) => (m.id === asstId && m.role === "assistant" ? { ...m, html: finalHtml, streaming: false } : m))
      );
      // persist
      const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Run[];
      const i = all.findIndex((r) => brandRunId(r.decoded) === brandRunId(run.decoded));
      if (i >= 0) {
        const newMini = { id: crypto.randomUUID(), prompt: p, html: finalHtml, createdAt: Date.now() };
        all[i] = { ...all[i], minis: [newMini, ...(all[i].minis || [])] };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
        window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
      }
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setMessages((msgs) => msgs.filter((m) => m.id !== asstId));
    } finally {
      setStreaming(false);
      liveIdRef.current = null;
    }
  }

  return (
    <aside className="w-[440px] shrink-0 border-l-2 border-ink bg-white sticky top-0 h-screen flex flex-col">
      <div className="px-5 py-4 border-b-2 border-ink flex items-center justify-between shrink-0">
        <p className="text-caption uppercase tracking-widest text-dark-gray">◇ Studio</p>
        {run.designed ? (
          <p className="text-caption text-dark-gray">design.md ✓ in context</p>
        ) : designing ? (
          <p className="text-caption text-dark-gray flex items-center gap-2">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse" />
            writing design.md…
          </p>
        ) : (
          <p className="text-caption text-dark-gray">no design context</p>
        )}
      </div>

      {/* messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-center pt-8">
            <p className="text-bodysm text-dark-gray">
              Ask the studio to build any UI snippet for this brand.
            </p>
            <p className="text-caption text-dark-gray mt-2 italic">
              e.g. &quot;hero section with a bold headline&quot;
            </p>
          </div>
        )}
        {messages.map((m) =>
          m.role === "user" ? (
            <div key={m.id} className="flex justify-end">
              <div className="max-w-[85%] bg-ink text-white rounded-card border-2 border-ink px-3 py-2 text-bodysm">
                {m.prompt}
              </div>
            </div>
          ) : (
            <div key={m.id} className="flex flex-col gap-1">
              {m.streaming && (
                <p className="text-caption text-dark-gray flex items-center gap-2 mb-0.5">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse" />
                  streaming
                </p>
              )}
              <iframe
                srcDoc={wrapSnippet(m.html || " ")}
                sandbox="allow-scripts"
                className="w-full h-72 border-2 border-ink rounded-card bg-white"
                title={m.prompt}
              />
              <div className="flex items-center gap-2 mt-1 px-1">
                <button
                  onClick={() => navigator.clipboard.writeText(m.html)}
                  title="Copy HTML"
                  aria-label="Copy"
                  className="w-7 h-7 flex items-center justify-center bg-ink text-white rounded-full hover:bg-dark-gray"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                </button>
                <button
                  onClick={() => {
                    const blob = new Blob([m.html], { type: "text/html" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = "snippet.html";
                    a.click();
                  }}
                  title="Download"
                  aria-label="Download"
                  className="w-7 h-7 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
                </button>
                <span className="text-caption text-dark-gray ml-auto">{(m.html.length / 1024).toFixed(1)}KB</span>
              </div>
            </div>
          )
        )}
      </div>

      {/* prompt input (sticky bottom) */}
      <div className="border-t-2 border-ink p-3 shrink-0">
        <div className="flex flex-wrap gap-1.5 mb-2">
          {AUTO_PROMPTS.map((p) => (
            <button
              key={p}
              onClick={() => generate(p)}
              disabled={streaming}
              className="text-caption bg-cream border-2 border-ink rounded-pill px-2.5 py-1 hover:bg-pink/30 disabled:opacity-50"
            >
              {p.length > 28 ? p.slice(0, 26) + "…" : p}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate(prompt)}
            placeholder='e.g. "footer with link columns"'
            disabled={streaming}
            className="flex-1 px-4 py-2 bg-cream border-2 border-ink rounded-pill text-bodysm outline-none focus:bg-white disabled:opacity-50"
          />
          <button
            onClick={() => generate(prompt)}
            disabled={streaming || !prompt.trim()}
            className="px-4 py-2 bg-ink text-white rounded-pill text-bodysm font-medium hover:bg-dark-gray disabled:opacity-50"
          >
            {streaming ? "…" : "Send"}
          </button>
        </div>
        {error && <p className="mt-2 text-caption text-dark-gray"><b>Error:</b> {error}</p>}
      </div>
    </aside>
  );
}

function MiniAssetsPanel({ run, designing = false }: { run: Run; designing?: boolean }) {
  const [showDesign, setShowDesign] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [charCount, setCharCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const livePreviewRef = useRef<HTMLIFrameElement>(null);
  const accumulatedRef = useRef("");
  const rafPendingRef = useRef(false);

  function flushCount() {
    if (rafPendingRef.current) return;
    rafPendingRef.current = true;
    requestAnimationFrame(() => {
      rafPendingRef.current = false;
      setCharCount(accumulatedRef.current.length);
    });
  }

  async function generate(p: string) {
    if (!p.trim() || streaming) return;
    setError(null);
    setStreaming(true);
    setCharCount(0);
    accumulatedRef.current = "";

    // Open the always-mounted iframe document for incremental writes.
    const iframe = livePreviewRef.current;
    const doc = iframe?.contentDocument;
    if (!doc) {
      setError("preview iframe not mounted");
      setStreaming(false);
      return;
    }
    doc.open();
    doc.write(`<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;padding:1rem;font-family:system-ui,-apple-system,sans-serif;background:#fff;color:#000;}</style></head><body>`);

    let inFence = false;

    try {
      const b = run.decoded.branding || {};
      const c = run.decoded.copy || {};
      const tokens = {
        primary: b.colors?.primary,
        secondary: b.colors?.secondary,
        accent: b.colors?.accent,
        background: b.colors?.background,
        textPrimary: b.colors?.textPrimary,
        link: b.colors?.link,
        headingFont: b.typography?.fontFamilies?.heading || b.fonts?.[0]?.family,
        bodyFont: b.typography?.fontFamilies?.primary || b.fonts?.[0]?.family,
        borderRadius: b.spacing?.borderRadius,
        brandName: c.brand_name,
      };
      const res = await fetch("/api/mini-asset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: p,
          design_md: run.designed?.design_md || "",
          tokens,
        }),
      });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || `kimi stream failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE: split on \n\n, each event is "data: {...}"
        let idx;
        while ((idx = buffer.indexOf("\n\n")) !== -1) {
          const evt = buffer.slice(0, idx);
          buffer = buffer.slice(idx + 2);
          for (const line of evt.split("\n")) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6).trim();
            if (payload === "[DONE]") continue;
            try {
              const json = JSON.parse(payload);
              const delta = json.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedRef.current += delta;
                // Strip code fences inline as they arrive
                let toWrite = delta;
                if (!inFence && accumulatedRef.current.length <= delta.length + 10 && accumulatedRef.current.startsWith("```")) {
                  inFence = true;
                  toWrite = "";
                } else if (inFence && delta.includes("```")) {
                  toWrite = delta.replace(/```html?/g, "").replace(/```/g, "");
                  inFence = false;
                } else if (delta === "```html" || delta === "```") {
                  toWrite = "";
                }
                if (toWrite) doc.write(toWrite); // ← incremental render, no React re-render
                flushCount();
              }
            } catch { /* ignore parse errors */ }
          }
        }
      }
      doc.write(`</body></html>`);
      doc.close();

      // Persist the finished snippet onto the run
      const finalHtml = accumulatedRef.current.replace(/^```html\n?/, "").replace(/\n?```$/, "");
      const newMini: MiniAsset = {
        id: crypto.randomUUID(),
        prompt: p,
        html: finalHtml,
        createdAt: Date.now(),
      };
      const all = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]") as Run[];
      const idx2 = all.findIndex((r) => brandRunId(r.decoded) === brandRunId(run.decoded));
      if (idx2 >= 0) {
        all[idx2] = { ...all[idx2], minis: [newMini, ...(all[idx2].minis || [])] };
        localStorage.setItem(HISTORY_KEY, JSON.stringify(all));
        // Force a refresh by dispatching a storage event so parent re-reads
        window.dispatchEvent(new StorageEvent("storage", { key: HISTORY_KEY }));
      }
      setPrompt("");
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      try { doc.close(); } catch {}
    } finally {
      setStreaming(false);
    }
  }

  return (
    <div>
      <Card featured className="mb-6">
        <p className="text-caption uppercase tracking-widest text-dark-gray mb-3">Build a snippet</p>
        <div className="flex flex-col md:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && generate(prompt)}
            placeholder='e.g. "pricing card with 3 tiers"'
            disabled={streaming}
            className="flex-1 px-5 py-3 bg-cream border-2 border-ink rounded-pill text-body outline-none focus:bg-white disabled:opacity-50"
          />
          <button
            onClick={() => generate(prompt)}
            disabled={streaming || !prompt.trim()}
            className="px-6 py-2 bg-ink text-white rounded-pill text-body font-medium hover:bg-dark-gray disabled:opacity-50"
          >
            {streaming ? "Streaming…" : "Generate"}
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {MINI_PROMPT_PRESETS.map((p) => (
            <button
              key={p}
              onClick={() => { setPrompt(p); generate(p); }}
              disabled={streaming}
              className="text-caption bg-cream border-2 border-ink rounded-pill px-3 py-1 hover:bg-pink/30 disabled:opacity-50"
            >
              {p.length > 40 ? p.slice(0, 38) + "…" : p}
            </button>
          ))}
        </div>
        <div className="mt-4 pt-4 border-t border-offset flex items-center gap-3 text-caption">
          <span className="uppercase tracking-widest text-dark-gray">Context →</span>
          <span className="text-dark-gray">brand tokens ✓</span>
          {run.designed ? (
            <button
              onClick={() => setShowDesign(s => !s)}
              className="text-ink hover:underline"
            >
              design.md ✓ ({run.designed.design_md?.length ?? 0} chars · {showDesign ? "hide" : "view"})
            </button>
          ) : designing ? (
            <span className="text-dark-gray flex items-center gap-2">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse" />
              design.md generating in background…
            </span>
          ) : (
            <span className="text-dark-gray">design.md (none yet)</span>
          )}
        </div>
        {showDesign && run.designed && (
          <pre className="mt-3 text-small bg-offset rounded-card p-4 overflow-auto max-h-72 whitespace-pre-wrap font-mono">
            {run.designed.design_md}
          </pre>
        )}
        {error && <p className="mt-3 text-bodysm"><b>Error:</b> {error}</p>}
      </Card>

      {/* iframe is ALWAYS mounted so contentDocument stays stable across renders.
          We hide the wrapping card visually before the first stream. */}
      <div className={charCount === 0 && !streaming ? "h-0 overflow-hidden mb-0" : "mb-6"}>
        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-caption uppercase tracking-widest text-dark-gray flex items-center gap-2">
              {streaming && <span className="inline-block w-1.5 h-1.5 rounded-full bg-pink dot-pulse" />}
              Live stream {charCount > 0 && `· ${charCount} chars`}
            </p>
          </div>
          <iframe
            ref={livePreviewRef}
            className="w-full h-96 border-2 border-ink rounded-card bg-white"
            title="Streaming preview"
          />
        </Card>
      </div>

      {run.minis && run.minis.length > 0 && (
        <div>
          <p className="text-caption uppercase tracking-widest text-dark-gray mb-3">Saved snippets ({run.minis.length})</p>
          <div className="grid gap-6 md:grid-cols-2 items-stretch">
            {run.minis.map((m) => (
              <MiniAssetCard key={m.id} mini={m} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function wrapSnippet(html: string, indexCss?: string): string {
  // Lift any leading `@import url(...)` lines (Kimi sometimes emits them outside <style>) into a real <style> block.
  let body = html.replace(/^```html\n?/, "").replace(/\n?```$/, "");
  const imports: string[] = [];
  body = body.replace(/^\s*(@import\s+url\([^)]+\);?\s*)+/m, (match) => {
    const found = match.match(/@import\s+url\([^)]+\);?/g) || [];
    imports.push(...found);
    return "";
  });
  const importStyle = imports.length ? `<style>${imports.join("\n")}</style>` : "";
  const brandStyle = indexCss ? `<style>${indexCss}</style>` : "";
  return `<!doctype html><html><head><meta charset="utf-8">${importStyle}<style>html,body{margin:0;padding:0;font-family:system-ui,-apple-system,sans-serif;}</style>${brandStyle}</head><body>${body}</body></html>`;
}

function MiniAssetCard({ mini }: { mini: MiniAsset }) {
  return (
    <Card>
      <p className="text-caption uppercase tracking-widest text-dark-gray mb-2 truncate">{mini.prompt}</p>
      <iframe
        srcDoc={wrapSnippet(mini.html)}
        sandbox="allow-scripts"
        className="w-full h-72 border-2 border-ink rounded-card bg-white"
        title={mini.prompt}
      />
      <div className="mt-3 flex gap-2 items-center">
        <button
          onClick={() => navigator.clipboard.writeText(mini.html)}
          title="Copy HTML"
          aria-label="Copy HTML"
          className="w-9 h-9 flex items-center justify-center bg-ink text-white rounded-full hover:bg-dark-gray"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button
          onClick={() => {
            const blob = new Blob([mini.html], { type: "text/html" });
            const a = document.createElement("a");
            a.href = URL.createObjectURL(blob);
            a.download = "snippet.html";
            a.click();
          }}
          title="Download .html"
          aria-label="Download"
          className="w-9 h-9 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
        </button>
        <span className="text-caption text-dark-gray ml-auto">{(mini.html.length / 1024).toFixed(1)}KB</span>
      </div>
    </Card>
  );
}

function VisualAssetsPanel({ assets }: { assets: AssetPack }) {
  return (
    <div>
      {assets.mocked && (
        <Card className="mb-4">
          <p className="text-bodysm">
            <span className="bg-yellow px-2 py-0.5 rounded-pill text-caption uppercase font-bold mr-2">Mocked</span>
            Placeholders in the brand&apos;s primary color. Swap the n8n
            <code className="bg-offset px-2 py-0.5 rounded mx-1">Mock URLs</code>
            node for Fal calls — prompts already include OG-image reference + personality + tokens.
          </p>
        </Card>
      )}
      <div className="grid gap-6 md:grid-cols-2 items-stretch">
        {assets.assets.map((a, i) => (
          <Card key={i} className="h-full">
            <div className="flex items-center justify-between mb-3">
              <p className="text-caption uppercase tracking-widest text-dark-gray">{a.type.replace(/_/g, " ")}</p>
              <p className="text-caption text-dark-gray">{a.width}×{a.height}</p>
            </div>
            <div className="flex-1 flex items-center justify-center bg-cream rounded-card border-2 border-ink overflow-hidden min-h-[180px]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={a.url} alt={a.type} className="max-w-full max-h-72 object-contain" />
            </div>
            <div className="mt-3 flex gap-2">
              <a href={a.url} download title="Download" aria-label="Download" className="w-9 h-9 flex items-center justify-center bg-ink text-white rounded-full hover:bg-dark-gray">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              </a>
              <a href={a.url} target="_blank" rel="noreferrer" title="Open" aria-label="Open" className="w-9 h-9 flex items-center justify-center bg-cream border-2 border-ink text-ink rounded-full hover:bg-white">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
              </a>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

function _UnusedAssetsSection({
  run, onGenAll, onGenVisuals, onGenDesign, onGenLanding,
  designing, genAssets, building,
}: {
  run: Run;
  onGenAll: () => void;
  onGenVisuals: () => void;
  onGenDesign: () => void;
  onGenLanding: () => void;
  designing: boolean;
  genAssets: boolean;
  building: boolean;
}) {
  const haveAll = !!run.assets && !!run.designed;
  const anyGenerating = designing || genAssets || building;

  return (
    <section className="mt-8">
      <div className="flex items-end justify-between mb-4 flex-wrap gap-3">
        <div>
          <h2 className="text-h3 font-bold">Assets</h2>
          <p className="text-bodysm text-dark-gray mt-1">
            {haveAll
              ? `${(run.assets?.assets.length ?? 0) + 1 + (run.built ? 1 : 0)} assets generated`
              : "Visuals, design system, landing page — all from the same brand decode"}
          </p>
        </div>
        <div className="flex gap-2">
          {!haveAll && (
            <button
              onClick={onGenAll}
              disabled={anyGenerating}
              className="px-5 py-2.5 bg-ink text-white rounded-pill text-bodysm font-medium hover:bg-dark-gray disabled:opacity-50"
            >
              {anyGenerating ? "Generating…" : "✨ Generate all assets"}
            </button>
          )}
          {run.designed && !run.built && (
            <button
              onClick={onGenLanding}
              disabled={building}
              className="px-5 py-2.5 bg-pink text-ink rounded-pill text-bodysm font-medium hover:bg-pink-hover disabled:opacity-50"
            >
              {building ? "Building landing page…" : "+ Landing page"}
            </button>
          )}
        </div>
      </div>

      {/* visual asset tiles */}
      {(run.assets || genAssets) && (
        <div className="mb-8">
          <p className="text-caption uppercase tracking-widest text-dark-gray mb-3">Visual</p>
          {run.assets?.mocked && (
            <Card className="mb-4">
              <p className="text-bodysm">
                <span className="bg-yellow px-2 py-0.5 rounded-pill text-caption uppercase font-bold mr-2">Mocked</span>
                Placeholders in the brand&apos;s primary color. Swap the n8n
                <code className="bg-offset px-2 py-0.5 rounded mx-1">Mock URLs</code>
                node for Fal calls — prompts already include OG-image reference + personality + tokens.
              </p>
            </Card>
          )}
          {genAssets && !run.assets && (
            <Card className="mb-4">
              <p className="text-bodysm flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-pink rounded-full animate-pulse" />
                Generating visual assets…
              </p>
            </Card>
          )}
          {run.assets && (
            <div className="grid gap-6 md:grid-cols-2">
              {run.assets.assets.map((a, i) => (
                <Card key={i}>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-caption uppercase tracking-widest text-dark-gray">{a.type.replace(/_/g, " ")}</p>
                    <p className="text-caption text-dark-gray">{a.width}×{a.height}</p>
                  </div>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.url} alt={a.type} className="w-full rounded-card border-2 border-ink bg-cream" />
                  <div className="mt-3 flex gap-2">
                    <a href={a.url} download className="text-bodysm bg-ink text-white px-4 py-1.5 rounded-pill">Download</a>
                    <a href={a.url} target="_blank" rel="noreferrer" className="text-bodysm bg-cream border-2 border-ink text-ink px-4 py-1.5 rounded-pill">Open</a>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* design system asset (markdown) */}
      {(run.designed || designing) && (
        <div className="mb-8">
          <p className="text-caption uppercase tracking-widest text-dark-gray mb-3">Design system</p>
          {designing && !run.designed && (
            <Card>
              <p className="text-bodysm flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-pink rounded-full animate-pulse" />
                Spec-ing design system…
              </p>
            </Card>
          )}
          {run.designed && <Step2View designed={run.designed} />}
        </div>
      )}

      {/* landing page asset (html) */}
      {(run.built || building) && (
        <div className="mb-8">
          <p className="text-caption uppercase tracking-widest text-dark-gray mb-3">Landing page</p>
          {building && !run.built && (
            <Card>
              <p className="text-bodysm flex items-center gap-2">
                <span className="inline-block w-2 h-2 bg-pink rounded-full animate-pulse" />
                Building landing page… ~2 min
              </p>
            </Card>
          )}
          {run.built && <Step3View built={run.built} />}
        </div>
      )}

      {/* fallback: no assets yet, no in-flight */}
      {!run.assets && !run.designed && !run.built && !anyGenerating && (
        <Card>
          <p className="text-bodysm text-dark-gray">
            Click <b>✨ Generate all assets</b> to spin up the visual pack and design system in parallel.
            The landing page renders after the design system is ready.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={onGenVisuals} className="text-bodysm bg-cream border-2 border-ink text-ink px-4 py-1.5 rounded-pill">
              Visuals only
            </button>
            <button onClick={onGenDesign} className="text-bodysm bg-cream border-2 border-ink text-ink px-4 py-1.5 rounded-pill">
              Design system only
            </button>
          </div>
        </Card>
      )}
    </section>
  );
}

function Step2View({ designed }: { designed: Designed }) {
  const s = designed.strategy || {};
  return (
    <section className="mt-8">
      <h2 className="text-h3 font-bold mb-4">Design system</h2>
      {s.brand_archetype && (
        <Card featured className="mb-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-caption uppercase tracking-widest text-dark-gray">Archetype</p>
              <p className="text-large font-bold">{s.brand_archetype}</p>
              <p className="text-bodysm mt-3 text-dark-gray">{s.positioning_statement}</p>
            </div>
            <div className="text-bodysm">
              {s.target_audience && (<p className="mb-2"><span className="text-caption uppercase text-dark-gray">Audience: </span>{s.target_audience}</p>)}
              {s.mood_keywords && (<p className="mb-2"><span className="text-caption uppercase text-dark-gray">Mood: </span>{s.mood_keywords.join(" · ")}</p>)}
              {s.voice_examples && (
                <div className="mt-3">
                  <p className="text-caption uppercase text-dark-gray">Voice</p>
                  <ul className="mt-1 space-y-1">
                    {s.voice_examples.map((v, i) => <li key={i} className="italic">&quot;{v}&quot;</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </Card>
      )}
      <Card>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-large font-bold">design.md</h3>
          <button
            onClick={() => {
              const blob = new Blob([designed.design_md], { type: "text/markdown" });
              const a = document.createElement("a");
              a.href = URL.createObjectURL(blob);
              a.download = "design.md";
              a.click();
            }}
            className="text-bodysm bg-ink text-white px-4 py-1.5 rounded-pill"
          >
            Download
          </button>
        </div>
        <pre className="text-small bg-offset rounded-card p-4 overflow-auto max-h-[60vh] whitespace-pre-wrap font-mono">
          {designed.design_md}
        </pre>
      </Card>
    </section>
  );
}

function Step3View({ built }: { built: Built }) {
  const sections = built.outline?.sections || [];
  const [mode, setMode] = useState<"iframe" | "shadow">("iframe");

  return (
    <section className="mt-8">
      <h2 className="text-h3 font-bold mb-4">Landing page</h2>
      {sections.length > 0 && (
        <Card className="mb-4">
          <p className="text-caption uppercase tracking-widest text-dark-gray mb-3">Section outline</p>
          <ol className="grid md:grid-cols-2 gap-2 text-bodysm">
            {sections.map((s, i) => (
              <li key={i} className="bg-cream border-2 border-ink rounded p-3">
                <span className="text-caption uppercase text-dark-gray">{s.type}</span>
                <p className="font-medium">{s.heading}</p>
              </li>
            ))}
          </ol>
        </Card>
      )}
      <Card featured>
        <div className="flex items-center justify-between mb-3 gap-3 flex-wrap">
          <h3 className="text-large font-bold">Live preview</h3>
          <div className="flex gap-1 bg-cream border-2 border-ink rounded-pill p-1">
            <button
              onClick={() => setMode("iframe")}
              className={`text-bodysm px-3 py-1 rounded-pill ${mode === "iframe" ? "bg-ink text-white" : "text-ink"}`}
            >
              iframe
            </button>
            <button
              onClick={() => setMode("shadow")}
              className={`text-bodysm px-3 py-1 rounded-pill ${mode === "shadow" ? "bg-ink text-white" : "text-ink"}`}
            >
              shadow DOM
            </button>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                const blob = new Blob([built.html], { type: "text/html" });
                const a = document.createElement("a");
                a.href = URL.createObjectURL(blob);
                a.download = "landing.html";
                a.click();
              }}
              className="text-bodysm bg-ink text-white px-4 py-1.5 rounded-pill"
            >
              Download
            </button>
            <button
              onClick={() => {
                const w = window.open();
                if (w) { w.document.write(built.html); w.document.close(); }
              }}
              className="text-bodysm bg-pink text-ink px-4 py-1.5 rounded-pill"
            >
              Open in new tab
            </button>
          </div>
        </div>
        {mode === "iframe" ? (
          <iframe
            srcDoc={built.html}
            className="w-full h-[80vh] border-2 border-ink rounded-card bg-white"
            sandbox="allow-scripts"
            title="Generated landing page"
          />
        ) : (
          <ShadowPreview html={built.html} />
        )}
      </Card>
    </section>
  );
}

function ShadowPreview({ html }: { html: string }) {
  const hostRef = useRef<HTMLDivElement>(null);

  // Strip the outer <html>/<head>/<body> shell, keep <link>+<style>+body content.
  // Shadow DOM accepts <link>, <style> and arbitrary HTML — it does NOT accept
  // a full HTML document, so we extract the relevant pieces.
  const { headHtml, bodyHtml } = useMemo(() => parseDoc(html), [html]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    shadow.innerHTML = `
      <style>:host { all: initial; display: block; font: inherit; color: inherit; }</style>
      ${headHtml}
      <div class="brand-preview-root">${bodyHtml}</div>
    `;
  }, [headHtml, bodyHtml]);

  return (
    <div className="border-2 border-ink rounded-card bg-white overflow-auto h-[80vh]">
      <div ref={hostRef} className="block" />
    </div>
  );
}

function parseDoc(html: string) {
  // Pull out <link rel="stylesheet"> + <style> from <head>, body innerHTML from <body>.
  // Falls back gracefully if HTML is malformed.
  if (typeof window === "undefined") return { headHtml: "", bodyHtml: html };
  try {
    const doc = new DOMParser().parseFromString(html, "text/html");
    const links = Array.from(doc.head.querySelectorAll('link[rel="stylesheet"], link[rel="preconnect"], link[as="font"]'));
    const styles = Array.from(doc.head.querySelectorAll("style"));
    const headHtml = [...links, ...styles].map((n) => n.outerHTML).join("\n");
    const bodyHtml = doc.body.innerHTML;
    return { headHtml, bodyHtml };
  } catch {
    return { headHtml: "", bodyHtml: html };
  }
}
