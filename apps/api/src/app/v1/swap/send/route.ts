import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { assertSwapRateLimit } from "@/lib/rate-limit";
import { sendSoroswapTx } from "@/lib/soroswap";

const schema = z.object({
  xdr: z.string().min(20).max(200_000),
});

/** Public: submit a signed swap XDR through Soroswap /send. */
export async function POST(req: Request) {
  try {
    assertSwapRateLimit(req);
    const body = schema.parse(await req.json());
    const sent = await sendSoroswapTx({ xdr: body.xdr });
    return jsonOk(sent);
  } catch (e) {
    return jsonError(e);
  }
}
