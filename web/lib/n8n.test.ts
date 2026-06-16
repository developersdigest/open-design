import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

mock.module("next/headers", () => ({
  headers: async () => new Headers({ "x-request-id": "test-request-id" }),
}));

const originalFetch = global.fetch;
let proxyToN8n: typeof import("./n8n").proxyToN8n;

describe("proxyToN8n", () => {
  beforeEach(async () => {
    // ensure deterministic base URL for assertions
    process.env.N8N_BASE_URL = "http://localhost:5678/webhook/brand";
    ({ proxyToN8n } = await import("./n8n"));
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  test("happy path — returns parsed JSON with upstream status", async () => {
    const payload = { ok: true, value: 42 };
    global.fetch = mock(
      async () =>
        new Response(JSON.stringify(payload), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;

    const res = await proxyToN8n("generate", { foo: "bar" });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual(payload);
  });

  test("fetch throws — returns 502 with reach-n8n error", async () => {
    global.fetch = mock(async () => {
      throw new Error("ECONNREFUSED");
    }) as unknown as typeof fetch;

    const res = await proxyToN8n("generate", {});
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toContain("couldn't reach n8n");
    expect(body.cause).toContain("ECONNREFUSED");
  });

  test("empty 404 response — hint mentions importing the workflow", async () => {
    global.fetch = mock(async () => new Response("", { status: 404 })) as unknown as typeof fetch;

    const res = await proxyToN8n("generate", {});
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toBe("empty response from n8n");
    expect(body.upstream_status).toBe(404);
    expect(body.hint).toContain("import the workflow");
  });

  test("non-JSON response — returns 502 with non-JSON error", async () => {
    global.fetch = mock(
      async () => new Response("<html>oops</html>", { status: 200 }),
    ) as unknown as typeof fetch;

    const res = await proxyToN8n("generate", {});
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.error).toMatch(/non-JSON/);
    expect(body.body).toContain("<html>");
  });
});
