import {
  buildSep7SplitUri,
  buildSplitPaymentXdr,
  buildTrustlineSep7,
  findConfirmedSplit,
  findConfirmedSplits,
  inspectReceive,
  networkConfig,
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
  const prepared = await buildSplitPaymentXdr(splitLegFor(row, source));
  return {
    xdr: prepared.xdr,
    network_passphrase: prepared.networkPassphrase,
    included_trustline: prepared.includedTrustline,
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
  const submitted = await submitVerifiedSplit(signedXdr, splitLegFor(row, ""));
  return markCheckoutSucceeded(id, submitted.hash);
}
