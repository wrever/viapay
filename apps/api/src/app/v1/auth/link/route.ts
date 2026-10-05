import { generatePrefixedId } from "@viapay/shared";
import { generateApiKey } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureDb, jsonError, jsonOk } from "@/lib/http";
import { z } from "zod";

const schema = z.object({
  access_token: z.string().min(20),
});

export async function POST(req: Request) {
  try {
    ensureDb();
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apiKey =
      process.env.SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!supabaseUrl || !apiKey) {
      return jsonError(
        Object.assign(new Error("Supabase no está configurado"), { status: 400 }),
      );
    }
    const body = schema.parse(await req.json());
    const userRes = await fetch(`${supabaseUrl.replace(/\/$/, "")}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${body.access_token}`,
        apikey: apiKey,
      },
    });
    if (!userRes.ok) {
      return jsonError(Object.assign(new Error("Sesión de Supabase inválida"), { status: 401 }));
    }
    const user = (await userRes.json()) as { email?: string; user_metadata?: { name?: string; full_name?: string } };
    if (!user.email) {
      return jsonError(Object.assign(new Error("La cuenta no tiene email"), { status: 400 }));
    }
    const name = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email;
    const linked = linkAccount(user.email, name);
    return jsonOk(linked);
  } catch (e) {
    return jsonError(e);
  }
}

function linkAccount(email: string, name: string) {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = db.prepare(`select id from accounts where email = ?`).get(email) as
    | { id: string }
    | undefined;
  const accountId = existing?.id ?? generatePrefixedId("acct");
  if (!existing) {
    db.prepare(
      `insert into accounts (id, name, email, status, created_at, updated_at)
       values (?, ?, ?, 'active', ?, ?)`,
    ).run(accountId, name, email, now, now);
  }
  const key = generateApiKey("test");
  db.prepare(
    `insert into api_keys (id, account_id, name, prefix, secret_hash, mode, created_at)
     values (?, ?, 'supabase oauth', ?, ?, 'test', ?)`,
  ).run(key.id, accountId, key.prefix, key.secretHash, now);
  return { email, name, api_key: key.secret };
}
