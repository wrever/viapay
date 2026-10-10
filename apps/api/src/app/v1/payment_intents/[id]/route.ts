import {
  getPaymentIntentById,
  serializePaymentIntentAsync,
} from "@/lib/payments";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { reconcileCheckoutPayment } from "@/lib/chain";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await ctx.params;
    let row = await getPaymentIntentById(id);
    if (!row || row.account_id !== auth.accountId) {
      return jsonError(Object.assign(new Error("Not found"), { status: 404 }));
    }
    if (row.status === "requires_payment") {
      try {
        row = await reconcileCheckoutPayment(row);
      } catch {
        // Horizon/RPC down should not hide the intent.
      }
    }
    return jsonOk(await serializePaymentIntentAsync(row));
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
