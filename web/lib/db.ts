// Postgres helper backed by @neondatabase/serverless.
//
// Persistence is opt-in: if DATABASE_URL is unset, callers should treat the
// database as unavailable and return empty results rather than throwing.
// Use `isDbConfigured()` to gate persistence-dependent code paths, and only
// reach for `getDb()` / `sql` when you actually intend to query.
//
// Usage:
//   import { sql } from "@/lib/db";
//   const rows = await sql`SELECT * FROM brand_run WHERE id = ${id}`;

import { type NeonQueryFunction, neon } from "@neondatabase/serverless";

type SqlClient = NeonQueryFunction<false, false>;

let _client: SqlClient | null = null;

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getDb(): SqlClient {
  if (_client) return _client;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is not set. Persistence is opt-in - check isDbConfigured() before calling getDb() or sql.",
    );
  }
  _client = neon(url);
  return _client;
}

// Tagged-template proxy so callers can `import { sql } from "@/lib/db"` and
// use it directly: await sql`SELECT ...`. The underlying neon client is
// initialized lazily on first call.
export const sql: SqlClient = ((strings: TemplateStringsArray, ...values: unknown[]) => {
  return (getDb() as unknown as (s: TemplateStringsArray, ...v: unknown[]) => unknown)(strings, ...values);
}) as SqlClient;
