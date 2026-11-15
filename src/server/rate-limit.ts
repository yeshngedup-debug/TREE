import { consumeRate } from "@/server/db";

export type RateDecision = { allowed: boolean; retryAfter: number };

/**
 * Consumes one slot in a fixed-window counter.
 *
 * Rate limiting is abuse control, not a correctness requirement. When the
 * database is unreachable the request is allowed so the guide keeps working;
 * the failure is logged and provider spend limits remain the backstop.
 */
export async function tryConsumeRate(
  key: string,
  maximum: number,
  windowMs: number,
): Promise<RateDecision> {
  try {
    return await consumeRate(key, maximum, windowMs);
  } catch (error) {
    console.error(
      "Rate limit unavailable:",
      error instanceof Error ? error.message : String(error),
    );
    return { allowed: true, retryAfter: 0 };
  }
}
