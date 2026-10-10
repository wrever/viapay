import type { AccountProfile } from "./account-types";
import { API } from "./config";

export async function fetchAccountProfile(
  apiKey: string,
): Promise<AccountProfile> {
  const res = await fetch(`${API}/v1/me`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  const data = (await res.json()) as {
    account?: AccountProfile;
    error?: string;
  };
  if (!res.ok || !data.account) {
    throw new Error(data.error || "profile_load_failed");
  }
  return data.account;
}

export async function patchAccountProfile(
  apiKey: string,
  body: Record<string, unknown>,
): Promise<AccountProfile> {
  const res = await fetch(`${API}/v1/me`, {
    method: "PATCH",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as {
    account?: AccountProfile;
    error?: string;
  };
  if (!res.ok || !data.account) {
    throw new Error(data.error || "profile_save_failed");
  }
  return data.account;
}
