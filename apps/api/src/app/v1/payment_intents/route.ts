import { z } from "zod";
import { MAX_RESELLER_FEE_BPS, STELLAR_PUBKEY_RE } from "@viapay/shared";
import {
  createPaymentIntent,
  listPaymentIntents,
  serializePaymentIntentAsync,
} from "@/lib/payments";
import { lockExactPayAmount } from "@/lib/exact-pay";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import {
  networkSettlementReady,
  parseNetwork,
  reconcileAccountPayments,
  stellarNetwork,
} from "@/lib/chain";

const createSchema = z
  .object({
    /** Crypto amount. Required for scheme=exact; ignored/overwritten for exact_pay. */
    amount: z.string().min(1).optional(),
    asset: z.enum(["XLM", "USDC"]),
    /**
     * exact = amount is crypto (default).
     * exact_pay = quote in fiat_amount+fiat_currency; lock crypto at create (ViaPay scheme).
     */
    scheme: z.enum(["exact", "exact_pay"]).optional(),
    fiat_amount: z.string().min(1).optional(),
    fiat_currency: z
      .enum(["CLP", "ARS", "COP", "BOB", "MXN", "PEN", "USD"])
      .optional(),
    /** Stellar network for this charge. Defaults to STELLAR_NETWORK. */
    network: z.enum(["testnet", "mainnet", "local"]).optional(),
    description: z.string().max(200).optional(),
    success_url: z.string().url().optional(),
    cancel_url: z.string().url().optional(),
    reseller_fee_bps: z.number().int().min(0).max(MAX_RESELLER_FEE_BPS).optional(),
    reseller_address: z
      .string()
      .regex(STELLAR_PUBKEY_RE, "reseller_address inválida")
      .optional(),
    /** Merchant's end-customer id. */
    external_user_id: z.string().trim().min(1).max(128).optional(),
    /** Aliases accepted for convenience. */
    externalUserId: z.string().trim().min(1).max(128).optional(),
    customer_id: z.string().trim().min(1).max(128).optional(),
    customerId: z.string().trim().min(1).max(128).optional(),
    customer_ref: z.string().trim().min(1).max(128).optional(),
    metadata: z.record(z.string(), z.unknown()).optional(),
    /** Accept partial pays (abonos / layaway) until total covered. */
    allow_abonos: z.boolean().optional(),
    /** Opt-in fixed installment plan (merchant choice; not combined with abonos). */
    plan: z
      .object({
        installments: z.number().int().min(2).max(24),
        start_at: z.string().datetime().optional(),
      })
      .optional(),
    /** Base64/hex ed25519 sig of viapay-link-v1 or v2 message. */
    link_signature: z.string().min(80).optional(),
    /** Snapshot for v2 signed links (required when signing v2). */
    link_sig: z
      .object({
        v: z.literal(2),
        nonce: z.string().min(8).max(64),
        expires_unix: z.number().int().positive(),
        treasury: z.string().regex(STELLAR_PUBKEY_RE),
        reseller: z.string().min(1),
        fee_bps: z.number().int().min(0).max(10000),
        amount: z.string().min(1).optional(),
      })
      .optional(),
  })
  .superRefine((body, ctx) => {
    if (body.allow_abonos && body.plan) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "No se puede combinar allow_abonos con plan",
        path: ["plan"],
      });
    }
    const scheme = body.scheme ?? "exact";
    if (scheme === "exact_pay") {
      if (!body.fiat_amount) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "exact_pay requiere fiat_amount",
          path: ["fiat_amount"],
        });
      }
      if (!body.fiat_currency) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "exact_pay requiere fiat_currency",
          path: ["fiat_currency"],
        });
      }
    } else if (!body.amount) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "amount requerido para scheme exact",
        path: ["amount"],
      });
    }
    if (body.metadata && JSON.stringify(body.metadata).length > 4096) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "metadata too large (max ~4KB)",
        path: ["metadata"],
      });
    }
  });

function resolveExternalUserId(body: z.infer<typeof createSchema>): string | undefined {
  return (
    body.external_user_id ??
    body.externalUserId ??
    body.customer_id ??
    body.customerId ??
    body.customer_ref
  );
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (auth.merchantWallet) {
      try {
        await reconcileAccountPayments(auth.accountId, auth.merchantWallet);
      } catch {
        // Horizon down should not hide the dashboard list.
      }
    }
    const rows = await listPaymentIntents(auth.accountId);
    const data = await Promise.all(rows.map((r) => serializePaymentIntentAsync(r)));
    return jsonOk({ data });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = createSchema.parse(await req.json());
    const network = parseNetwork(body.network ?? stellarNetwork());
    if (!networkSettlementReady(network)) {
      throw Object.assign(
        new Error(
          network === "mainnet"
            ? "Mainnet no está habilitado aún: falta PAYMENT_ROUTER_CONTRACT_ID_MAINNET en la API (deploy del payment-router + env)."
            : `La red ${network} no está lista para liquidar cobros (falta payment-router).`,
        ),
        { status: 503 },
      );
    }
    const scheme = body.scheme ?? "exact";
    let amount = body.amount ?? "";
    let metadata = body.metadata ? { ...body.metadata } : {};

    if (scheme === "exact_pay") {
      const lock = await lockExactPayAmount({
        fiatAmount: body.fiat_amount!,
        fiatCurrency: body.fiat_currency!,
        asset: body.asset,
      });
      amount = lock.crypto_amount;
      metadata = { ...metadata, exact_pay: lock };
      if (
        !body.description?.trim() &&
        !metadata.description
      ) {
        // keep description optional; UI can set it
      }
    }

    const row = await createPaymentIntent(auth, {
      amount,
      asset: body.asset,
      network,
      description:
        body.description ??
        (scheme === "exact_pay"
          ? `Exact-pay ${body.fiat_amount} ${body.fiat_currency}`
          : undefined),
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      reseller_fee_bps: body.reseller_fee_bps,
      reseller_address: body.reseller_address,
      external_user_id: resolveExternalUserId(body),
      metadata: Object.keys(metadata).length ? metadata : undefined,
      allow_abonos: body.allow_abonos,
      plan: body.plan,
      link_signature: body.link_signature,
      link_sig: body.link_sig,
    });
    return jsonOk(await serializePaymentIntentAsync(row), { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
