import { NextResponse } from "next/server";
import { publicOrigin } from "@/lib/origin";
import { createSupabase, supabaseConfigured } from "@/lib/supabase";

export async function GET(req: Request) {
  // Un solo host en prod. Nunca redirect a localhost ni a subdomain.
  const origin = process.env.VERCEL
    ? "https://viapay.vercel.app"
    : publicOrigin(req);

  if (!supabaseConfigured()) {
    return NextResponse.redirect(`${origin}/login?error=supabase`);
  }
  const provider =
    new URL(req.url).searchParams.get("provider") === "github"
      ? "github"
      : "google";
  try {
    const supabase = await createSupabase();
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${origin}/auth/callback`,
      },
    });
    if (error || !data.url) {
      return NextResponse.redirect(`${origin}/login?error=oauth`);
    }
    return NextResponse.redirect(data.url);
  } catch {
    return NextResponse.redirect(`${origin}/login?error=supabase`);
  }
}
