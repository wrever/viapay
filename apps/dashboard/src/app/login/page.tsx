import { redirect } from "next/navigation";
import { LoginScreen } from "@/components/LoginScreen";
import { getDemoSession } from "@/lib/session";
import { supabaseConfigured } from "@/lib/supabase";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await getDemoSession();
  if (session) redirect("/app");
  const q = await searchParams;
  return (
    <LoginScreen oauth={supabaseConfigured()} error={q.error ?? null} />
  );
}
