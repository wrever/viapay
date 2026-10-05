import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let singleton: SupabaseClient | null = null;

/** True when API should persist to Supabase Postgres (service role). */
export function usesSupabase(): boolean {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  return Boolean(url && key);
}

export function getSupabaseAdmin(): SupabaseClient {
  if (singleton) return singleton;
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error(
      "Falta SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY para el backend Postgres",
    );
  }
  singleton = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return singleton;
}

export function throwSb(error: { message: string } | null, fallback: string) {
  if (error) throw new Error(error.message || fallback);
}
