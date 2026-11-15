import { moderationActionSchema } from "@/lib/community";
import {
  applyModerationAction,
  moderationOverview,
  moderatorForRequest,
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

async function actorOrThrow(request: Request) {
  const actor = await moderatorForRequest(request);
  if (!actor)
    throw new AppError(
      "Sign in with a moderator or staff account.",
      401,
      "UNAUTHORIZED",
    );
  return actor;
}

export async function GET(request: Request) {
  try {
    const actor = await actorOrThrow(request);
    const overview = await moderationOverview();
    return Response.json({ overview, actor }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const actor = await actorOrThrow(request);
    const parsed = moderationActionSchema.safeParse(
      await readJson(request, 8192),
    );
    if (!parsed.success)
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Check the moderation action.",
        400,
        "INVALID_REQUEST",
      );
    const overview = await applyModerationAction(actor, parsed.data);
    return Response.json({ overview }, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
