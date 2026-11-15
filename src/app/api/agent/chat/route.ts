import { z } from "zod";
import { chat } from "@/server/services/agent";
import {
  AppError,
  errorResponse,
  noStore,
  readJson,
  requireSameOrigin,
} from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const historyEntry = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1000),
});
const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(historyEntry).max(8).optional(),
});

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    const body = await readJson(request, 16384);
    const parsed = chatSchema.safeParse(body);
    if (!parsed.success)
      throw new AppError(
        "Send a short message (up to 1,000 characters) and an optional short history.",
        422,
        "INVALID_REQUEST",
      );
    const reply = await chat(parsed.data.message, parsed.data.history ?? []);
    return Response.json(reply, { headers: noStore });
  } catch (error) {
    return errorResponse(error);
  }
}
