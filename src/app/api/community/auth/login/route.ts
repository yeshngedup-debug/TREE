import { loginSchema } from "@/lib/community";
import {
  authenticate,
  communityCookie,
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
      `community:login:${requestIp(request)}`,
      30,
      10 * 60 * 1000,
    );
    const parsed = loginSchema.safeParse(await readJson(request, 8192));
    if (!parsed.success)
      throw new AppError(
        "Enter your username and password.",
        400,
        "INVALID_REQUEST",
      );
    await rateLimit(
      `community:login-user:${parsed.data.username}`,
      12,
      10 * 60 * 1000,
    );
    const account = await authenticate(parsed.data);
    if (!account)
      throw new AppError(
        "That username and password did not match.",
        401,
        "UNAUTHORIZED",
      );
    const session = await startSession(account.id);
    return Response.json(
      { account },
      {
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
