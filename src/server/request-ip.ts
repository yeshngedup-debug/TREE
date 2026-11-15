import { createHash } from "node:crypto";

/**
 * A stable, privacy-preserving rate-limit key for the caller.
 *
 * The raw address never leaves this function: only a truncated SHA-256 digest
 * is used, so the rate-limit table cannot be turned into an address log. On a
 * platform that terminates TLS the left-most `x-forwarded-for` entry is the
 * client; direct callers can spoof it, which is why a global cap backs it up.
 */
export function requestIp(request: Request) {
  const forwarded = request.headers.get("x-forwarded-for");
  const raw =
    forwarded?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local";
  return createHash("sha256").update(raw).digest("hex").slice(0, 24);
}
