import { signupSchema } from "@/lib/community";
import {
  communityCookie,
  createAccount,
  rateLimit,
  requestIp,
  startSession,
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

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await rateLimit(
      `community:signup:${requestIp(request)}`,
      6,
      60 * 60 * 1000,
    );
    const parsed = signupSchema.safeParse(await readJson(request, 8192));
    if (!parsed.success)
      throw new AppError(
        parsed.error.issues[0]?.message ?? "Check your details.",
        400,
        "INVALID_REQUEST",
      );
    const account = await createAccount(parsed.data);
    const session = await startSession(account.id);
    return Response.json(
      { account },
      {
        status: 201,
        headers: {
          ...noStore,
          "Set-Cookie": communityCookie(
            request,
            session.token,
            session.maxAge,
          ),
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
