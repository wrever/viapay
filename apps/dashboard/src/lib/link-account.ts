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

/** Upsert comercio + API key en Postgres (Supabase). Sin mock / sin SQLite local. */
export async function linkAccountFromEmail(email: string, name: string) {
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

  return { email, name, api_key: key.secret, account_id: accountId };
}
