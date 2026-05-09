import { NextRequest, NextResponse } from "next/server";
import { sql, isDbConfigured } from "@/lib/db";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  const limitRaw = parseInt(searchParams.get("limit") ?? "20", 10);
  const limit = Number.isFinite(limitRaw)
    ? Math.min(100, Math.max(1, limitRaw))
    : 20;
  const email = searchParams.get("email")?.trim() || null;

  if (!isDbConfigured()) {
    return NextResponse.json(
      {
        runs: [],
        persisted: false,
        hint: "set DATABASE_URL and add Postgres nodes to the n8n workflow to enable history",
      },
      { status: 200 }
    );
  }

  try {
    const rows = email
      ? await sql`
          SELECT br.id, br.source_url, br.brand_name, br.branding, br.copy, br.screenshot_url, br.created_at
          FROM brand_run br
          JOIN app_user au ON au.id = br.user_id
          WHERE au.email = ${email}
          ORDER BY br.created_at DESC
          LIMIT ${limit}
        `
      : await sql`
          SELECT id, source_url, brand_name, branding, copy, screenshot_url, created_at
          FROM brand_run
          ORDER BY created_at DESC
          LIMIT ${limit}
        `;

    return NextResponse.json({ runs: rows, persisted: true }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        error: message,
        persisted: true,
        hint: "schema may not be applied; run `make db`",
      },
      { status: 500 }
    );
  }
}
