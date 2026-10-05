import type { AssetCode } from "./types";

/** Build a SEP-0007 pay URI scannable by Stellar mobile wallets. */
export function buildSep7PayUri(opts: {
  destination: string;
  amount: string;
  asset: AssetCode;
  assetIssuer?: string | null;
  memo?: string;
}): string {
  const params = new URLSearchParams();
  params.set("destination", opts.destination);
  // trim trailing zeros for nicer wallet UX but keep precision
  params.set("amount", stripTrailingZeros(opts.amount));
  if (opts.asset !== "XLM" && opts.assetIssuer) {
    params.set("asset_code", opts.asset);
    params.set("asset_issuer", opts.assetIssuer);
  }
  if (opts.memo) {
    params.set("memo", opts.memo.slice(0, 28));
    params.set("memo_type", "text");
  }
  return `web+stellar:pay?${params.toString()}`;
}

function stripTrailingZeros(amount: string): string {
  if (!amount.includes(".")) return amount;
  return amount.replace(/\.?0+$/, "") || "0";
}
