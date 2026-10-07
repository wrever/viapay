import {
  assertFeeBps,
  calcFeeSplit,
  formatAssetAmount,
  generatePrefixedId,
  isValidStellarPubkey,
  parseAssetAmount,
  type AssetCode,
  type PaymentIntentStatus,
} from "@viapay/shared";
import type { AuthContext } from "./auth";
import { getTreasuryAddress } from "./auth";
import { getDb } from "./db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";
import { enqueuePaymentSucceeded } from "./webhooks";

export interface PaymentIntentRow {
  id: string;
  account_id: string;
  status: PaymentIntentStatus;
  amount: string;
  fee_amount: string;
  net_amount: string;
  fee_bps: number;
  reseller_fee_bps: number;
  reseller_amount: string;
  reseller_address: string | null;
  asset_code: AssetCode;
  merchant_wallet: string;
  description: string | null;
  /** Merchant's own end-customer id (not a ViaPay user). */
  external_user_id: string | null;
  /** Opaque JSON object from the merchant (stringified in DB). */
  metadata: Record<string, unknown> | null;
  client_secret: string;
  success_url: string | null;
  cancel_url: string | null;
  stellar_tx_hash: string | null;
  expires_at: string;
  succeeded_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

function normalizeRow(raw: Record<string, unknown>): PaymentIntentRow {
  return {
    id: String(raw.id),
    account_id: String(raw.account_id),
    status: raw.status as PaymentIntentStatus,
    amount: String(raw.amount),
    fee_amount: String(raw.fee_amount),
    net_amount: String(raw.net_amount),
    fee_bps: Number(raw.fee_bps),
    reseller_fee_bps: Number(raw.reseller_fee_bps ?? 0),
    reseller_amount: String(raw.reseller_amount ?? "0.0000000"),
    reseller_address: (raw.reseller_address as string | null) ?? null,
    asset_code: raw.asset_code as AssetCode,
    merchant_wallet: String(raw.merchant_wallet),
    description: (raw.description as string | null) ?? null,
    external_user_id: (raw.external_user_id as string | null) ?? null,
    metadata: parseMetadata(raw.metadata),
    client_secret: String(raw.client_secret),
    success_url: (raw.success_url as string | null) ?? null,
    cancel_url: (raw.cancel_url as string | null) ?? null,
    stellar_tx_hash: (raw.stellar_tx_hash as string | null) ?? null,
    expires_at: String(raw.expires_at),
    succeeded_at: (raw.succeeded_at as string | null) ?? null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export function getCheckoutBaseUrl(): string {
  return (
    process.env.VIAPAY_CHECKOUT_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_CHECKOUT_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Direct hosted checkout UI (Freighter / QR). Prefer sharing `checkout_url` instead. */
export function buildPayUrl(id: string, clientSecret: string): string {
  const url = new URL(`${getCheckoutBaseUrl()}/pay/${id}`);
  url.searchParams.set("cs", clientSecret);
  return url.toString();
}

/** @deprecated Use buildPayUrl — kept for call sites that meant the hosted page. */
export function buildCheckoutUrl(id: string, clientSecret: string): string {
  return buildPayUrl(id, clientSecret);
}

export function getApiPublicUrl(): string {
  return (
    process.env.VIAPAY_API_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_API_URL ??
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

/**
 * Unified share link: browser navigations redirect to hosted `/pay`,
 * agents (JSON / no Sec-Fetch document) get HTTP 402 on the same URL.
 */
export function buildX402Url(id: string, clientSecret: string): string {
  const url = new URL(`${getApiPublicUrl()}/v1/x402/${id}`);
  url.searchParams.set("client_secret", clientSecret);
  return url.toString();
}

export function serializePaymentIntent(row: PaymentIntentRow) {
  const payUrl = buildPayUrl(row.id, row.client_secret);
  const shareUrl = buildX402Url(row.id, row.client_secret);
  return {
    id: row.id,
    object: "payment_intent" as const,
    status: row.status,
    amount: row.amount,
    fee_amount: row.fee_amount,
    net_amount: row.net_amount,
    fee_bps: row.fee_bps,
    reseller_fee_bps: row.reseller_fee_bps,
    reseller_amount: row.reseller_amount,
    reseller_address: row.reseller_address,
    asset: row.asset_code,
    merchant_wallet: row.merchant_wallet,
    description: row.description,
    external_user_id: row.external_user_id,
    metadata: row.metadata,
    client_secret: row.client_secret,
    /** One link for humans and agents (API gateway → 402 or redirect to pay_url). */
    checkout_url: shareUrl,
    /** Alias of checkout_url (same unified entry). */
    x402_url: shareUrl,
    /** Direct hosted UI if you already know the payer is human. */
    pay_url: payUrl,
    success_url: row.success_url,
    cancel_url: row.cancel_url,
    expires_at: row.expires_at,
    succeeded_at: row.succeeded_at,
    stellar_tx_hash: row.stellar_tx_hash,
    created_at: row.created_at,
  };
}

export async function createPaymentIntent(
  auth: AuthContext,
  input: {
    amount: string;
    asset: AssetCode;
    description?: string;
    success_url?: string;
    cancel_url?: string;
    reseller_fee_bps?: number;
    reseller_address?: string;
    /** Merchant's end-customer id (aliases accepted at the HTTP layer). */
    external_user_id?: string;
    metadata?: Record<string, unknown>;
  },
): Promise<PaymentIntentRow> {
  if (!auth.merchantWallet) {
    throw Object.assign(
      new Error("Configura una wallet Stellar antes de crear links de pago"),
      { status: 400 },
    );
  }

  const amountUnits = parseAssetAmount(input.amount, 7);
  if (amountUnits <= 0n) {
    throw Object.assign(new Error("amount must be > 0"), { status: 400 });
  }

  const resellerBps = input.reseller_fee_bps ?? 0;
  const resellerAddress = input.reseller_address?.trim() || null;
  try {
    assertFeeBps(auth.feeBps, resellerBps);
  } catch (error) {
    throw Object.assign(error as Error, { status: 400 });
  }
  if (resellerBps > 0 && !resellerAddress) {
    throw Object.assign(
      new Error("Un fee de revendedor necesita reseller_address"),
      { status: 400 },
    );
  }
  if (resellerAddress && !isValidStellarPubkey(resellerAddress)) {
    throw Object.assign(
      new Error("reseller_address no es una cuenta Stellar válida (G…)"),
      { status: 400 },
    );
  }

  const split = calcFeeSplit(amountUnits, auth.feeBps, resellerBps);
  if (split.net <= 0n) {
    throw Object.assign(
      new Error("Después de los fees el comercio no recibiría nada"),
      { status: 400 },
    );
  }
  const externalUserId = input.external_user_id?.trim() || null;
  const metadata =
    input.metadata && Object.keys(input.metadata).length > 0
      ? input.metadata
      : null;
  const metadataJson = metadata ? JSON.stringify(metadata) : null;

  const id = generatePrefixedId("pi");
  const now = new Date().toISOString();
  const row: PaymentIntentRow = {
    id,
    account_id: auth.accountId,
    status: "requires_payment",
    amount: formatAssetAmount(split.amount),
    fee_amount: formatAssetAmount(split.viaFee),
    net_amount: formatAssetAmount(split.net),
    fee_bps: split.viaBps,
    reseller_fee_bps: split.resellerBps,
    reseller_amount: formatAssetAmount(split.resellerFee),
    reseller_address: resellerBps > 0 ? resellerAddress : null,
    asset_code: input.asset,
    merchant_wallet: auth.merchantWallet,
    description: input.description ?? null,
    external_user_id: externalUserId,
    metadata,
    client_secret: `${id}_secret_${generatePrefixedId("cs").slice(3)}`,
    success_url: input.success_url ?? null,
    cancel_url: input.cancel_url ?? null,
    stellar_tx_hash: null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    succeeded_at: null,
    created_at: now,
    updated_at: now,
  };

  if (usesSupabase()) {
    const ins = await getSupabaseAdmin().from("payment_intents").insert({
      id: row.id,
      account_id: row.account_id,
      status: row.status,
      amount: row.amount,
      fee_amount: row.fee_amount,
      net_amount: row.net_amount,
      fee_bps: row.fee_bps,
      reseller_fee_bps: row.reseller_fee_bps,
      reseller_amount: row.reseller_amount,
      reseller_address: row.reseller_address,
      asset_code: row.asset_code,
      merchant_wallet: row.merchant_wallet,
      description: row.description,
      external_user_id: row.external_user_id,
      metadata: metadataJson,
      client_secret: row.client_secret,
      success_url: row.success_url,
      cancel_url: row.cancel_url,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
    throwSb(ins.error, "payment_intent insert failed");
    return row;
  }

  getDb()
    .prepare(
      `insert into payment_intents (
        id, account_id, status, amount, fee_amount, net_amount, fee_bps,
        reseller_fee_bps, reseller_amount, reseller_address,
        asset_code, merchant_wallet, description, external_user_id, metadata,
        client_secret, success_url, cancel_url, expires_at, created_at, updated_at
      ) values (
        @id, @account_id, @status, @amount, @fee_amount, @net_amount, @fee_bps,
        @reseller_fee_bps, @reseller_amount, @reseller_address,
        @asset_code, @merchant_wallet, @description, @external_user_id, @metadata,
        @client_secret, @success_url, @cancel_url, @expires_at, @created_at, @updated_at
      )`,
    )
    .run({
      ...row,
      metadata: metadataJson,
    });

  return row;
}

export async function listPayableIntents(accountId: string) {
  const now = new Date().toISOString();
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .eq("account_id", accountId)
      .eq("status", "requires_payment")
      .gt("expires_at", now)
      .order("created_at", { ascending: false })
      .limit(40);
    throwSb(res.error, "list payable failed");
    return (res.data ?? []).map((row) => normalizeRow(row as Record<string, unknown>));
  }
  return (
    getDb()
      .prepare(
        `select * from payment_intents
         where account_id = ? and status = 'requires_payment' and expires_at > ?
         order by created_at desc limit 40`,
      )
      .all(accountId, now) as PaymentIntentRow[]
  );
}

export async function listPaymentIntents(accountId: string) {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(100);
    throwSb(res.error, "list payment_intents failed");
    return (res.data ?? []).map((row) => normalizeRow(row as Record<string, unknown>));
  }
  return getDb()
    .prepare(
      `select * from payment_intents where account_id = ? order by created_at desc limit 100`,
    )
    .all(accountId) as PaymentIntentRow[];
}

export async function getPaymentIntentPublic(id: string, clientSecret: string) {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwSb(res.error, "payment_intent lookup failed");
    if (!res.data) return null;
    const row = normalizeRow(res.data as Record<string, unknown>);
    if (row.client_secret !== clientSecret) return null;
    return row;
  }
  const row = getDb()
    .prepare(`select * from payment_intents where id = ?`)
    .get(id) as PaymentIntentRow | undefined;
  if (!row || row.client_secret !== clientSecret) return null;
  return row;
}

export async function getPaymentIntentById(id: string) {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwSb(res.error, "payment_intent lookup failed");
    if (!res.data) return null;
    return normalizeRow(res.data as Record<string, unknown>);
  }
  return (
    (getDb().prepare(`select * from payment_intents where id = ?`).get(id) as
      | PaymentIntentRow
      | undefined) ?? null
  );
}

export async function markCheckoutSucceeded(id: string, txHash: string) {
  const now = new Date().toISOString();
  const current = await getPaymentIntentById(id);
  if (!current) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  if (current.status === "succeeded") return current;

  if (usesSupabase()) {
    const upd = await getSupabaseAdmin()
      .from("payment_intents")
      .update({
        status: "succeeded",
        stellar_tx_hash: txHash,
        succeeded_at: now,
        updated_at: now,
      })
      .eq("id", id);
    throwSb(upd.error, "payment_intent update failed");
  } else {
    getDb()
      .prepare(
        `update payment_intents
         set status = 'succeeded', stellar_tx_hash = ?, succeeded_at = ?, updated_at = ?
         where id = ?`,
      )
      .run(txHash, now, now, id);
  }

  const updated = (await getPaymentIntentById(id))!;
  await enqueuePaymentSucceeded(updated);
  return updated;
}

export async function confirmCheckoutPayment(
  id: string,
  clientSecret: string,
  payer?: string,
) {
  const row = await getPaymentIntentPublic(id, clientSecret);
  if (!row) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  if (row.status === "succeeded") return row;
  if (row.status !== "requires_payment") {
    throw Object.assign(new Error(`Cannot confirm status=${row.status}`), {
      status: 400,
    });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    if (usesSupabase()) {
      await getSupabaseAdmin()
        .from("payment_intents")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", id);
    } else {
      getDb()
        .prepare(
          `update payment_intents set status = 'expired', updated_at = ? where id = ?`,
        )
        .run(new Date().toISOString(), id);
    }
    throw Object.assign(new Error("Payment link expired"), { status: 400 });
  }

  if (process.env.STELLAR_MODE !== "simulated") {
    throw Object.assign(
      new Error("Falta la transacción firmada. Paga con wallet o escanea el QR."),
      { status: 400 },
    );
  }

  void payer;
  void getTreasuryAddress;
  const txHash = `sim_${generatePrefixedId("tx").slice(3)}`;
  return markCheckoutSucceeded(id, txHash);
}
