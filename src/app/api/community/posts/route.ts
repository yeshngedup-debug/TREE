import {
  parseCommunityQuery,
  postCreateSchema,
} from "@/lib/community";
import {
  accountForRequest,
  createPost,
  listPosts,
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

export async function GET(request: Request) {
  try {
    const params = Object.fromEntries(new URL(request.url).searchParams);
    const query = parseCommunityQuery(params);
    const result = await listPosts(query);
    return Response.json(result, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError(
        "Create a free account to publish.",
        401,
        "UNAUTHORIZED",
      );
    await rateLimit(`community:post:${account.id}`, 10, 60 * 60 * 1000);
    await rateLimit(
      `community:post-ip:${requestIp(request)}`,
      20,
      60 * 60 * 1000,
    );
    const parsed = postCreateSchema.safeParse(await readJson(request, 20000));
    if (!parsed.success)
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Check your post.",
        400,
        "INVALID_REQUEST",
      );
    const post = await createPost(account, parsed.data);
    return Response.json({ post }, { status: 201, headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
