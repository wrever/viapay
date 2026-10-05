import { z } from "zod";
import { prepareCheckoutXdr } from "@/lib/chain";
import { ensureDb, jsonError, jsonOk } from "@/lib/http";

const bodySchema = z.object({
  client_secret: z.string().min(10),
  source: z.string().regex(/^G[A-Z2-7]{55}$/),
});

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    ensureDb();
    const { id } = await ctx.params;
    const body = bodySchema.parse(await req.json());
    const prepared = await prepareCheckoutXdr(id, body.client_secret, body.source);
    return jsonOk(prepared);
  } catch (e) {
    return jsonError(e);
  }
}
