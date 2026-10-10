import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";
import { getDemoSession } from "@/lib/session";
import { createSupabase, supabaseConfigured } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getDemoSession();
  if (session) redirect("/app");

  // Supabase still signed in → restore panel cookies instead of showing login.
  if (supabaseConfigured()) {
    try {
      const supabase = await createSupabase();
      const { data } = await supabase.auth.getUser();
      if (data.user?.email) {
        redirect("/auth/restore?next=/app");
      }
    } catch {
      /* show login */
    }
  }

  const q = await searchParams;
  return (
    <LoginScreen oauth={supabaseConfigured()} error={q.error ?? null} />
  );
}
