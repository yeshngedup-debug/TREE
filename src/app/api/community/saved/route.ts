import {
  accountForRequest,
  listSavedPosts,
} from "@/server/community";
import {
  AppError,
  errorResponse,
  noStore,
} from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError("Sign in to see saved posts.", 401, "UNAUTHORIZED");
    const posts = await listSavedPosts(account.id);
    return Response.json({ posts }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
