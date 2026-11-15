import { reportCreateSchema } from "@/lib/community";
import {
  accountForRequest,
  rateLimit,
  reportComment,
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

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError("Sign in to report a comment.", 401, "UNAUTHORIZED");
    await rateLimit(`community:report:${account.id}`, 10, 60 * 60 * 1000);
    const parsed = reportCreateSchema.safeParse(await readJson(request, 4096));
    if (!parsed.success)
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Choose a reason.",
        400,
        "INVALID_REQUEST",
      );
    const { id } = await params;
    const result = await reportComment(
      account,
      id,
      parsed.data.reason,
      parsed.data.detail,
    );
    return Response.json(result, { status: 201, headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
