import {
  DEFAULT_FEE_BPS,
  buildPayoutBreakdown,
  type PayoutShare,
} from "@viapay/shared";
import type { CheckoutIntent } from "@/lib/checkout/types";

export type { PayoutShare };

/** Legs for preview/receipt; prefers API `breakdown`, else rebuilds from intent fields. */
export function legsFromIntent(intent: CheckoutIntent): PayoutShare[] {
  if (intent.breakdown?.length) return intent.breakdown;
  const treasury = intent.treasury_wallet?.trim();
  if (!treasury) return [];
  return buildPayoutBreakdown({
    merchant_wallet: intent.merchant_wallet,
    treasury_wallet: treasury,
    net_amount: intent.net_amount,
    fee_amount: intent.fee_amount,
    fee_bps: intent.fee_bps ?? DEFAULT_FEE_BPS,
    reseller_address: intent.reseller_address,
    reseller_amount: intent.reseller_amount,
    reseller_fee_bps: intent.reseller_fee_bps,
  });
}

export function shortAddress(address: string): string {
  if (address.length <= 12) return address;
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

export function expertAccountUrl(
  address: string,
  network: "testnet" | "mainnet" | "local" | string,
): string | null {
  if (network === "local") return null;
  const explorer = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${explorer}/account/${address}`;
}
