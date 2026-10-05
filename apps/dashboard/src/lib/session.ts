import { cookies } from "next/headers";

export const SESSION_COOKIE = "viapay_demo_session";
export const API_KEY_COOKIE = "viapay_test_api_key";

export async function getDemoSession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      name: string;
      email: string;
    };
  } catch {
    return null;
  }
}

export async function getApiKey() {
  const jar = await cookies();
  return jar.get(API_KEY_COOKIE)?.value ?? null;
}
