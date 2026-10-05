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
  client_secret: string;
  success_url: string | null;
  cancel_url: string | null;
  stellar_tx_hash: string | null;
  expires_at: string;
  succeeded_at: string | null;
  created_at: string;
  updated_at: string;
}

export function getCheckoutBaseUrl(): string {
  return (
    process.env.VIAPAY_CHECKOUT_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_CHECKOUT_URL ??
    "http://localhost:3004"
  ).replace(/\/$/, "");
}

export function buildCheckoutUrl(id: string, clientSecret: string): string {
  const url = new URL(`${getCheckoutBaseUrl()}/pay/${id}`);
  url.searchParams.set("cs", clientSecret);
  return url.toString();
}

export function serializePaymentIntent(row: PaymentIntentRow) {
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
    client_secret: row.client_secret,
    checkout_url: buildCheckoutUrl(row.id, row.client_secret),
    success_url: row.success_url,
    cancel_url: row.cancel_url,
    expires_at: row.expires_at,
    succeeded_at: row.succeeded_at,
    stellar_tx_hash: row.stellar_tx_hash,
    created_at: row.created_at,
  };
}

export function createPaymentIntent(
  auth: AuthContext,
  input: {
    amount: string;
    asset: AssetCode;
    description?: string;
    success_url?: string;
    cancel_url?: string;
    reseller_fee_bps?: number;
    reseller_address?: string;
  },
): PaymentIntentRow {
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

  // `auth.feeBps` comes from the server environment. The request body can only
  // ever add a reseller cut on top of it, never change ViaPay's own fee.
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
    client_secret: `${id}_secret_${generatePrefixedId("cs").slice(3)}`,
    success_url: input.success_url ?? null,
    cancel_url: input.cancel_url ?? null,
    stellar_tx_hash: null,
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    succeeded_at: null,
    created_at: now,
    updated_at: now,
  };

  getDb()
    .prepare(
      `insert into payment_intents (
        id, account_id, status, amount, fee_amount, net_amount, fee_bps,
        reseller_fee_bps, reseller_amount, reseller_address,
        asset_code, merchant_wallet, description, client_secret,
        success_url, cancel_url, expires_at, created_at, updated_at
      ) values (
        @id, @account_id, @status, @amount, @fee_amount, @net_amount, @fee_bps,
        @reseller_fee_bps, @reseller_amount, @reseller_address,
        @asset_code, @merchant_wallet, @description, @client_secret,
        @success_url, @cancel_url, @expires_at, @created_at, @updated_at
      )`,
    )
    .run(row);

  return row;
}

export function listPayableIntents(accountId: string) {
  const now = new Date().toISOString();
  return getDb()
    .prepare(
      `select * from payment_intents
       where account_id = ? and status = 'requires_payment' and expires_at > ?
       order by created_at desc limit 40`,
    )
    .all(accountId, now) as PaymentIntentRow[];
}

export function listPaymentIntents(accountId: string) {
  return getDb()
    .prepare(
      `select * from payment_intents where account_id = ? order by created_at desc limit 100`,
    )
    .all(accountId) as PaymentIntentRow[];
}

export function getPaymentIntentPublic(id: string, clientSecret: string) {
  const row = getDb()
    .prepare(`select * from payment_intents where id = ?`)
    .get(id) as PaymentIntentRow | undefined;
  if (!row || row.client_secret !== clientSecret) return null;
  return row;
}

export function markCheckoutSucceeded(id: string, txHash: string) {
  const now = new Date().toISOString();
  const current = getDb()
    .prepare(`select * from payment_intents where id = ?`)
    .get(id) as PaymentIntentRow | undefined;
  if (!current) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  if (current.status === "succeeded") return current;
  getDb()
    .prepare(
      `update payment_intents
       set status = 'succeeded', stellar_tx_hash = ?, succeeded_at = ?, updated_at = ?
       where id = ?`,
    )
    .run(txHash, now, now, id);
  const updated = getDb()
    .prepare(`select * from payment_intents where id = ?`)
    .get(id) as PaymentIntentRow;
  enqueuePaymentSucceeded(updated);
  return updated;
}

export function confirmCheckoutPayment(
  id: string,
  clientSecret: string,
  payer?: string,
) {
  const row = getPaymentIntentPublic(id, clientSecret);
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
    getDb()
      .prepare(
        `update payment_intents set status = 'expired', updated_at = ? where id = ?`,
      )
      .run(new Date().toISOString(), id);
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
