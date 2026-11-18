import { treeStats } from "@/server/db";
import { noStore } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(await treeStats(), { headers: noStore });
  } catch {
    // A database failure is not a zero. Say so plainly instead of returning
    // invented counts that consumers would render as a genuinely empty tree.
    return Response.json(
      { error: "Tree statistics are temporarily unavailable." },
      { status: 503, headers: noStore },
    );
  }
}