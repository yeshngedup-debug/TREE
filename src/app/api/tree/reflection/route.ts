import { currentReflection } from "@/server/db";
import { noStore } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    return Response.json(
      { reflection: await currentReflection() },
      { headers: noStore },
    );
  } catch {
    return Response.json({ reflection: null }, { headers: noStore });
  }
}
