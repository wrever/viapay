import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { API_KEY_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { createSupabase, supabaseConfigured } from "@/lib/supabase";

export async function GET(req: Request) {
  const origin = publicOrigin(req);
  if (supabaseConfigured()) {
    try {
      const supabase = await createSupabase();
      await supabase.auth.signOut();
    } catch {
      // still clear cookies
    }
  }
  const res = NextResponse.redirect(`${origin}/login`);
  res.cookies.set(SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(API_KEY_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
