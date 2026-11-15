import { listCategories, popularTags } from "@/server/community";
import { errorResponse, noStore } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [categories, tags] = await Promise.all([
      listCategories(),
      popularTags(),
    ]);
    return Response.json({ categories, tags }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
