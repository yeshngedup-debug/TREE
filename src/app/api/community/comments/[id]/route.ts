import {
  accountForRequest,
  deleteComment,
} from "@/server/community";
import {
  AppError,
  errorResponse,
  noStore,
  requireSameOrigin,
} from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    requireSameOrigin(request);
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError("Sign in to delete a comment.", 401, "UNAUTHORIZED");
    const { id } = await params;
    const result = await deleteComment(account, id);
    return Response.json(result, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
