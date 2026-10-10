/** ViaPay's own fee. 100 bps = 1%. Server-side only: a client never sets it. */
export const DEFAULT_FEE_BPS = 100;

/** A reseller can take up to 99% minus whatever ViaPay takes. */
export const MAX_RESELLER_FEE_BPS = 9900;

/** ViaPay fee + reseller fee must stay strictly under 100% so the merchant nets something. */
export const MAX_TOTAL_FEE_BPS = 10000;

export const STELLAR_PUBKEY_RE = /^G[A-Z2-7]{55}$/;

export type AssetCode = "XLM" | "USDC";
export type PaymentIntentStatus =
  | "requires_payment"
  | "partially_paid"
  | "succeeded"
  | "canceled"
  | "expired";

export {
  appendAbono,
  assertAbonoAmount,
  emptyAbonosLedger,
  readAbonos,
  remainingAmount,
  remainingAtomic,
  type AbonoPay,
  type AbonosLedger,
} from "./abonos";

export {
  defaultLinkSigExpiresUnix,
  generateLinkSigNonce,
  linkSigMessage,
  linkSigMessageV1,
  linkSigMessageV2,
  readLinkSigMeta,
  type LinkSigMetaV2,
  type LinkSigV1Payload,
  type LinkSigV2Payload,
} from "./link-sig";

export {
  PLAN_INSTALLMENTS_MAX,
  PLAN_INSTALLMENTS_MIN,
  assertInstallmentCount,
  buildMonthlyDueDates,
  isPlanChild,
  isPlanParent,
  planFullyPaid,
  readPlan,
  splitInstallmentAmounts,
  summarizePlan,
  type ChildStatusMap,
  type PlanMeta,
  type PlanScheduleEntry,
  type PlanSummary,
} from "./plan";

export function generatePrefixedId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12));
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `${prefix}_${hex}`;
}

export function parseAssetAmount(amount: string, decimals = 7): bigint {
  const cleaned = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error("Invalid amount");
  }
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

export function formatAssetAmount(units: bigint, decimals = 7): string {
  const neg = units < 0n;
  const v = neg ? -units : units;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

/** The three parties a payment is cut between. */
export type FeeSplit = {
  amount: bigint;
  /** ViaPay's cut, to the treasury. */
  viaFee: bigint;
  /** The reseller's cut. Zero when nobody resold this merchant. */
  resellerFee: bigint;
  /** What is left for the merchant. */
  net: bigint;
  viaBps: number;
  resellerBps: number;
};

/**
 * Cut `amountUnits` three ways. ViaPay and the reseller each round down, and the
 * merchant absorbs the remainder, so the three legs always add back up to the total.
 */
export function calcFeeSplit(
  amountUnits: bigint,
  viaBps = DEFAULT_FEE_BPS,
  resellerBps = 0,
): FeeSplit {
  assertFeeBps(viaBps, resellerBps);
  const viaFee = (amountUnits * BigInt(viaBps)) / 10000n;
  const resellerFee = (amountUnits * BigInt(resellerBps)) / 10000n;
  return {
    amount: amountUnits,
    viaFee,
    resellerFee,
    net: amountUnits - viaFee - resellerFee,
    viaBps,
    resellerBps,
  };
}

export function assertFeeBps(viaBps: number, resellerBps: number): void {
  if (!Number.isInteger(viaBps) || viaBps < 0 || viaBps > MAX_TOTAL_FEE_BPS) {
    throw new Error("El fee de ViaPay tiene que ser un entero de 0 a 10000 bps");
  }
  if (
    !Number.isInteger(resellerBps) ||
    resellerBps < 0 ||
    resellerBps > MAX_RESELLER_FEE_BPS
  ) {
    throw new Error(
      `El fee del revendedor tiene que ser un entero de 0 a ${MAX_RESELLER_FEE_BPS} bps`,
    );
  }
  if (viaBps + resellerBps >= MAX_TOTAL_FEE_BPS) {
    throw new Error(
      "Los fees suman 100% o más y el comercio no recibiría nada. Baja el fee del revendedor.",
    );
  }
}

/** Reads FEE_BPS from the server environment. Falls back to 1% if it is missing or junk. */
export function resolveViaFeeBps(raw: string | undefined): number {
  if (raw == null || raw.trim() === "") return DEFAULT_FEE_BPS;
  const parsed = Number(raw);
  if (!Number.isInteger(parsed) || parsed < 0 || parsed >= MAX_TOTAL_FEE_BPS) {
    return DEFAULT_FEE_BPS;
  }
  return parsed;
}

/** 100 → "1%", 150 → "1,5%", 325 → "3,25%". Spanish decimal comma. */
export function formatBps(bps: number): string {
  const pct = bps / 100;
  const text = Number.isInteger(pct) ? String(pct) : pct.toFixed(2).replace(/0+$/, "");
  return `${text.replace(".", ",")}%`;
}

export function isValidStellarPubkey(address: string): boolean {
  return STELLAR_PUBKEY_RE.test(address);
}

/** Who receives a payout leg in a ViaPay split (on-chain order: merchant → treasury → reseller). */
export type PayoutRole = "merchant" | "viapay_treasury" | "reseller";

export type PayoutShare = {
  role: PayoutRole;
  address: string;
  amount: string;
  /** Atomic units, 7 decimals — same shape x402 quotes. */
  amount_atomic: string;
  bps: number;
  share: string;
};

export type PayoutBreakdownInput = {
  merchant_wallet: string;
  treasury_wallet: string;
  net_amount: string;
  fee_amount: string;
  fee_bps: number;
  reseller_address?: string | null;
  reseller_amount?: string | null;
  reseller_fee_bps?: number | null;
};

/**
 * Build the 2–3 payout legs from persisted intent amounts.
 * Filters zero amounts so a 0% reseller never appears.
 */
export function buildPayoutBreakdown(
  input: PayoutBreakdownInput,
): PayoutShare[] {
  const resellerBps = input.reseller_fee_bps ?? 0;
  const merchantBps = 10000 - input.fee_bps - resellerBps;
  const shares: PayoutShare[] = [
    {
      role: "merchant",
      address: input.merchant_wallet,
      amount: input.net_amount,
      amount_atomic: parseAssetAmount(input.net_amount).toString(),
      bps: merchantBps,
      share: formatBps(merchantBps),
    },
    {
      role: "viapay_treasury",
      address: input.treasury_wallet,
      amount: input.fee_amount,
      amount_atomic: parseAssetAmount(input.fee_amount).toString(),
      bps: input.fee_bps,
      share: formatBps(input.fee_bps),
    },
  ];
  if (
    input.reseller_address &&
    resellerBps > 0 &&
    input.reseller_amount &&
    parseAssetAmount(input.reseller_amount) > 0n
  ) {
    shares.push({
      role: "reseller",
      address: input.reseller_address,
      amount: input.reseller_amount,
      amount_atomic: parseAssetAmount(input.reseller_amount).toString(),
      bps: resellerBps,
      share: formatBps(resellerBps),
    });
  }
  return shares.filter((share) => parseAssetAmount(share.amount) > 0n);
}
