/**
 * Signed cobro link — merchant wallet signs amount+asset+network+destinos so /pay
 * can show "comercio verificado" (anti-phishing for WA / ecommerce forwards).
 */
import { Keypair } from "@stellar/stellar-sdk";
import {
  STELLAR_PUBKEY_RE,
  linkSigMessageV1,
  linkSigMessageV2,
  readLinkSigMeta,
  type LinkSigV1Payload,
  type LinkSigV2Payload,
} from "@viapay/shared";

export type { LinkSigV1Payload, LinkSigV2Payload };
export {
  linkSigMessageV1,
  linkSigMessageV2,
  linkSigMessageV1 as linkSigMessage,
};

const STELLAR_SIGNED_PREFIX = "Stellar Signed Message:\n";

function decodeSignature(signature: string): Buffer | null {
  const trimmed = signature.trim();
  if (!trimmed) return null;
  // SEP-43 hex (128 chars) or base64 (typically 88 for 64-byte sig).
  if (/^[0-9a-fA-F]{128}$/.test(trimmed)) {
    return Buffer.from(trimmed, "hex");
  }
  try {
    const buf = Buffer.from(trimmed, "base64");
    return buf.length === 64 ? buf : null;
  } catch {
    return null;
  }
}

function ed25519Verify(
  publicKey: string,
  messageUtf8: string,
  sig: Buffer,
): boolean {
  const kp = Keypair.fromPublicKey(publicKey);
  const raw = Buffer.from(messageUtf8, "utf8");
  if (kp.verify(raw, sig)) return true;
  // Some wallets prefix SEP-43 / SEP-53 style.
  const prefixed = Buffer.from(STELLAR_SIGNED_PREFIX + messageUtf8, "utf8");
  return kp.verify(prefixed, sig);
}

export type LinkVerifyResult =
  | { ok: true; version: 1 | 2; expired: false }
  | { ok: false; reason: string; expired?: boolean };

export function verifyLinkSignature(
  payload: LinkSigV1Payload,
  signatureBase64: string,
): LinkVerifyResult {
  if (!STELLAR_PUBKEY_RE.test(payload.merchant_wallet)) {
    return { ok: false, reason: "invalid_merchant" };
  }
  const sig = decodeSignature(signatureBase64);
  if (!sig || sig.length !== 64) {
    return { ok: false, reason: "bad_signature" };
  }
  try {
    const msg = linkSigMessageV1(payload);
    const ok = ed25519Verify(payload.merchant_wallet, msg, sig);
    return ok
      ? { ok: true, version: 1, expired: false }
      : { ok: false, reason: "verify_failed" };
  } catch {
    return { ok: false, reason: "verify_error" };
  }
}

export function verifyLinkSignatureV2(
  payload: LinkSigV2Payload,
  signature: string,
  nowUnix = Math.floor(Date.now() / 1000),
): LinkVerifyResult {
  if (!STELLAR_PUBKEY_RE.test(payload.merchant)) {
    return { ok: false, reason: "invalid_merchant" };
  }
  if (!STELLAR_PUBKEY_RE.test(payload.treasury)) {
    return { ok: false, reason: "invalid_treasury" };
  }
  if (payload.reseller !== "-" && !STELLAR_PUBKEY_RE.test(payload.reseller)) {
    return { ok: false, reason: "invalid_reseller" };
  }
  if (payload.expires_unix < nowUnix) {
    return { ok: false, reason: "expired", expired: true };
  }
  const sig = decodeSignature(signature);
  if (!sig || sig.length !== 64) {
    return { ok: false, reason: "bad_signature" };
  }
  try {
    const msg = linkSigMessageV2(payload);
    const ok = ed25519Verify(payload.merchant, msg, sig);
    return ok
      ? { ok: true, version: 2, expired: false }
      : { ok: false, reason: "verify_failed" };
  } catch {
    return { ok: false, reason: "verify_error" };
  }
}

/**
 * Verify stored signature on a payment_intent row (v2 meta or legacy v1).
 */
export function verifyStoredLinkSignature(input: {
  amount: string;
  asset: string;
  network: string;
  merchant_wallet: string;
  fee_bps: number;
  reseller_address: string | null;
  metadata: Record<string, unknown> | null | undefined;
  treasury: string;
  signature: string;
  nowUnix?: number;
}): {
  verified: boolean | null;
  status: "verified" | "invalid" | "expired" | null;
  version: 1 | 2 | null;
} {
  const meta = readLinkSigMeta(input.metadata);
  if (meta) {
    const r = verifyLinkSignatureV2(
      {
        network: input.network,
        asset: input.asset,
        // Prefer amount embedded at sign-time (plan children share parent sig).
        amount: meta.amount || input.amount,
        merchant: input.merchant_wallet,
        treasury: meta.treasury || input.treasury,
        reseller: meta.reseller || input.reseller_address || "-",
        fee_bps: meta.fee_bps,
        expires_unix: meta.expires_unix,
        nonce: meta.nonce,
      },
      input.signature,
      input.nowUnix,
    );
    if (r.ok) {
      return { verified: true, status: "verified", version: 2 };
    }
    if (r.expired) {
      return { verified: false, status: "expired", version: 2 };
    }
    return { verified: false, status: "invalid", version: 2 };
  }
  const r = verifyLinkSignature(
    {
      amount: input.amount,
      asset: input.asset,
      network: input.network,
      merchant_wallet: input.merchant_wallet,
    },
    input.signature,
  );
  if (r.ok) {
    return { verified: true, status: "verified", version: 1 };
  }
  return { verified: false, status: "invalid", version: 1 };
}
