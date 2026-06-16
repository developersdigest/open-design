import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const originalFetch = global.fetch;
const originalKey = process.env.KIMI_API_KEY;

function makeRes(status: number): Response {
  return new Response(null, { status });
}

afterEach(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) {
    delete process.env.KIMI_API_KEY;
  } else {
    process.env.KIMI_API_KEY = originalKey;
  }
});

describe("GET /api/health", () => {
  test("happy path - all services up", async () => {
    process.env.KIMI_API_KEY = "test-key";
    global.fetch = mock(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("moonshot.ai")) return makeRes(200);
      if (url.includes("firecrawl.dev")) return makeRes(200);
      if (url.includes("fal.run")) return makeRes(200);
      // n8n
      return makeRes(200);
    }) as unknown as typeof fetch;

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.ok).toBe(true);
    expect(body.services.n8n.status).toBe("up");
    expect(body.services.moonshot.status).toBe("up");
    expect(body.services.firecrawl.status).toBe("up");
    expect(body.services.fal.status).toBe("up");
  });

  test("moonshot skipped when KIMI_API_KEY unset", async () => {
    delete process.env.KIMI_API_KEY;
    global.fetch = mock(async () => makeRes(200)) as unknown as typeof fetch;

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.services.moonshot.status).toBe("skipped");
    expect(body.ok).toBe(true);
    expect(response.status).toBe(200);
  });

  test("n8n down - fetch throws", async () => {
    process.env.KIMI_API_KEY = "test-key";
    global.fetch = mock(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("moonshot.ai")) return makeRes(200);
      if (url.includes("firecrawl.dev")) return makeRes(200);
      if (url.includes("fal.run")) return makeRes(200);
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(response.status).toBe(503);
    expect(body.ok).toBe(false);
    expect(body.services.n8n.status).toBe("down");
  });

  test("n8n returns 200 - treated as up", async () => {
    process.env.KIMI_API_KEY = "test-key";
    global.fetch = mock(async (input: string | URL | Request) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("moonshot.ai")) return makeRes(200);
      if (url.includes("firecrawl.dev")) return makeRes(200);
      if (url.includes("fal.run")) return makeRes(200);
      return makeRes(200);
    }) as unknown as typeof fetch;

    const { GET } = await import("./route");
    const response = await GET();
    const body = await response.json();

    expect(body.services.n8n.status).toBe("up");
  });
});
