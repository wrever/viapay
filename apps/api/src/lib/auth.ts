import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import {
  generatePrefixedId,
  isValidStellarPubkey,
  resolveViaFeeBps,
} from "@viapay/shared";
import { getDb } from "./db";

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

export function authenticateRequest(authHeader: string | null): AuthContext {
  if (!authHeader?.startsWith("Bearer ")) {
    throw new AuthError("Missing Bearer token");
  }
  const secret = authHeader.slice("Bearer ".length).trim();
  if (!secret.startsWith("sk_")) throw new AuthError("Invalid API key");

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
    .get(prefix) as
    | {
        api_key_id: string;
        account_id: string;
        mode: string;
        secret_hash: string;
        revoked_at: string | null;
        account_name: string;
        merchant_wallet: string | null;
      }
    | undefined;

  if (!row || row.revoked_at) throw new AuthError("Invalid API key");
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

export function getTreasuryAddress(): string {
  return (
    process.env.VIAPAY_TREASURY_ADDRESS ??
    "GBIVA57TB4N4IHXYQSDLWSVKC4M4P66AAJWS5A5SQAOIYEZSBUVNCIWD"
  );
}
