import { z } from "zod";
import { MAX_RESELLER_FEE_BPS, STELLAR_PUBKEY_RE } from "@viapay/shared";
import {
  createPaymentIntent,
  listPaymentIntents,
  serializePaymentIntent,
} from "@/lib/payments";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { reconcileAccountPayments } from "@/lib/chain";

// No `fee_bps` here on purpose: ViaPay's own 1% lives in the server environment
// and a client must not be able to lower it. A reseller cut is additive.
const createSchema = z.object({
  amount: z.string().min(1),
  asset: z.enum(["XLM", "USDC"]),
  description: z.string().max(200).optional(),
  success_url: z.string().url().optional(),
  cancel_url: z.string().url().optional(),
  reseller_fee_bps: z.number().int().min(0).max(MAX_RESELLER_FEE_BPS).optional(),
  reseller_address: z.string().regex(STELLAR_PUBKEY_RE, "reseller_address inválida").optional(),
});

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    if (auth.merchantWallet) {
      try {
        await reconcileAccountPayments(auth.accountId, auth.merchantWallet);
      } catch {
        // Horizon down should not hide the dashboard list.
      }
    }
    return jsonOk({
      data: listPaymentIntents(auth.accountId).map(serializePaymentIntent),
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireAuth(req);
    const body = createSchema.parse(await req.json());
    const row = createPaymentIntent(auth, body);
    return jsonOk(serializePaymentIntent(row), { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
