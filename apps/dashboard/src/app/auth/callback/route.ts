import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { linkAccountFromEmail } from "@/lib/link-account";
import { applyPanelCookies, API_KEY_COOKIE } from "@/lib/session";

function supabaseKey() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  );
}

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  if (!code) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const sbUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const sbKey = supabaseKey();
  if (!sbUrl || !sbKey) {
    return NextResponse.redirect(new URL("/login?error=supabase", request.url));
  }

  // Bind auth cookies to the redirect response (official SSR pattern).
  let response = NextResponse.redirect(new URL("/app", request.url));

  const supabase = createServerClient(sbUrl, sbKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.redirect(new URL("/app", request.url));
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  const exchanged = await supabase.auth.exchangeCodeForSession(code);
  if (exchanged.error || !exchanged.data.session?.user) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }

  const user = exchanged.data.session.user;
  const email = user.email;
  if (!email) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url));
  }
  const name =
    (user.user_metadata?.full_name as string | undefined) ??
    (user.user_metadata?.name as string | undefined) ??
    email;

  try {
    const existingKey = request.cookies.get(API_KEY_COOKIE)?.value ?? null;
    let linked = await linkAccountFromEmail(email, name);

    if (!linked.api_key) {
      if (existingKey) {
        linked = { ...linked, api_key: existingKey };
      } else {
        linked = await linkAccountFromEmail(email, name, { forceRotate: true });
      }
    }

    if (!linked.api_key) {
      return NextResponse.redirect(new URL("/login?error=link", request.url));
    }

    // Panel cookies after setAll may have rebuilt `response`.
    const secure =
      request.nextUrl.protocol === "https:" || Boolean(process.env.VERCEL);
    await applyPanelCookies(
      response,
      {
        name: linked.name,
        email: linked.email,
        apiKey: linked.api_key,
      },
      { secure, alsoJar: false },
    );
    return response;
  } catch {
    return NextResponse.redirect(new URL("/login?error=link", request.url));
  }
}
