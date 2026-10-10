import {
  buildPayoutBreakdown,
  parseAssetAmount,
  type PayoutShare,
} from "@viapay/shared";
import { getTreasuryAddress } from "./auth";
import type { Network } from "@viapay/stellar";
import {
  intentNetwork,
  paymentRouterContractId,
  publicApiUrl,
  usdcIssuer,
} from "./chain";
import { buildX402Url, type PaymentIntentRow } from "./payments";

export type { PayoutShare };

/** x402 speaks CAIP-2, not our short network names. */
export function caip2Network(network: Network): string {
  switch (network) {
    case "mainnet":
      return "stellar:pubnet";
    case "local":
      return "stellar:local";
    default:
      return "stellar:testnet";
  }
}

/** The three-way cut, in the order the on-chain operations are built. */
export function breakdownFor(row: PaymentIntentRow): PayoutShare[] {
  return buildPayoutBreakdown({
    merchant_wallet: row.merchant_wallet,
    treasury_wallet: getTreasuryAddress(),
    net_amount: row.net_amount,
    fee_amount: row.fee_amount,
    fee_bps: row.fee_bps,
    reseller_address: row.reseller_address,
    reseller_amount: row.reseller_amount,
    reseller_fee_bps: row.reseller_fee_bps,
  });
}

export function x402ResourceUrl(row: PaymentIntentRow): string {
  return buildX402Url(row.id, row.client_secret);
}

/**
 * The 402 body. Shaped like an x402 v2 `PaymentRequirements` response so an
 * agent that already speaks x402 can read `accepts[0]`, plus a `viapay` block
 * that spells out the split and the two ways to settle it here.
 *
 * ViaPay settles from its own API instead of an x402 facilitator, so the payer
 * signs a full Soroban invoke (payment-router `pay`) rather than auth entries
 * for a third-party facilitator.
 */
export function buildChallenge(row: PaymentIntentRow) {
  const stellarNet = intentNetwork(row);
  const network = caip2Network(stellarNet);
  const issuer = row.asset_code === "USDC" ? usdcIssuer(stellarNet) : null;
  const resource = x402ResourceUrl(row);
  const shares = breakdownFor(row);
  const routerId = paymentRouterContractId(stellarNet);
  const settlement = routerId ? "payment-router" : "viapay-split-envelope";
  const exactPayMeta =
    row.metadata &&
    typeof row.metadata === "object" &&
    row.metadata.exact_pay &&
    typeof row.metadata.exact_pay === "object"
      ? (row.metadata.exact_pay as Record<string, unknown>)
      : null;
  const viapayScheme = exactPayMeta ? "exact_pay" : "exact";

  return {
    x402Version: 2,
    error: "payment_required",
    accepts: [
      {
        // Wire scheme stays x402 `exact` (locked crypto amount). ViaPay pricing
        // mode lives in extra.viapay_scheme / viapay.scheme (exact_pay ≠ Local402 exact-fx).
        scheme: "exact",
        network,
        resource,
        description:
          row.description ?? `Cobro ViaPay ${row.id} por ${row.amount} ${row.asset_code}`,
        mimeType: "application/json",
        maxAmountRequired: parseAssetAmount(row.amount).toString(),
        // One account has to be named here. The rest of the split is in `extra`
        // and in `viapay.breakdown`; all of it is enforced server-side.
        payTo: row.merchant_wallet,
        asset: issuer ? `${row.asset_code}:${issuer}` : "native",
        maxTimeoutSeconds: 180,
        extra: {
          asset_code: row.asset_code,
          asset_issuer: issuer,
          decimals: 7,
          memo: row.id,
          memo_type: "text",
          settlement,
          viapay_scheme: viapayScheme,
          ...(exactPayMeta ? { exact_pay: exactPayMeta } : {}),
          ...(routerId
            ? {
                payment_router: routerId,
                event: "Paid",
              }
            : {}),
          payouts: shares.map((share) => ({
            role: share.role,
            destination: share.address,
            amount_atomic: share.amount_atomic,
          })),
        },
      },
    ],
    viapay: {
      payment_intent: row.id,
      status: row.status,
      scheme: viapayScheme,
      ...(exactPayMeta ? { exact_pay: exactPayMeta } : {}),
      network: stellarNet,
      settlement,
      ...(routerId ? { payment_router: routerId } : {}),
      asset: row.asset_code,
      asset_issuer: issuer,
      amount: row.amount,
      expires_at: row.expires_at,
      breakdown: shares,
      settle: {
        /** Ask ViaPay for the unsigned envelope with every payout already in it. */
        prepare: {
          method: "POST",
          url: `${publicApiUrl()}/v1/checkout/${row.id}/prepare`,
          body: { client_secret: row.client_secret, source: "<tu cuenta G…>" },
          returns: ["xdr", "network_passphrase", "included_trustline"],
        },
        /** Sign it locally, then hand it back here. */
        submit: {
          method: "POST",
          url: resource,
          header: "X-PAYMENT",
          header_value:
            "base64(JSON) con { x402Version: 2, scheme: 'exact', network, payload: { signed_xdr } }",
          body_alternative: { signed_xdr: "<xdr firmado>" },
        },
        /** Already paid out-of-band? This looks the payment up on Horizon. */
        reconcile: { method: "POST", url: resource, body: { reconcile: true } },
        notes:
          "ViaPay verifica memo, destinos y montos antes de enviar a Horizon. No hay facilitator x402: el pagador firma el envelope completo, no auth entries de contrato.",
      },
    },
  };
}

export type X402PaymentHeader = {
  signedXdr?: string;
  reconcile?: boolean;
};

/** Reads the `X-PAYMENT` header: base64 JSON, x402 style. */
export function parsePaymentHeader(raw: string | null): X402PaymentHeader | null {
  if (!raw) return null;
  let text: string;
  try {
    text = Buffer.from(raw, "base64").toString("utf8");
  } catch {
    throw Object.assign(new Error("X-PAYMENT no es base64"), { status: 400 });
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw Object.assign(new Error("X-PAYMENT no contiene JSON"), { status: 400 });
  }
  if (typeof parsed !== "object" || parsed === null) {
    throw Object.assign(new Error("X-PAYMENT no contiene un objeto"), { status: 400 });
  }
  const body = parsed as Record<string, unknown>;
  const payload = (body.payload ?? body) as Record<string, unknown>;
  const signedXdr = payload.signed_xdr ?? payload.signedXdr ?? payload.transaction;
  return {
    signedXdr: typeof signedXdr === "string" ? signedXdr : undefined,
    reconcile: payload.reconcile === true || body.reconcile === true,
  };
}

/** The `X-PAYMENT-RESPONSE` receipt header an x402 client expects on the 200. */
export function paymentResponseHeader(row: PaymentIntentRow): string {
  return Buffer.from(
    JSON.stringify({
      success: true,
      transaction: row.stellar_tx_hash,
      network: caip2Network(intentNetwork(row)),
      payer: null,
      payment_intent: row.id,
    }),
    "utf8",
  ).toString("base64");
}
