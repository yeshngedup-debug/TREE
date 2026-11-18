import { getTreeSettings } from "@/server/db";
import { defaultTreeSettings } from "@/lib/tree-settings";
import { noStore } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json({ settings: await getTreeSettings() }, {
      headers: noStore,
    });
  } catch {
    // Fail open: the tree keeps its last-known look during a database hiccup
    // (e.g. Neon cold wake) instead of breaking every page that reads settings.
    return Response.json({ settings: defaultTreeSettings }, { headers: noStore });
  }
}
