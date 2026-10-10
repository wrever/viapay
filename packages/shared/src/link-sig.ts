/**
 * Signed cobro link messages (anti-phishing for shared / ecommerce links).
 * Verification (ed25519) lives in the API; this package only builds the bytes.
 */

export type LinkSigV1Payload = {
  amount: string;
  asset: string;
  network: string;
  merchant_wallet: string;
};

export type LinkSigV2Payload = {
  network: string;
  asset: string;
  amount: string;
  merchant: string;
  treasury: string;
  /** G… or "-" when no reseller leg. */
  reseller: string;
  fee_bps: number;
  expires_unix: number;
  nonce: string;
};

export type LinkSigMetaV2 = {
  v: 2;
  nonce: string;
  expires_unix: number;
  treasury: string;
  reseller: string;
  fee_bps: number;
  /** Gross amount that was signed (needed when copied onto plan children). */
  amount?: string;
};

/** Deterministic message the merchant signs (UTF-8). */
export function linkSigMessageV1(p: LinkSigV1Payload): string {
  return [
    "viapay-link-v1",
    p.amount,
    p.asset,
    p.network,
    p.merchant_wallet,
  ].join("|");
}

export function linkSigMessageV2(p: LinkSigV2Payload): string {
  return [
    "viapay-link-v2",
    p.network,
    p.asset,
    p.amount,
    p.merchant,
    p.treasury,
    p.reseller || "-",
    String(p.fee_bps),
    String(p.expires_unix),
    p.nonce,
  ].join("|");
}

/** @deprecated alias — prefer linkSigMessageV1 */
export function linkSigMessage(p: LinkSigV1Payload): string {
  return linkSigMessageV1(p);
}

export function generateLinkSigNonce(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Default signed-link lifetime: 7 days. */
export function defaultLinkSigExpiresUnix(nowMs = Date.now()): number {
  return Math.floor(nowMs / 1000) + 7 * 24 * 60 * 60;
}

export function readLinkSigMeta(
  metadata: Record<string, unknown> | null | undefined,
): LinkSigMetaV2 | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.link_sig;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.v !== 2) return null;
  if (typeof o.nonce !== "string" || !o.nonce) return null;
  if (typeof o.expires_unix !== "number" || !Number.isFinite(o.expires_unix)) {
    return null;
  }
  if (typeof o.treasury !== "string" || typeof o.reseller !== "string") {
    return null;
  }
  if (typeof o.fee_bps !== "number" || !Number.isInteger(o.fee_bps)) {
    return null;
  }
  return {
    v: 2,
    nonce: o.nonce,
    expires_unix: o.expires_unix,
    treasury: o.treasury,
    reseller: o.reseller || "-",
    fee_bps: o.fee_bps,
    amount: typeof o.amount === "string" ? o.amount : undefined,
  };
}
