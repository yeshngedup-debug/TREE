import { noStore } from "@/server/http";
import { aiMode } from "@/server/services/ai";
import { asyncRevision, databaseProvider } from "@/server/db";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    await asyncRevision();
    return Response.json(
      {
        status: "ok",
        database: databaseProvider(),
        ai: aiMode(),
        serverTime: new Date().toISOString(),
      },
      { headers: noStore },
    );
  } catch {
    return Response.json(
      { status: "unavailable" },
      { status: 503, headers: noStore },
    );
  }
}
