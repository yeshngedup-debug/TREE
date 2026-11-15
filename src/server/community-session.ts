import { cookies } from "next/headers";
import { COMMUNITY_COOKIE, accountForToken } from "@/server/community";

/**
 * Resolves the signed-in community account for server components and route
 * handlers. The session token is opaque; only its hash is stored.
 */
export async function currentAccount() {
  const store = await cookies();
  const token = store.get(COMMUNITY_COOKIE)?.value;
  return token ? accountForToken(token) : null;
}
