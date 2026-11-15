import { cookieValue } from "@/server/auth";
import {
  COMMUNITY_COOKIE,
  communityCookie,
  endSession,
} from "@/server/community";
import { errorResponse, noStore, requireSameOrigin } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const token = cookieValue(request, COMMUNITY_COOKIE) ?? "";
    await endSession(token);
    return Response.json(
      { authenticated: false },
      {
        headers: {
          ...noStore,
          "Set-Cookie": communityCookie(request, "", 0),
        },
      },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
