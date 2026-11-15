import {
  accountForRequest,
  rateLimit,
  toggleLike,
} from "@/server/community";
import {
  AppError,
  errorResponse,
  noStore,
  requireSameOrigin,
} from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    requireSameOrigin(request);
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError("Sign in to like a post.", 401, "UNAUTHORIZED");
    await rateLimit(`community:like:${account.id}`, 120, 60 * 1000);
    const { slug } = await params;
    const engagement = await toggleLike(account.id, slug);
    return Response.json({ engagement }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
