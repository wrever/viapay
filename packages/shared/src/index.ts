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
  | "succeeded"
  | "canceled"
  | "expired";

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
