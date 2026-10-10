import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { API_KEY_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { createSupabase, supabaseConfigured } from "@/lib/supabase";

/**
 * Sign-out must be POST. A GET handler used to clear cookies, and Next.js
 * <Link prefetch> was hitting it when the dashboard mounted — wiping the session.
 */
export async function GET(req: Request) {
  const origin = publicOrigin(req);
  // Do NOT clear cookies on GET (prefetch / accidental navigation).
  return NextResponse.redirect(`${origin}/app`);
}

export async function POST(req: Request) {
  const origin = publicOrigin(req);
  if (supabaseConfigured()) {
    try {
      const supabase = await createSupabase();
      await supabase.auth.signOut();
    } catch {
      // still clear cookies
    }
  }
  const res = NextResponse.redirect(`${origin}/login`, { status: 303 });
  const clear = {
    path: "/",
    maxAge: 0,
    expires: new Date(0),
    httpOnly: true,
    sameSite: "lax" as const,
    secure: origin.startsWith("https") || Boolean(process.env.VERCEL),
  };
  res.cookies.set(SESSION_COOKIE, "", clear);
  res.cookies.set(API_KEY_COOKIE, "", clear);
  return res;
}
