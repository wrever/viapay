/**
 * settle-proof: shareable signed package (HMAC). Truth = chain + rail-parity.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PaymentIntentRow } from "@/lib/payments";
import { breakdownFor } from "@/lib/x402";
import { publicApiUrl } from "@/lib/chain";
import { buildRailParity } from "@/lib/rail-parity";

function proofSecret(): string {
  return (
    process.env.VIAPAY_SETTLE_PROOF_SECRET ||
    process.env.META_APP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    "viapay-dev-settle-proof"
  );
}

export type SettleProofBody = {
  v: 1;
  rail: "viapay";
  proof_or_nothing: true;
  payment_intent: string;
  status: string;
  network: string;
  asset: string;
  amount: string;
  net_amount: string;
  fee_amount: string;
  reseller_amount: string;
  merchant_wallet: string;
  reseller_address: string | null;
  stellar_tx_hash: string | null;
  succeeded_at: string | null;
  exact_pay: Record<string, unknown> | null;
  breakdown: ReturnType<typeof breakdownFor>;
  short_code: string | null;
  issued_at: string;
};

export function buildSettleProofPayload(row: PaymentIntentRow): SettleProofBody {
  const exactPay =
    row.metadata &&
    typeof row.metadata === "object" &&
    row.metadata.exact_pay &&
    typeof row.metadata.exact_pay === "object"
      ? (row.metadata.exact_pay as Record<string, unknown>)
      : null;
  const shortCode =
    row.metadata &&
    typeof row.metadata.cobro_code === "string"
      ? row.metadata.cobro_code
      : null;

  return {
    v: 1,
    rail: "viapay",
    proof_or_nothing: true,
    payment_intent: row.id,
    status: row.status,
    network: row.network,
    asset: row.asset_code,
    amount: row.amount,
    net_amount: row.net_amount,
    fee_amount: row.fee_amount,
    reseller_amount: row.reseller_amount,
    merchant_wallet: row.merchant_wallet,
    reseller_address: row.reseller_address,
    stellar_tx_hash: row.stellar_tx_hash,
    succeeded_at: row.succeeded_at,
    exact_pay: exactPay,
    breakdown: breakdownFor(row),
    short_code: shortCode,
    issued_at: new Date().toISOString(),
  };
}

export function signSettleProof(body: SettleProofBody): string {
  const canonical = JSON.stringify(body);
  return createHmac("sha256", proofSecret()).update(canonical).digest("hex");
}

export function verifySettleProofSignature(
  body: SettleProofBody,
  signature: string,
): boolean {
  const expected = signSettleProof(body);
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature, "hex");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function buildSettleProofResponse(row: PaymentIntentRow) {
  const site =
    process.env.VIAPAY_CHECKOUT_URL?.replace(/\/$/, "") ||
    "https://viapay.vercel.app";
  const base = publicApiUrl();
  const body = buildSettleProofPayload(row);
  const signature = signSettleProof(body);
  const parity =
    row.status === "succeeded"
      ? await buildRailParity(row)
      : null;

  return {
    body,
    signature,
    alg: "hmac-sha256",
    note: "HMAC is for share integrity. Settlement truth is on-chain + GET /v1/parity. Screenshots are not proof (proof-or-nothing).",
    receipt_url: `${site}/r/${row.id}`,
    parity_url: `${base}/v1/parity/${row.id}`,
    verify_url: row.stellar_tx_hash
      ? `${base}/v1/verify?network=${encodeURIComponent(row.network)}&tx_hash=${encodeURIComponent(row.stellar_tx_hash)}`
      : null,
    parity_ok: parity?.ok ?? null,
    split_glass: body.breakdown,
  };
}
