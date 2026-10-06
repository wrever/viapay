import { z } from "zod";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { buildSoroswapTx, type SoroswapQuote } from "@/lib/soroswap";

const schema = z.object({
  quote: z.record(z.any()),
  from: z.string().regex(/^G[A-Z2-7]{55}$/),
  to: z
    .string()
    .regex(/^G[A-Z2-7]{55}$/)
    .optional(),
});

/** Build unsigned XDR from a prior Soroswap quote. */
export async function POST(req: Request) {
  try {
    await requireAuth(req);
    const body = schema.parse(await req.json());
    const built = await buildSoroswapTx({
      quote: body.quote as SoroswapQuote,
      from: body.from,
      to: body.to,
    });
    return jsonOk(built);
  } catch (e) {
    return jsonError(e);
  }
}
