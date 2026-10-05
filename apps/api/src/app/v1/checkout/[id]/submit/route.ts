import { z } from "zod";
import { submitCheckoutXdr } from "@/lib/chain";
import { ensureDb, jsonError, jsonOk } from "@/lib/http";
import { serializePaymentIntent } from "@/lib/payments";

const bodySchema = z.object({
  client_secret: z.string().min(10),
  signed_xdr: z.string().min(20),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    ensureDb();
    const { id } = await ctx.params;
    const body = bodySchema.parse(await req.json());
    const updated = await submitCheckoutXdr(id, body.client_secret, body.signed_xdr);
    return jsonOk(serializePaymentIntent(updated));
  } catch (e) {
    return jsonError(e);
  }
}
