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
import {
  calcFeeSplit,
  formatAssetAmount,
  isPlanParent,
  parseAssetAmount,
  readAbonos,
  readPlan,
  remainingAmount,
  assertAbonoAmount,
} from "@viapay/shared";
import { getTreasuryAddress } from "./auth";
import {
  getPaymentIntentPublic,
  listPayableIntents,
  markCheckoutSucceeded,
  type PaymentIntentRow,
} from "./payments";

export function parseNetwork(raw: unknown): Network {
  if (raw === "mainnet" || raw === "public") return "mainnet";
  if (raw === "local") return "local";
  if (raw === "testnet") return "testnet";
  return "testnet";
}

/** Default network for the deployment (env). Per-intent network may differ. */
export function stellarNetwork(): Network {
  return parseNetwork(process.env.STELLAR_NETWORK ?? "testnet");
}

/**
 * Soroban payment-router id for a given Stellar network.
 * Testnet/local: `PAYMENT_ROUTER_CONTRACT_ID`.
 * Mainnet: `PAYMENT_ROUTER_CONTRACT_ID_MAINNET` (required for mainnet cobros).
 */
export function paymentRouterContractId(
  network: Network = stellarNetwork(),
): string | null {
  if (network === "mainnet") {
    return process.env.PAYMENT_ROUTER_CONTRACT_ID_MAINNET?.trim() || null;
  }
  return process.env.PAYMENT_ROUTER_CONTRACT_ID?.trim() || null;
}

/**
 * On-chain settlement must go through payment-router so args (merchant / treasury /
 * reseller / amounts / intent) are verified before RPC submit.
 * Classic multi-op is only allowed in STELLAR_MODE=simulated without a contract id.
 */
export function requirePaymentRouterContractId(
  network: Network = stellarNetwork(),
): string {
  const id = paymentRouterContractId(network);
  if (id) return id;
  const hint =
    network === "mainnet"
      ? "PAYMENT_ROUTER_CONTRACT_ID_MAINNET"
      : "PAYMENT_ROUTER_CONTRACT_ID";
  throw Object.assign(
    new Error(
      `${hint} no está configurado. Los cobros on-chain en ${network} solo liquidan por el contrato payment-router.`,
    ),
    { status: 503 },
  );
}

export function usesPaymentRouter(network: Network = stellarNetwork()): boolean {
  return Boolean(paymentRouterContractId(network));
}

/** Whether this deployment can create/settle cobros on that network. */
export function networkSettlementReady(network: Network): boolean {
  if (process.env.STELLAR_MODE === "simulated") return true;
  return Boolean(paymentRouterContractId(network));
}

export function usdcIssuer(network: Network = stellarNetwork()): string {
  // Legacy override only applies to the deployment default network.
  if (network === stellarNetwork() && process.env.USDC_ISSUER?.trim()) {
    return process.env.USDC_ISSUER.trim();
  }
  return networkConfig(network).usdcIssuer;
}

export function intentNetwork(row: PaymentIntentRow): Network {
  return parseNetwork(row.network);
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
  /** Gross amount for this pay (abonos); default = remaining or full intent. */
  payAmount?: string,
): SplitLeg {
  const network = intentNetwork(row);
  const ledger = readAbonos(row.metadata);
  let netAmount = row.net_amount;
  let feeAmount = row.fee_amount;
  let resellerAmount = row.reseller_amount;
  if (ledger || payAmount) {
    const remaining = remainingAmount(row.amount, ledger);
    const gross = payAmount?.trim() || remaining;
    assertAbonoAmount(row.amount, ledger ?? { enabled: true, paid_atomic: "0", pays: [] }, gross);
    const split = calcFeeSplit(
      parseAssetAmount(gross),
      row.fee_bps,
      row.reseller_fee_bps,
    );
    netAmount = formatAssetAmount(split.net);
    feeAmount = formatAssetAmount(split.viaFee);
    resellerAmount = formatAssetAmount(split.resellerFee);
  }
  return {
    source,
    merchant: row.merchant_wallet,
    treasury: getTreasuryAddress(),
    reseller: row.reseller_address,
    asset: row.asset_code,
    assetIssuer: row.asset_code === "USDC" ? usdcIssuer(network) : null,
    netAmount,
    feeAmount,
    resellerAmount,
    memo: row.id,
    network,
  };
}

export function sep7CallbackUrl(id: string, clientSecret: string): string {
  const url = new URL(`${publicApiUrl()}/v1/checkout/${id}/sep7`);
  url.searchParams.set("client_secret", clientSecret);
  return url.toString();
}

