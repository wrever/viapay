import type { AssetCode } from "@viapay/shared";

const B64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/";

/** base64 of UTF-8 bytes, without depending on Node's Buffer or the DOM's btoa. */
function base64Utf8(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let out = "";
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i];
    const b = bytes[i + 1];
    const c = bytes[i + 2];
    out += B64[a >> 2];
    out += B64[((a & 3) << 4) | ((b ?? 0) >> 4)];
    out += b === undefined ? "=" : B64[((b & 15) << 2) | ((c ?? 0) >> 6)];
    out += c === undefined ? "=" : B64[c & 63];
  }
  return out;
}

export type X402Share = {
  role: "merchant" | "viapay_treasury" | "reseller";
  address: string;
  amount: string;
  amount_atomic: string;
  bps: number;
  share: string;
};

export type X402Challenge = {
  x402Version: number;
  /** CAIP-2 network id, e.g. `stellar:testnet`. */
  network: string;
  scheme: string;
  resource: string;
  description: string;
  /** Total due, in atomic units (7 decimals). */
  maxAmountRequired: string;
  /** Total due, as a decimal string. */
  amount: string;
  asset: AssetCode;
  assetIssuer: string | null;
  memo: string;
  paymentIntentId: string;
  /** Who gets what. Adds up to `amount`. */
  breakdown: X402Share[];
  prepareUrl: string;
  submitUrl: string;
  raw: unknown;
};

export type ViaPayClientOptions = {
  /**
   * Merchant secret API key (`sk_test_…` / `sk_live_…`).
   * Server-side only — creates payment links. There is no publishable key yet.
   */
  apiKey: string;
  /** API base, e.g. `https://viapay-api.vercel.app`. Default: localhost:3001. */
  baseUrl?: string;
  /** Unused for now; checkout URL comes from the API response. */
  checkoutUrl?: string;
};

export type CreatePaymentLinkInput = {
  /** Decimal string, Stellar precision (e.g. `"10.0000000"` or `"10"`). */
  amount: string;
  asset: AssetCode;
  /** Optional display currency hint for your own records (not used on-chain). */
  currency?: string;
  /** Your end-customer id — stored on the payment intent for reconciliation. */
  externalUserId?: string;
  /** Alias of `externalUserId`. */
  customerId?: string;
  description?: string;
  metadata?: Record<string, unknown>;
  successUrl?: string;
  cancelUrl?: string;
  /** Reseller's cut in basis points. 700 = 7%. Needs `resellerAddress`. */
  resellerFeeBps?: number;
  /** Stellar account (G…) that receives the reseller cut. */
  resellerAddress?: string;
};

/** Snake_case body for `createCheckout` (HTTP-shaped). */
export type CreateCheckoutInput = {
  amount: string;
  asset: AssetCode;
  description?: string;
  success_url?: string;
  cancel_url?: string;
  reseller_fee_bps?: number;
  reseller_address?: string;
  external_user_id?: string;
  customer_id?: string;
  metadata?: Record<string, unknown>;
};

export type PaymentLink = {
  id: string;
  url: string;
  clientSecret: string;
  amount: string;
  asset: AssetCode;
  feeAmount: string;
  netAmount: string;
  resellerAmount: string;
  resellerAddress: string | null;
  externalUserId: string | null;
  metadata: Record<string, unknown> | null;
  raw: unknown;
};

function mapPaymentLink(body: Record<string, unknown>): PaymentLink {
  return {
    id: body.id as string,
    url: body.checkout_url as string,
    clientSecret: body.client_secret as string,
    amount: body.amount as string,
    asset: body.asset as AssetCode,
    feeAmount: body.fee_amount as string,
    netAmount: body.net_amount as string,
    resellerAmount: (body.reseller_amount as string) ?? "0.0000000",
    resellerAddress: (body.reseller_address ?? null) as string | null,
    externalUserId: (body.external_user_id ?? null) as string | null,
    metadata: (body.metadata ?? null) as Record<string, unknown> | null,
    raw: body,
  };
}

export class ViaPay {
  private apiKey: string;
  private baseUrl: string;

  constructor(opts: ViaPayClientOptions) {
    this.apiKey = opts.apiKey;
    this.baseUrl = (opts.baseUrl ?? "http://localhost:3001").replace(/\/$/, "");
  }

  /**
   * Create a unique hosted payment link (`/pay/{id}`) for one charge.
   * Prefer this over `createCheckout` for new integrations (camelCase + user id).
   */
  async createPaymentLink(input: CreatePaymentLinkInput): Promise<PaymentLink> {
    const externalUserId = input.externalUserId ?? input.customerId;
    const metadata =
      input.metadata || input.currency
        ? {
            ...(input.metadata ?? {}),
            ...(input.currency ? { currency: input.currency } : {}),
          }
        : undefined;

    return this.createCheckout({
      amount: input.amount,
      asset: input.asset,
      description: input.description,
      success_url: input.successUrl,
      cancel_url: input.cancelUrl,
      reseller_fee_bps: input.resellerFeeBps,
      reseller_address: input.resellerAddress,
      external_user_id: externalUserId,
      metadata,
    });
  }

