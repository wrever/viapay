import { generatePrefixedId } from "@viapay/shared";
import { generateApiKey } from "@/lib/auth";
import { getDb } from "@/lib/db";
import { ensureDb, jsonError, jsonOk } from "@/lib/http";
import { getSupabaseAdmin, throwSb, usesSupabase } from "@/lib/supabase-admin";
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
    const user = (await userRes.json()) as {
      email?: string;
      user_metadata?: { name?: string; full_name?: string };
    };
    if (!user.email) {
      return jsonError(Object.assign(new Error("La cuenta no tiene email"), { status: 400 }));
    }
    const name = user.user_metadata?.name ?? user.user_metadata?.full_name ?? user.email;
    const linked = await linkAccount(user.email, name);
    return jsonOk(linked);
  } catch (e) {
    return jsonError(e);
  }
}

/** Create only if no active key; otherwise rotate (revoke + mint) so cookie gets a secret. */
async function linkAccount(email: string, name: string) {
  const now = new Date().toISOString();

  if (usesSupabase()) {
    const db = getSupabaseAdmin();
    const existing = await db
      .from("accounts")
      .select("id")
      .eq("email", email)
      .maybeSingle();
    throwSb(existing.error, "account lookup failed");
    let accountId = existing.data?.id as string | undefined;
    if (!accountId) {
      accountId = generatePrefixedId("acct");
      const ins = await db.from("accounts").insert({
        id: accountId,
        name,
        email,
        status: "active",
        created_at: now,
        updated_at: now,
      });
      throwSb(ins.error, "account insert failed");
    } else {
      await db.from("accounts").update({ name, updated_at: now }).eq("id", accountId);
    }

    const active = await db
      .from("api_keys")
      .select("id")
      .eq("account_id", accountId)
      .is("revoked_at", null)
      .limit(1);
    throwSb(active.error, "api_keys lookup failed");
    if (active.data && active.data.length > 0) {
      // Already has an active key — do not mint another. Caller must keep cookie
      // or rotate via dashboard link-account path. Return without secret.
      return { email, name, api_key: null as string | null, account_id: accountId, reused: true };
    }

    const key = generateApiKey("live");
    const keyIns = await db.from("api_keys").insert({
      id: key.id,
      account_id: accountId,
      name: "supabase oauth",
      prefix: key.prefix,
      secret_hash: key.secretHash,
      mode: "live",
      created_at: now,
    });
    throwSb(keyIns.error, "api_key insert failed");
    return { email, name, api_key: key.secret, account_id: accountId, reused: false };
  }

  const db = getDb();
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
  const active = db
    .prepare(
      `select id from api_keys where account_id = ? and revoked_at is null limit 1`,
    )
    .get(accountId) as { id: string } | undefined;
  if (active) {
    return { email, name, api_key: null as string | null, account_id: accountId, reused: true };
  }
  const key = generateApiKey("test");
  db.prepare(
    `insert into api_keys (id, account_id, name, prefix, secret_hash, mode, created_at)
     values (?, ?, 'supabase oauth', ?, ?, 'test', ?)`,
  ).run(key.id, accountId, key.prefix, key.secretHash, now);
  return { email, name, api_key: key.secret, account_id: accountId, reused: false };
}