export function buildCheckoutSep7(row: PaymentIntentRow): string {
  const network = intentNetwork(row);
  if (usesPaymentRouter(network)) {
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
    if (row.status !== "requires_payment" && row.status !== "partially_paid") {
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
  payAmount?: string,
) {
  const row = await requirePayable(id, clientSecret);
  if (row.status === "succeeded") {
    throw Object.assign(
      new Error("Este cobro ya está pagado (one-shot intent)"),
      { status: 409 },
    );
  }
  const plan = readPlan(row.metadata);
  if (plan && isPlanParent(plan)) {
    throw Object.assign(
      new Error(
        "Este es un plan de cuotas: pagá la cuota pendiente (usá next_pay_url del plan).",
      ),
      { status: 400, code: "plan_parent_not_payable" },
    );
  }
  const ledger = readAbonos(row.metadata);
  if (!ledger && payAmount) {
    throw Object.assign(
      new Error("Este cobro no acepta abonos (creá con allow_abonos)"),
      { status: 400 },
    );
  }
  const network = intentNetwork(row);
  // Preflight duro (StellaGate-grade): no firmar si el destino no puede recibir.
  try {
    const merchantRx = await receiveStatusFor(
      row.merchant_wallet,
      row.asset_code,
      network,
    );
    if (!merchantRx.canReceive) {
      throw Object.assign(
        new Error(
          "El comercio no puede recibir este asset (cuenta/trustline). Activá trustline en Integración.",
        ),
        { status: 403, code: "merchant_cannot_receive" },
      );
    }
    const treasuryRx = await receiveStatusFor(
      getTreasuryAddress(),
      row.asset_code,
      network,
    );
    if (!treasuryRx.canReceive) {
      throw Object.assign(
        new Error(
          "La tesorería ViaPay no puede recibir este asset ahora. Probá más tarde o XLM.",
        ),
        { status: 403, code: "treasury_cannot_receive" },
      );
    }
    if (row.reseller_address) {
      const resellerRx = await receiveStatusFor(
        row.reseller_address,
        row.asset_code,
        network,
      );
      if (!resellerRx.canReceive) {
        throw Object.assign(
          new Error(
            "El revendedor no puede recibir este asset (trustline faltante).",
          ),
          { status: 403, code: "reseller_cannot_receive" },
        );
      }
    }
  } catch (e) {
    if (e && typeof e === "object" && "status" in e) throw e;
    // Horizon down: allow prepare (soft) — hard fail only on explicit !canReceive
  }
  const remaining = remainingAmount(row.amount, ledger);
  const gross = payAmount?.trim() || remaining;
  const leg = splitLegFor(row, source, ledger ? gross : undefined);
  const routerId = paymentRouterContractId(network);
  if (routerId) {
    const prepared = await buildRouterPayXdr(leg, routerId);
    return {
      xdr: prepared.xdr,
      network_passphrase: prepared.networkPassphrase,
      included_trustline: prepared.includedTrustline,
      settlement: "router" as const,
      contract_id: prepared.contractId,
      network,
      pay_amount: formatAssetAmount(
        parseAssetAmount(leg.netAmount) +
          parseAssetAmount(leg.feeAmount) +
          parseAssetAmount(leg.resellerAmount ?? "0.0000000"),
      ),
      amount_remaining: remaining,
      abonos_enabled: Boolean(ledger),
    };
  }
  // Simulated / local only — onchain without contract id fails via require.
  if (process.env.STELLAR_MODE !== "simulated") {
    requirePaymentRouterContractId(network);
  }
  const prepared = await buildSplitPaymentXdr(leg);
  return {
    xdr: prepared.xdr,
    network_passphrase: prepared.networkPassphrase,
    included_trustline: prepared.includedTrustline,
    settlement: "classic" as const,
    contract_id: null,
    network,
  };
}

export async function receiveStatusFor(
  address: string,
  asset: SplitLeg["asset"],
  network: Network = stellarNetwork(),
) {
  return inspectReceive({
    network,
    address,
    asset,
    assetIssuer: asset === "USDC" ? usdcIssuer(network) : null,
  });
}

export function merchantTrustlineUri(
  pubkey: string,
  network: Network = stellarNetwork(),
): string {
  return buildTrustlineSep7({
    network,
    placeholderSource: pubkey,
    pubkey,
    assetIssuer: usdcIssuer(network),
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
  const byNetwork = new Map<Network, PaymentIntentRow[]>();
  for (const row of pending) {
    const n = intentNetwork(row);
    const list = byNetwork.get(n) ?? [];
    list.push(row);
    byNetwork.set(n, list);
  }
  for (const [network, rows] of byNetwork) {
    const found = await findConfirmedSplits(
      network,
      merchant,
      rows.map((row) => splitLegFor(row, "")),
    );
    for (const hit of found) {
      await markCheckoutSucceeded(hit.memo, hit.hash);
    }
  }
}

export async function submitCheckoutXdr(
  id: string,
  clientSecret: string,
  signedXdr: string,
  payAmount?: string,
) {
  const row = await requirePayable(id, clientSecret);
  if (row.status === "succeeded") return row;
  const network = intentNetwork(row);
  const ledger = readAbonos(row.metadata);
  const remaining = remainingAmount(row.amount, ledger);
  const gross = payAmount?.trim() || remaining;
  const leg = splitLegFor(row, "", ledger ? gross : undefined);
  const payGross = formatAssetAmount(
    parseAssetAmount(leg.netAmount) +
      parseAssetAmount(leg.feeAmount) +
      parseAssetAmount(leg.resellerAmount ?? "0.0000000"),
  );
  const routerId = paymentRouterContractId(network);
  if (routerId) {
    try {
      const submitted = await submitVerifiedRouter(signedXdr, leg, routerId);
      return markCheckoutSucceeded(id, submitted.hash, {
        payAmount: payGross,
        net: leg.netAmount,
        fee: leg.feeAmount,
        reseller: leg.resellerAmount ?? "0.0000000",
      });
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
    requirePaymentRouterContractId(network);
  }
  const submitted = await submitVerifiedSplit(signedXdr, leg);
  return markCheckoutSucceeded(id, submitted.hash, {
    payAmount: payGross,
    net: leg.netAmount,
    fee: leg.feeAmount,
    reseller: leg.resellerAmount ?? "0.0000000",
  });
}