  /**
   * Create a hosted checkout. ViaPay's own fee lives on the server and cannot
   * be set from here; `reseller_fee_bps` is an extra cut on top of it, paid to
   * `reseller_address` in the same Stellar transaction.
   */
  async createCheckout(input: CreateCheckoutInput): Promise<PaymentLink> {
    if (input.reseller_fee_bps != null && input.reseller_fee_bps > 0 && !input.reseller_address) {
      throw new Error("reseller_fee_bps necesita reseller_address");
    }
    const res = await fetch(`${this.baseUrl}/v1/payment_intents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        amount: input.amount,
        asset: input.asset,
        description: input.description,
        success_url: input.success_url,
        cancel_url: input.cancel_url,
        reseller_fee_bps: input.reseller_fee_bps,
        reseller_address: input.reseller_address,
        external_user_id: input.external_user_id ?? input.customer_id,
        metadata: input.metadata,
      }),
    });
    const body = (await res.json()) as Record<string, unknown> & { error?: string };
    if (!res.ok) {
      throw new Error(body.error ?? `ViaPay error ${res.status}`);
    }
    return mapPaymentLink(body);
  }

  /** Fetch one payment intent by id (same merchant as the API key). */
  async getPaymentLink(id: string): Promise<PaymentLink> {
    const res = await fetch(`${this.baseUrl}/v1/payment_intents/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${this.apiKey}` },
    });
    const body = (await res.json()) as Record<string, unknown> & { error?: string };
    if (!res.ok) {
      throw new Error(body.error ?? `ViaPay error ${res.status}`);
    }
    return mapPaymentLink(body);
  }

  /**
   * Turn a ViaPay 402 body into the few fields an agent actually needs to pay.
   * Returns null for anything that is not a ViaPay x402 challenge.
   */
  static parseX402Challenge(body: unknown): X402Challenge | null {
    if (typeof body !== "object" || body === null) return null;
    const root = body as Record<string, never>;
    const accepts = root.accepts as unknown;
    const viapay = root.viapay as Record<string, never> | undefined;
    if (!Array.isArray(accepts) || accepts.length === 0 || !viapay) return null;
    const accept = accepts[0] as Record<string, never>;
    const settle = (viapay.settle ?? {}) as Record<string, never>;
    const extra = (accept.extra ?? {}) as Record<string, never>;
    return {
      x402Version: Number(root.x402Version ?? 2),
      network: String(accept.network ?? ""),
      scheme: String(accept.scheme ?? "exact"),
      resource: String(accept.resource ?? ""),
      description: String(accept.description ?? ""),
      maxAmountRequired: String(accept.maxAmountRequired ?? ""),
      amount: String(viapay.amount ?? ""),
      asset: (viapay.asset ?? extra.asset_code ?? "USDC") as AssetCode,
      assetIssuer: (viapay.asset_issuer ?? null) as string | null,
      memo: String(extra.memo ?? viapay.payment_intent ?? ""),
      paymentIntentId: String(viapay.payment_intent ?? ""),
      breakdown: (viapay.breakdown ?? []) as X402Share[],
      prepareUrl: String(
        (settle.prepare as Record<string, never> | undefined)?.url ?? "",
      ),
      submitUrl: String(
        (settle.submit as Record<string, never> | undefined)?.url ??
          accept.resource ??
          "",
      ),
      raw: body,
    };
  }

  /** Builds the `X-PAYMENT` header value for a signed Stellar envelope. */
  static encodePaymentHeader(input: {
    network: string;
    signedXdr: string;
  }): string {
    return base64Utf8(
      JSON.stringify({
        x402Version: 2,
        scheme: "exact",
        network: input.network,
        payload: { signed_xdr: input.signedXdr },
      }),
    );
  }

  /**
   * Verify `ViaPay-Signature: t=<unix>,v1=<hex>` against the raw request body.
   * Rejects signatures older than 5 minutes.
   */
  static async verifyWebhook(
    rawBody: string,
    header: string | null,
    secret: string,
    nowSec = Math.floor(Date.now() / 1000),
  ): Promise<boolean> {
    if (!header) return false;
    const parts = Object.fromEntries(
      header.split(",").map((part) => {
        const idx = part.indexOf("=");
        return [part.slice(0, idx), part.slice(idx + 1)];
      }),
    );
    const timestamp = Number(parts.t);
    const signature = parts.v1;
    if (!Number.isFinite(timestamp) || !signature || signature.length !== 64) return false;
    if (Math.abs(nowSec - timestamp) > 300) return false;
    const key = await crypto.subtle.importKey(
      "raw",
      new TextEncoder().encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign"],
    );
    const mac = await crypto.subtle.sign(
      "HMAC",
      key,
      new TextEncoder().encode(`${timestamp}.${rawBody}`),
    );
    const expected = [...new Uint8Array(mac)]
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
    if (expected.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < expected.length; i++) {
      diff |= expected.charCodeAt(i) ^ signature.charCodeAt(i);
    }
    return diff === 0;
  }
}
