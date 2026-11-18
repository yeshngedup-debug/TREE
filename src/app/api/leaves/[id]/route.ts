import { getLeaf } from "@/server/db";
import { errorResponse, noStore } from "@/server/http";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params,
      leaf = await getLeaf(id);
    return leaf
      ? Response.json({ leaf }, { headers: noStore })
      : Response.json(
          { error: "This leaf is no longer on the public tree." },
          { status: 404, headers: noStore },
        );
  } catch (error) {
    // JSON error, not an HTML crash page: the join form can tell a missing
    // leaf (404) apart from a transient outage and keep the receipt.
    return errorResponse(error);
  }
}
