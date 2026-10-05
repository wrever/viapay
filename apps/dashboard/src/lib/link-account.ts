import { createHash, randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { generatePrefixedId } from "@viapay/shared";

function hashSecret(secret: string) {
  return createHash("sha256").update(secret).digest("hex");
}

function generateApiKey(mode: "test" | "live" = "live") {
  const id = generatePrefixedId("key");
  const secret = `sk_${mode}_${randomBytes(24).toString("base64url")}`;
  return {
    id,
    prefix: secret.slice(0, 16),
    secret,
    secretHash: hashSecret(secret),
  };
}

function adminClient() {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key =
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
  if (!url || !key) {
    throw new Error("Falta SUPABASE_SERVICE_ROLE_KEY en el panel");
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export type LinkedAccount = {
  email: string;
  name: string;
  api_key: string | null;
  account_id: string;
  reused: boolean;
};

/**
 * Upsert comercio en Postgres. Si ya hay API key activa, no inserta otra
 * (el secreto no se puede recuperar del hash). Si no hay cookie usable, rota.
 */
export async function linkAccountFromEmail(
  email: string,
  name: string,
  opts?: { forceRotate?: boolean },
): Promise<LinkedAccount> {
  const db = adminClient();
  const now = new Date().toISOString();

  const existing = await db
    .from("accounts")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  let accountId = existing.data?.id as string | undefined;
  if (!accountId) {
    accountId = generatePrefixedId("acct");
    const inserted = await db.from("accounts").insert({
      id: accountId,
      name,
      email,
      status: "active",
      created_at: now,
      updated_at: now,
    });
    if (inserted.error) {
      throw new Error(inserted.error.message);
    }
  } else {
    await db
      .from("accounts")
      .update({ name, updated_at: now })
      .eq("id", accountId);
  }

  const active = await db
    .from("api_keys")
    .select("id, created_at")
    .eq("account_id", accountId)
    .is("revoked_at", null)
    .order("created_at", { ascending: false });

  if (active.error) throw new Error(active.error.message);

  const keys = active.data ?? [];
  const hasActive = keys.length > 0;

  // Keep only the newest active key; revoke duplicates from prior logins.
  if (keys.length > 1) {
    const keepId = keys[0]!.id;
    const revokeIds = keys.slice(1).map((k) => k.id);
    await db
      .from("api_keys")
      .update({ revoked_at: now })
      .in("id", revokeIds)
      .neq("id", keepId);
  }

  if (hasActive && !opts?.forceRotate) {
    return {
      email,
      name,
      api_key: null,
      account_id: accountId,
      reused: true,
    };
  }

  if (hasActive && opts?.forceRotate) {
    await db
      .from("api_keys")
      .update({ revoked_at: now })
      .eq("account_id", accountId)
      .is("revoked_at", null);
  }

  const key = generateApiKey("live");
  const keyIns = await db.from("api_keys").insert({
    id: key.id,
    account_id: accountId,
    name: "oauth",
    prefix: key.prefix,
    secret_hash: key.secretHash,
    mode: "live",
    created_at: now,
  });
  if (keyIns.error) {
    throw new Error(keyIns.error.message);
  }

  return {
    email,
    name,
    api_key: key.secret,
    account_id: accountId,
    reused: false,
  };
}
