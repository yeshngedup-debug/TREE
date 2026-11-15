import { profileUpdateSchema } from "@/lib/community";
import {
  accountForRequest,
  rateLimit,
  updateProfile,
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

export async function PATCH(request: Request) {
  try {
    requireSameOrigin(request);
    const account = await accountForRequest(request);
    if (!account)
      throw new AppError("Sign in to edit your profile.", 401, "UNAUTHORIZED");
    await rateLimit(`community:profile:${account.id}`, 20, 60 * 60 * 1000);
    const parsed = profileUpdateSchema.safeParse(
      await readJson(request, 8192),
    );
    if (!parsed.success)
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Check your profile.",
        400,
        "INVALID_REQUEST",
      );
    const updated = await updateProfile(account.id, parsed.data);
    return Response.json({ account: updated }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
