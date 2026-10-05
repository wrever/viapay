import { z } from "zod";
import {
  confirmCheckoutPayment,
  serializePaymentIntent,
} from "@/lib/payments";
import { ensureDb, jsonError, jsonOk } from "@/lib/http";

const bodySchema = z.object({
  client_secret: z.string().min(10),
  payer: z.string().optional(),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    ensureDb();
    const { id } = await ctx.params;
    const body = bodySchema.parse(await req.json());
    const updated = confirmCheckoutPayment(id, body.client_secret, body.payer);
    return jsonOk(serializePaymentIntent(updated));
  } catch (e) {
    return jsonError(e);
  }
}
