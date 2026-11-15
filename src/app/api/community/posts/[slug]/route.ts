import { postUpdateSchema } from "@/lib/community";
import {
  accountForRequest,
  getPost,
  rateLimit,
  removePost,
  updatePost,
} from "@/server/community";
import {
  AppError,
  errorResponse,
  noStore,
  readJson,
  requireSameOrigin,
} from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    const { slug } = await params;
    const post = await getPost(slug);
    if (!post) throw new AppError("That post was not found.", 404, "NOT_FOUND");
    return Response.json({ post }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    requireSameOrigin(request);
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError("Sign in to edit your post.", 401, "UNAUTHORIZED");
    await rateLimit(`community:edit:${account.id}`, 30, 60 * 60 * 1000);
    const parsed = postUpdateSchema.safeParse(await readJson(request, 20000));
    if (!parsed.success)
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Check your post.",
        400,
        "INVALID_REQUEST",
      );
    const { slug } = await params;
    const post = await updatePost(account, slug, parsed.data);
    return Response.json({ post }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    requireSameOrigin(request);
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError("Sign in to remove your post.", 401, "UNAUTHORIZED");
    await rateLimit(`community:edit:${account.id}`, 30, 60 * 60 * 1000);
    const { slug } = await params;
    const result = await removePost(account, slug);
    return Response.json(result, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
