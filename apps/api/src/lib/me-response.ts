import type { AccountProfile } from "./account-profile";

/** Stable JSON shape for GET/PATCH /v1/me. */
export function meResponse(account: AccountProfile) {
  return { account };
}
