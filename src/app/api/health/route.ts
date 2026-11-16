import { getDb } from "@/db";
import { sql } from "drizzle-orm";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return Response.json({ ok: true, mode: "local-first" });
  }
  try {
    await getDb().execute(sql`select 1`);
    return Response.json({ ok: true, mode: "database" });
  } catch {
    return Response.json({ ok: false }, { status: 500 });
  }
}
