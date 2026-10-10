import { NextResponse } from "next/server";
import {
  API_KEY_COOKIE,
  SESSION_COOKIE,
  encodeDemoSession,
  getApiKey,
  getDemoSession,
  panelCookieOptions,
} from "@/lib/session";

/** Sync display name in the panel session cookie after /v1/me PATCH. */
export async function POST(req: Request) {
  const session = await getDemoSession();
  if (!session) {
    return NextResponse.json({ error: "no_session" }, { status: 401 });
  }

  let name: string;
  try {
    const body = (await req.json()) as { name?: unknown };
    name = typeof body.name === "string" ? body.name.trim() : "";
  } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  if (name.length < 1 || name.length > 80) {
    return NextResponse.json({ error: "invalid_name" }, { status: 400 });
  }

  const apiKey = await getApiKey();
  const secure =
    process.env.NODE_ENV === "production" ||
    req.headers.get("x-forwarded-proto") === "https";
  const opts = panelCookieOptions(secure);
  const res = NextResponse.json({ ok: true, name });
  res.cookies.set(
    SESSION_COOKIE,
    encodeDemoSession({ name, email: session.email }),
    opts,
  );
  if (apiKey) {
    res.cookies.set(API_KEY_COOKIE, apiKey, opts);
  }
  return res;
}
