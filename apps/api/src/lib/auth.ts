import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  generatePrefixedId,
  isValidStellarPubkey,
  resolveViaFeeBps,
} from "@viapay/shared";
import { getDb } from "./db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";

export class AuthError extends Error {
  status = 401;
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

export function hashSecret(secret: string): string {
  return createHash("sha256").update(secret).digest("hex");
}

export function generateApiKey(mode: "test" | "live" = "test") {
  const id = generatePrefixedId("key");
  const secret = `sk_${mode}_${randomBytes(24).toString("base64url")}`;
  return {
    id,
    prefix: secret.slice(0, 16),
    secret,
    secretHash: hashSecret(secret),
  };
}

export interface AuthContext {
  accountId: string;
  apiKeyId: string;
  mode: string;
  feeBps: number;
  merchantWallet: string | null;
  accountName: string;
}

type AuthRow = {
  api_key_id: string;
  account_id: string;
  mode: string;
  secret_hash: string;
  revoked_at: string | null;
  account_name: string;
  merchant_wallet: string | null;
};

function buildAuth(row: AuthRow, secret: string): AuthContext {
  if (row.revoked_at) throw new AuthError("Invalid API key");
  const a = Buffer.from(hashSecret(secret));
  const b = Buffer.from(row.secret_hash);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    throw new AuthError("Invalid API key");
  }
  const wallet =
    row.merchant_wallet && isValidStellarPubkey(row.merchant_wallet)
      ? row.merchant_wallet
      : null;
  return {
    accountId: row.account_id,
    apiKeyId: row.api_key_id,
    mode: row.mode,
    feeBps: resolveViaFeeBps(process.env.FEE_BPS),
    merchantWallet: wallet,
    accountName: row.account_name,
  };
}

async function authenticateSupabase(secret: string): Promise<AuthContext> {
  const prefix = secret.slice(0, 16);
  const db = getSupabaseAdmin();
  const keyRes = await db
    .from("api_keys")
    .select("id, account_id, mode, secret_hash, revoked_at")
    .eq("prefix", prefix)
    .is("revoked_at", null)
    .maybeSingle();
  throwSb(keyRes.error, "auth lookup failed");
  if (!keyRes.data) throw new AuthError("Invalid API key");

  const acctRes = await db
    .from("accounts")
    .select("id, name")
    .eq("id", keyRes.data.account_id)
    .maybeSingle();
  throwSb(acctRes.error, "account lookup failed");
  if (!acctRes.data) throw new AuthError("Invalid API key");

  const walletRes = await db
    .from("wallets")
    .select("address, verified_at, created_at")
    .eq("account_id", keyRes.data.account_id)
    .order("verified_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  throwSb(walletRes.error, "wallet lookup failed");

  return buildAuth(
    {
      api_key_id: keyRes.data.id,
      account_id: keyRes.data.account_id,
      mode: keyRes.data.mode,
      secret_hash: keyRes.data.secret_hash,
      revoked_at: keyRes.data.revoked_at,
      account_name: acctRes.data.name,
      merchant_wallet: walletRes.data?.address ?? null,
    },
    secret,
  );
}

function authenticateSqlite(secret: string): AuthContext {
  const prefix = secret.slice(0, 16);
  const row = getDb()
    .prepare(
      `select k.id as api_key_id, k.account_id, k.mode, k.secret_hash, k.revoked_at,
              a.name as account_name,
              (
                select address from wallets w
                where w.account_id = a.id
                order by case when w.verified_at is null then 1 else 0 end, w.created_at asc
                limit 1
              ) as merchant_wallet
       from api_keys k
       join accounts a on a.id = k.account_id
       where k.prefix = ?`,
    )
    .get(prefix) as AuthRow | undefined;
  if (!row) throw new AuthError("Invalid API key");
  return buildAuth(row, secret);
}

export async function authenticateRequest(
  authHeader: string | null,
): Promise<AuthContext> {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing Bearer token");
  }
  const secret = authHeader.slice("Bearer ".length).trim();
  if (!secret.startsWith("sk_")) throw new AuthError("Invalid API key");
  if (usesSupabase()) return authenticateSupabase(secret);
  return authenticateSqlite(secret);
}

export function getTreasuryAddress(): string {
  return (
    process.env.VIAPAY_TREASURY_ADDRESS ??
    "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5"
  );
}

export async function upsertMerchantWallet(
  accountId: string,
  address: string,
  network = "testnet",
): Promise<{ id: string; address: string; network: string }> {
  if (!isValidStellarPubkey(address)) {
    throw Object.assign(
      new Error("address no es una cuenta Stellar válida (G…)"),
      { status: 400 },
    );
  }
  const now = new Date().toISOString();

  if (usesSupabase()) {
    const db = getSupabaseAdmin();
    const existing = await db
      .from("wallets")
      .select("id")
      .eq("account_id", accountId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();
    throwSb(existing.error, "wallet lookup failed");
    if (existing.data?.id) {
      const upd = await db
        .from("wallets")
        .update({ address, network, verified_at: now })
        .eq("id", existing.data.id)
        .select("id, address, network")
        .single();
      throwSb(upd.error, "wallet update failed");
      if (!upd.data) throw new Error("wallet update returned empty");
      return {
        id: String(upd.data.id),
        address: String(upd.data.address),
        network: String(upd.data.network),
      };
    }
    const id = generatePrefixedId("wlt");
    const ins = await db
      .from("wallets")
      .insert({
        id,
        account_id: accountId,
        address,
        network,
        verified_at: now,
        created_at: now,
      })
      .select("id, address, network")
      .single();
    throwSb(ins.error, "wallet insert failed");
    if (!ins.data) throw new Error("wallet insert returned empty");
    return {
      id: String(ins.data.id),
      address: String(ins.data.address),
      network: String(ins.data.network),
    };
  }

  const db = getDb();
  const existing = db
    .prepare(`select id from wallets where account_id = ? order by created_at asc limit 1`)
    .get(accountId) as { id: string } | undefined;
  if (existing) {
    db.prepare(
      `update wallets set address = ?, network = ?, verified_at = ? where id = ?`,
    ).run(address, network, now, existing.id);
    return { id: existing.id, address, network };
  }
  const id = generatePrefixedId("wlt");
  db.prepare(
    `insert into wallets (id, account_id, address, network, verified_at, created_at)
     values (?, ?, ?, ?, ?, ?)`,
  ).run(id, accountId, address, network, now, now);
  return { id, address, network };
}
