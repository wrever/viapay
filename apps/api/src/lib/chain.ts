import {
  buildRouterPayXdr,
  buildSep7SplitUri,
  buildSplitPaymentXdr,
  buildTrustlineSep7,
  findConfirmedSplit,
  findConfirmedSplits,
  inspectReceive,
  networkConfig,
  submitVerifiedRouter,
  submitVerifiedSplit,
  type Network,
  type SplitLeg,
} from "@viapay/stellar";
import { getTreasuryAddress } from "./auth";
import {
  getPaymentIntentPublic,
  listPayableIntents,
  markCheckoutSucceeded,
  type PaymentIntentRow,
} from "./payments";

/** Soroban payment-router contract id when configured. */
export function paymentRouterContractId(): string | null {
  const id = process.env.PAYMENT_ROUTER_CONTRACT_ID?.trim();
  return id || null;
}

/**
 * On-chain settlement must go through payment-router so args (merchant / treasury /
 * reseller / amounts / intent) are verified before RPC submit.
 * Classic multi-op is only allowed in STELLAR_MODE=simulated without a contract id.
 */
export function requirePaymentRouterContractId(): string {
  const id = paymentRouterContractId();
  if (id) return id;
  throw Object.assign(
    new Error(
      "PAYMENT_ROUTER_CONTRACT_ID no está configurado. Los cobros on-chain solo liquidan por el contrato payment-router.",
    ),
    { status: 503 },
  );
}

export function usesPaymentRouter(): boolean {
  return Boolean(paymentRouterContractId());
}

export function stellarNetwork(): Network {
  const raw = process.env.STELLAR_NETWORK ?? "testnet";
  if (raw === "mainnet" || raw === "local" || raw === "testnet") return raw;
  return "testnet";
}

export function usdcIssuer(): string {
  return process.env.USDC_ISSUER ?? networkConfig(stellarNetwork()).usdcIssuer;
}

export function publicApiUrl(): string {
  return (
    process.env.VIAPAY_API_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_API_URL ??
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

export function splitLegFor(
  row: PaymentIntentRow,
  source: string,
): SplitLeg {
  return {
    source,
    merchant: row.merchant_wallet,
    treasury: getTreasuryAddress(),
    reseller: row.reseller_address,
    asset: row.asset_code,
    assetIssuer: row.asset_code === "USDC" ? usdcIssuer() : null,
    netAmount: row.net_amount,
    feeAmount: row.fee_amount,
    resellerAmount: row.reseller_amount,
    memo: row.id,
    network: stellarNetwork(),
  };
}

export function sep7CallbackUrl(id: string, clientSecret: string): string {
  const url = new URL(`${publicApiUrl()}/v1/checkout/${id}/sep7`);
  url.searchParams.set("client_secret", clientSecret);
  return url.toString();
}

export function buildCheckoutSep7(row: PaymentIntentRow): string {
  if (usesPaymentRouter()) {
    throw Object.assign(
      new Error(
        "Este cobro liquida por el contrato payment-router. Usá Billetera (Freighter); el QR clásico no aplica.",
      ),
      { status: 400 },
    );
  }
  const leg = splitLegFor(row, getTreasuryAddress());
  return buildSep7SplitUri({
    ...leg,
    placeholderSource: getTreasuryAddress(),
    callbackUrl: sep7CallbackUrl(row.id, row.client_secret),
  });
}

function requirePayable(id: string, clientSecret: string): Promise<PaymentIntentRow> {
  return getPaymentIntentPublic(id, clientSecret).then((row) => {
    if (!row) {
      throw Object.assign(new Error("Not found"), { status: 404 });
    }
    if (row.status === "succeeded") return row;
    if (row.status !== "requires_payment") {
      throw Object.assign(new Error(`Cannot pay status=${row.status}`), {
        status: 400,
      });
    }
    if (new Date(row.expires_at).getTime() < Date.now()) {
      throw Object.assign(new Error("Payment link expired"), { status: 400 });
    }
    return row;
  });
}

export async function prepareCheckoutXdr(
  id: string,
  clientSecret: string,
  source: string,
) {
  const row = await requirePayable(id, clientSecret);
  if (row.status === "succeeded") {
    throw Object.assign(new Error("Este cobro ya está pagado"), { status: 400 });
  }
  const leg = splitLegFor(row, source);
  const routerId = paymentRouterContractId();
  if (routerId) {
    const prepared = await buildRouterPayXdr(leg, routerId);
    return {
      xdr: prepared.xdr,
      network_passphrase: prepared.networkPassphrase,
      included_trustline: prepared.includedTrustline,
      settlement: "router" as const,
      contract_id: prepared.contractId,
    };
  }
  // Simulated / local only — onchain without contract id fails via require.
  if (process.env.STELLAR_MODE !== "simulated") {
    requirePaymentRouterContractId();
  }
  const prepared = await buildSplitPaymentXdr(leg);
  return {
    xdr: prepared.xdr,
    network_passphrase: prepared.networkPassphrase,
    included_trustline: prepared.includedTrustline,
    settlement: "classic" as const,
    contract_id: null,
  };
}

export async function receiveStatusFor(address: string, asset: SplitLeg["asset"]) {
  return inspectReceive({
    network: stellarNetwork(),
    address,
    asset,
    assetIssuer: asset === "USDC" ? usdcIssuer() : null,
  });
}

export function merchantTrustlineUri(pubkey: string): string {
  return buildTrustlineSep7({
    network: stellarNetwork(),
    placeholderSource: pubkey,
    pubkey,
    assetIssuer: usdcIssuer(),
  });
}

export async function reconcileCheckoutPayment(row: PaymentIntentRow) {
  if (row.status !== "requires_payment") return row;
  if (new Date(row.expires_at).getTime() < Date.now()) return row;
  const leg = splitLegFor(row, "");
  const found = await findConfirmedSplit(leg);
  if (!found) return row;
  return markCheckoutSucceeded(row.id, found.hash);
}

export async function reconcileAccountPayments(accountId: string, merchant: string) {
  const pending = await listPayableIntents(accountId);
  if (pending.length === 0 || !merchant) return;
  const found = await findConfirmedSplits(
    stellarNetwork(),
    merchant,
    pending.map((row) => splitLegFor(row, "")),
  );
  for (const hit of found) {
    await markCheckoutSucceeded(hit.memo, hit.hash);
  }
}

export async function submitCheckoutXdr(
  id: string,
  clientSecret: string,
  signedXdr: string,
) {
  const row = await requirePayable(id, clientSecret);
  if (row.status === "succeeded") return row;
  const leg = splitLegFor(row, "");
  const routerId = paymentRouterContractId();
  if (routerId) {
    try {
      const submitted = await submitVerifiedRouter(signedXdr, leg, routerId);
      return markCheckoutSucceeded(id, submitted.hash);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Pago router rechazado";
      // Classic multi-op XDR must never settle when the router is configured.
      if (
        /invokeHostFunction|invokeContract|payment-router|única operación/i.test(
          message,
        )
      ) {
        throw Object.assign(
          new Error(
            `${message}. Este cobro solo acepta liquidación por el contrato payment-router (prepare → firmar → submit).`,
          ),
          { status: (error as { status?: number }).status ?? 400 },
        );
      }
      throw error;
    }
  }
  if (process.env.STELLAR_MODE !== "simulated") {
    requirePaymentRouterContractId();
  }
  const submitted = await submitVerifiedSplit(signedXdr, leg);
  return markCheckoutSucceeded(id, submitted.hash);
}
