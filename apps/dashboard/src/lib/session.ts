import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

export const SESSION_COOKIE = "viapay_demo_session";
export const API_KEY_COOKIE = "viapay_test_api_key";

/** 30 days — panel session TTL (no sliding renewal). */
export const SESSION_MAX_AGE_SEC = 60 * 60 * 24 * 30;

export type DemoSession = {
  name: string;
  email: string;
};

export function panelCookieOptions(secure: boolean) {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    path: "/",
    maxAge: SESSION_MAX_AGE_SEC,
    expires: new Date(Date.now() + SESSION_MAX_AGE_SEC * 1000),
    secure,
  };
}

export function encodeDemoSession(session: DemoSession): string {
  return Buffer.from(JSON.stringify(session), "utf8").toString("base64url");
}

/** Attach panel cookies to a Route Handler response (and optionally the request jar). */
export async function applyPanelCookies(
  res: NextResponse,
  input: { name: string; email: string; apiKey: string },
  opts?: { secure?: boolean; alsoJar?: boolean },
) {
  const secure = opts?.secure ?? true;
  const cookieOpts = panelCookieOptions(secure);
  const sessionVal = encodeDemoSession({
    name: input.name,
    email: input.email,
  });
  res.cookies.set(SESSION_COOKIE, sessionVal, cookieOpts);
  res.cookies.set(API_KEY_COOKIE, input.apiKey, cookieOpts);

  if (opts?.alsoJar !== false) {
    try {
      const jar = await cookies();
      jar.set(SESSION_COOKIE, sessionVal, cookieOpts);
      jar.set(API_KEY_COOKIE, input.apiKey, cookieOpts);
    } catch {
      // RSC / edge contexts cannot always mutate the jar; response cookies still apply.
    }
  }
}

export async function getDemoSession(): Promise<DemoSession | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  try {
    const parsed = JSON.parse(
      Buffer.from(raw, "base64url").toString("utf8"),
    ) as DemoSession;
    if (!parsed?.email || !parsed?.name) return null;
    return parsed;
  } catch {
    return null;
  }
}

export async function getApiKey() {
  const jar = await cookies();
  return jar.get(API_KEY_COOKIE)?.value ?? null;
}
