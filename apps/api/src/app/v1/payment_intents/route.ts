import { z } from "zod";
import { MAX_RESELLER_FEE_BPS, STELLAR_PUBKEY_RE } from "@viapay/shared";
import {
  createPaymentIntent,
  listPaymentIntents,
  serializePaymentIntent,
} from "@/lib/payments";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { reconcileAccountPayments } from "@/lib/chain";

const createSchema = z
  .object({
    amount: z.string().min(1),
    asset: z.enum(["XLM", "USDC"]),
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
  })
  .superRefine((body, ctx) => {
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
    return jsonOk({
      data: rows.map(serializePaymentIntent),
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = createSchema.parse(await req.json());
    const row = await createPaymentIntent(auth, {
      amount: body.amount,
      asset: body.asset,
      description: body.description,
      success_url: body.success_url,
      cancel_url: body.cancel_url,
      reseller_fee_bps: body.reseller_fee_bps,
      reseller_address: body.reseller_address,
      external_user_id: resolveExternalUserId(body),
      metadata: body.metadata,
    });
    return jsonOk(serializePaymentIntent(row), { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
