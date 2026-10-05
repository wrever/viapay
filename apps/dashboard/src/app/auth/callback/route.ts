import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { linkAccountFromEmail } from "@/lib/link-account";
import { publicOrigin } from "@/lib/origin";
import { API_KEY_COOKIE, SESSION_COOKIE } from "@/lib/session";
import { createSupabase } from "@/lib/supabase";

export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  if (!code) return NextResponse.redirect(`${origin}/login?error=oauth`);

  const supabase = await createSupabase();
  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  if (exchanged.error || !exchanged.data.session?.user) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }

  const user = exchanged.data.session.user;
  const email = user.email;
  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=oauth`);
  }
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    email;

  try {
    const jar = await cookies();
    const existingKey = jar.get(API_KEY_COOKIE)?.value ?? null;
    let linked = await linkAccountFromEmail(email, name);

    // Reused key has no recoverable secret: keep cookie, or rotate if missing.
    if (!linked.api_key) {
      if (existingKey) {
        linked = { ...linked, api_key: existingKey };
      } else {
        linked = await linkAccountFromEmail(email, name, { forceRotate: true });
      }
    }

    if (!linked.api_key) {
      return NextResponse.redirect(`${origin}/login?error=link`);
    }

    const res = NextResponse.redirect(`${origin}/app`);
    res.cookies.set(
      SESSION_COOKIE,
      Buffer.from(
        JSON.stringify({ name: linked.name, email: linked.email }),
        "utf8",
      ).toString("base64url"),
      { httpOnly: true, sameSite: "lax", path: "/", maxAge: 60 * 60 * 24 * 30 },
    );
    res.cookies.set(API_KEY_COOKIE, linked.api_key, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
      secure: origin.startsWith("https"),
    });
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }
}
