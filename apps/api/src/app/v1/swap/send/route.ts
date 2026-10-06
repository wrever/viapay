import { z } from "zod";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { sendSoroswapTx } from "@/lib/soroswap";

const schema = z.object({
  xdr: z.string().min(20),
});

/** Submit a signed swap XDR through Soroswap /send. */
export async function POST(req: Request) {
  try {
    await requireAuth(req);
    const body = schema.parse(await req.json());
    const sent = await sendSoroswapTx({ xdr: body.xdr });
    return jsonOk(sent);
  } catch (e) {
    return jsonError(e);
  }
}
