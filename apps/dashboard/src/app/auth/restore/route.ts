import { NextResponse } from "next/server";
import { linkAccountFromEmail } from "@/lib/link-account";
import { publicOrigin } from "@/lib/origin";
import { applyPanelCookies, getApiKey } from "@/lib/session";
import { createSupabase, supabaseConfigured } from "@/lib/supabase";

/**
 * Re-hydrate panel cookies from a live Supabase Auth session.
 * Used when viapay_* cookies were dropped but the user is still signed in to Supabase.
 */
export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const nextPath = safeNext(new URL(req.url).searchParams.get("next"));

  if (!supabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=supabase`);
  }

  try {
    const supabase = await createSupabase();
    const { data, error } = await supabase.auth.getUser();
    const user = data.user;
    if (error || !user?.email) {
      return NextResponse.redirect(`${origin}/login`);
    }

    const email = user.email;
    const name =
      (user.user_metadata?.full_name as string | undefined) ??
      (user.user_metadata?.name as string | undefined) ??
      email;

    const existingKey = await getApiKey();
    let linked = await linkAccountFromEmail(email, name);
    if (!linked.api_key) {
      if (existingKey) {
        linked = { ...linked, api_key: existingKey };
      } else {
        linked = await linkAccountFromEmail(email, name, {
          forceRotate: true,
        });
      }
    }
    if (!linked.api_key) {
      return NextResponse.redirect(`${origin}/login?error=link`);
    }

    // Relative redirect keeps Set-Cookie on the same host as the request.
    const res = NextResponse.redirect(new URL(nextPath, req.url));
    await applyPanelCookies(
      res,
      {
        name: linked.name,
        email: linked.email,
        apiKey: linked.api_key,
      },
      { secure: origin.startsWith("https") },
    );
    return res;
  } catch {
    return NextResponse.redirect(`${origin}/login?error=link`);
  }
}

function safeNext(raw: string | null): string {
  if (!raw || !raw.startsWith("/") || raw.startsWith("//")) return "/app";
  return raw;
}
