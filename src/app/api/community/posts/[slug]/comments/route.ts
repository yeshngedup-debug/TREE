import { commentCreateSchema } from "@/lib/community";
import {
  accountForRequest,
  createComment,
  getPost,
  listComments,
  rateLimit,
  requestIp,
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
    const comments = await listComments(post.id);
    return Response.json({ comments }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  try {
    requireSameOrigin(request);
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError(
        "Sign in to join the conversation.",
        401,
        "UNAUTHORIZED",
      );
    await rateLimit(`community:comment:${account.id}`, 30, 60 * 60 * 1000);
    await rateLimit(
      `community:comment-ip:${requestIp(request)}`,
      60,
      60 * 60 * 1000,
    );
    const parsed = commentCreateSchema.safeParse(await readJson(request, 8192));
    if (!parsed.success)
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Check your comment.",
        400,
        "INVALID_REQUEST",
      );
    const { slug } = await params;
    const comment = await createComment(account, slug, parsed.data.body);
    return Response.json({ comment }, { status: 201, headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
