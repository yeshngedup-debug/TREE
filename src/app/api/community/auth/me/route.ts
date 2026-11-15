import { accountForRequest } from "@/server/community";
import { errorResponse, noStore } from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const account = await accountForRequest(request);
    return Response.json(
      { authenticated: Boolean(account), account },
      { headers: noStore },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
