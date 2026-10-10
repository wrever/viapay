/**
 * rail-parity: intent ≡ x402 ≡ on-chain Paid (when succeeded).
 */
import { intentIdBytes, verifyRouterPayTx } from "@viapay/stellar";
import { parseAssetAmount } from "@viapay/shared";
import {
  paymentRouterContractId,
  publicApiUrl,
} from "@/lib/chain";
import type { PaymentIntentRow } from "@/lib/payments";
import { breakdownFor, buildChallenge } from "@/lib/x402";

function toHex(bytes: Uint8Array): string {
  return [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export type ParitySurface = {
  amount: string;
  amount_atomic: string;
  asset: string;
  network: string;
  net_amount: string;
  fee_amount: string;
  reseller_amount: string;
  merchant_wallet: string;
  reseller_address: string | null;
  intent_id_sha256?: string;
  tx_hash?: string | null;
  status?: string;
};

export type RailParityResult = {
  ok: boolean;
  payment_intent: string;
  status: string;
  proof_or_nothing: true;
  schemes: string[];
  surfaces: {
    intent: ParitySurface;
    x402: ParitySurface;
    paid: ParitySurface | null;
  };
  mismatches: string[];
  links: {
    parity: string;
    verify: string | null;
    receipt: string;
    rails: string;
  };
};

function intentSurface(row: PaymentIntentRow, intentHash: string): ParitySurface {
  return {
    amount: row.amount,
    amount_atomic: parseAssetAmount(row.amount).toString(),
    asset: row.asset_code,
    network: row.network,
    net_amount: row.net_amount,
    fee_amount: row.fee_amount,
    reseller_amount: row.reseller_amount,
    merchant_wallet: row.merchant_wallet,
    reseller_address: row.reseller_address,
    intent_id_sha256: intentHash,
    tx_hash: row.stellar_tx_hash,
    status: row.status,
  };
}

function x402Surface(row: PaymentIntentRow, intentHash: string): ParitySurface {
  const challenge = buildChallenge(row);
  const accept = challenge.accepts[0]!;
  const shares = breakdownFor(row);
  const net = shares.find((s) => s.role === "merchant");
  const fee = shares.find((s) => s.role === "viapay_treasury");
  const reseller = shares.find((s) => s.role === "reseller");
  return {
    amount: row.amount,
    amount_atomic: accept.maxAmountRequired,
    asset: row.asset_code,
    network: row.network,
    net_amount: net?.amount ?? row.net_amount,
    fee_amount: fee?.amount ?? row.fee_amount,
    reseller_amount: reseller?.amount ?? row.reseller_amount,
    merchant_wallet: row.merchant_wallet,
    reseller_address: row.reseller_address,
    intent_id_sha256: intentHash,
    status: row.status,
  };
}

export async function buildRailParity(
  row: PaymentIntentRow,
): Promise<RailParityResult> {
  const base = publicApiUrl();
  const site =
    process.env.VIAPAY_CHECKOUT_URL?.replace(/\/$/, "") ||
    "https://viapay.vercel.app";
  const intentHash = toHex(await intentIdBytes(row.id));
  const intent = intentSurface(row, intentHash);
  const x402 = x402Surface(row, intentHash);
  const mismatches: string[] = [];

  if (intent.amount_atomic !== x402.amount_atomic) {
    mismatches.push("intent.amount_atomic != x402.maxAmountRequired");
  }
  if (intent.net_amount !== x402.net_amount) {
    mismatches.push("intent.net_amount != x402.merchant payout");
  }
  if (intent.fee_amount !== x402.fee_amount) {
    mismatches.push("intent.fee_amount != x402.viapay payout");
  }
  if (intent.reseller_amount !== x402.reseller_amount) {
    mismatches.push("intent.reseller_amount != x402.reseller payout");
  }
  if (intent.merchant_wallet !== x402.merchant_wallet) {
    mismatches.push("intent.merchant_wallet != x402.payTo");
  }

  let paid: ParitySurface | null = null;
  if (row.status === "succeeded" && row.stellar_tx_hash) {
    try {
      const expected = paymentRouterContractId(row.network);
      const v = await verifyRouterPayTx({
        network: row.network,
        txHash: row.stellar_tx_hash,
        expectedContractId: expected,
      });
      paid = {
        amount: row.amount,
        amount_atomic: intent.amount_atomic,
        asset: row.asset_code,
        network: row.network,
        net_amount: v.net,
        fee_amount: v.fee,
        reseller_amount: v.reseller_fee,
        merchant_wallet: v.merchant,
        reseller_address: v.reseller,
        intent_id_sha256: v.intent_id,
        tx_hash: v.tx_hash,
        status: "succeeded",
      };
      if (v.intent_id !== intentHash) {
        mismatches.push("onchain.intent_id != sha256(payment_intent.id)");
      }
      if (v.net !== row.net_amount) {
        mismatches.push("onchain.net != intent.net_amount");
      }
      if (v.fee !== row.fee_amount) {
        mismatches.push("onchain.fee != intent.fee_amount");
      }
      if (v.reseller_fee !== row.reseller_amount) {
        mismatches.push("onchain.reseller_fee != intent.reseller_amount");
      }
      if (v.merchant !== row.merchant_wallet) {
        mismatches.push("onchain.merchant != intent.merchant_wallet");
      }
    } catch (e) {
      mismatches.push(
        `onchain_verify_failed:${e instanceof Error ? e.message : String(e)}`,
      );
    }
  }

  const schemes = ["exact_split", "rail_parity", "proof_or_nothing"];
  if (row.reseller_fee_bps > 0) schemes.push("split_glass");
  if (
    row.metadata &&
    typeof row.metadata === "object" &&
    row.metadata.exact_pay
  ) {
    schemes.push("exact_pay");
  }

  return {
    ok: mismatches.length === 0,
    payment_intent: row.id,
    status: row.status,
    proof_or_nothing: true,
    schemes,
    surfaces: { intent, x402, paid },
    mismatches,
    links: {
      parity: `${base}/v1/parity/${row.id}`,
      verify: row.stellar_tx_hash
        ? `${base}/v1/verify?network=${encodeURIComponent(row.network)}&tx_hash=${encodeURIComponent(row.stellar_tx_hash)}`
        : null,
      receipt: `${site}/r/${row.id}`,
      rails: `${base}/v1/rails`,
    },
  };
}
