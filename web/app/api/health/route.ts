import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const maxDuration = 30;

const N8N_BASE = process.env.N8N_BASE_URL ?? "http://localhost:5678/webhook/brand";
const PROBE_TIMEOUT_MS = 3000;

type ProbeStatus = "up" | "down" | "auth_error" | "skipped";

type ProbeResult = {
  status: ProbeStatus;
  latency_ms: number;
  detail?: string;
};

async function withTimeout(
  fn: (signal: AbortSignal) => Promise<ProbeResult>,
): Promise<ProbeResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROBE_TIMEOUT_MS);
  try {
    return await fn(controller.signal);
  } finally {
    clearTimeout(timer);
  }
}

async function probeN8n(): Promise<ProbeResult> {
  const start = Date.now();
  return withTimeout(async (signal) => {
    try {
      const res = await fetch(`${N8N_BASE}/decode`, { method: "HEAD", signal });
      const latency_ms = Date.now() - start;
      if ([200, 204, 404, 405].includes(res.status)) {
        return { status: "up", latency_ms, detail: `http ${res.status}` };
      }
      return { status: "down", latency_ms, detail: `unexpected status ${res.status}` };
    } catch (err) {
      return {
        status: "down",
        latency_ms: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

async function probeMoonshot(): Promise<ProbeResult> {
  const key = process.env.KIMI_API_KEY;
  if (!key) {
    return { status: "skipped", latency_ms: 0, detail: "KIMI_API_KEY not set" };
  }
  const start = Date.now();
  return withTimeout(async (signal) => {
    try {
      const res = await fetch("https://api.moonshot.ai/v1/models", {
        method: "GET",
        headers: { Authorization: `Bearer ${key}` },
        signal,
      });
      const latency_ms = Date.now() - start;
      if (res.status === 200) return { status: "up", latency_ms };
      if (res.status === 401) {
        return { status: "auth_error", latency_ms, detail: "401 unauthorized" };
      }
      return { status: "down", latency_ms, detail: `http ${res.status}` };
    } catch (err) {
      return {
        status: "down",
        latency_ms: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

async function probeFirecrawl(): Promise<ProbeResult> {
  const start = Date.now();
  return withTimeout(async (signal) => {
    try {
      const res = await fetch("https://api.firecrawl.dev/v2/health", {
        method: "GET",
        signal,
      });
      const latency_ms = Date.now() - start;
      if (res.ok) return { status: "up", latency_ms, detail: `http ${res.status}` };
      // fall back to root HEAD
      try {
        const fallback = await fetch("https://api.firecrawl.dev", {
          method: "HEAD",
          signal,
        });
        const lat = Date.now() - start;
        if (fallback.status < 500) {
          return { status: "up", latency_ms: lat, detail: `head ${fallback.status}` };
        }
        return { status: "down", latency_ms: lat, detail: `http ${fallback.status}` };
      } catch (err) {
        return {
          status: "down",
          latency_ms: Date.now() - start,
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    } catch (err) {
      return {
        status: "down",
        latency_ms: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

async function probeFal(): Promise<ProbeResult> {
  const start = Date.now();
  return withTimeout(async (signal) => {
    try {
      const res = await fetch("https://fal.run/health", { method: "GET", signal });
      const latency_ms = Date.now() - start;
      if (res.ok) return { status: "up", latency_ms, detail: `http ${res.status}` };
      try {
        const fallback = await fetch("https://fal.run", { method: "HEAD", signal });
        const lat = Date.now() - start;
        if (fallback.status < 500) {
          return { status: "up", latency_ms: lat, detail: `head ${fallback.status}` };
        }
        return { status: "down", latency_ms: lat, detail: `http ${fallback.status}` };
      } catch (err) {
        return {
          status: "down",
          latency_ms: Date.now() - start,
          detail: err instanceof Error ? err.message : String(err),
        };
      }
    } catch (err) {
      return {
        status: "down",
        latency_ms: Date.now() - start,
        detail: err instanceof Error ? err.message : String(err),
      };
    }
  });
}

export async function GET() {
  const [n8n, moonshot, firecrawl, fal] = await Promise.all([
    probeN8n(),
    probeMoonshot(),
    probeFirecrawl(),
    probeFal(),
  ]);

  const services = { n8n, moonshot, firecrawl, fal };
  const ok = Object.values(services).every(
    (s) => s.status === "up" || s.status === "skipped",
  );

  return NextResponse.json(
    {
      ok,
      checked_at: new Date().toISOString(),
      services,
    },
    { status: ok ? 200 : 503 },
  );
}
