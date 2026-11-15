import { z } from "zod";
import { chat } from "@/server/services/agent";
import { requestIp } from "@/server/request-ip";
import { tryConsumeRate } from "@/server/rate-limit";
import {
  AppError,
  errorResponse,
  noStore,
  readJson,
  requireSameOrigin,
} from "@/server/http";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// Up to three sequential provider calls, plus moderation, on Vercel.
export const maxDuration = 60;

const historyEntry = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(1000),
});
const chatSchema = z.object({
  message: z.string().trim().min(1).max(1000),
  history: z.array(historyEntry).max(8).optional(),
});

const RATE_WINDOW_MS = 60_000;

/**
 * Two fixed-window counters: one per caller and one global backstop. SQLite
 * transactions are not re-entrant, so the counters are consumed in sequence
 * rather than with Promise.all.
 */
async function enforceRateLimit(request: Request) {
  const caller = await tryConsumeRate(
    `agent:caller:${requestIp(request)}`,
    Number(process.env.AGENT_RATE_LIMIT) || 20,
    RATE_WINDOW_MS,
  );
  const global = await tryConsumeRate(
    "agent:global",
    Number(process.env.AGENT_GLOBAL_RATE_LIMIT) || 120,
    RATE_WINDOW_MS,
  );
  if (caller.allowed && global.allowed) return;
  const retryAfter = Math.max(1, caller.retryAfter, global.retryAfter);
  const minutes = Math.max(1, Math.ceil(retryAfter / 60));
  throw new AppError(
    `The guide is taking a short break. Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    429,
    "RATE_LIMITED",
    { "Retry-After": String(retryAfter) },
  );
}

export async function POST(request: Request) {
  try {
    requireSameOrigin(request);
    await enforceRateLimit(request);
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
