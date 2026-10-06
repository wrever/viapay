import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { assertSwapRateLimit } from "@/lib/rate-limit";
import { getSoroswapQuote } from "@/lib/soroswap";

const schema = z.object({
  asset_in: z.enum(["XLM", "USDC"]),
  asset_out: z.enum(["XLM", "USDC"]),
  amount: z.string().min(1).max(32),
  slippage_bps: z.number().int().min(1).max(5000).optional(),
});

/** Public quote XLM↔USDC via Soroswap (SOROSWAP_API_KEY stays server-side). */
export async function POST(req: Request) {
  try {
    assertSwapRateLimit(req);
    const body = schema.parse(await req.json());
    if (body.asset_in === body.asset_out) {
      throw Object.assign(
        new Error("asset_in y asset_out deben ser distintos"),
        { status: 400 },
      );
    }
    const quoted = await getSoroswapQuote({
      assetIn: body.asset_in,
      assetOut: body.asset_out,
      amountHuman: body.amount,
      slippageBps: body.slippage_bps,
    });
    return jsonOk({
      asset_in: quoted.asset_in,
      asset_out: quoted.asset_out,
      amount_in: quoted.amount_in,
      amount_out: quoted.amount_out,
      amount_in_atomic: quoted.amount_in_atomic,
      amount_out_atomic: quoted.amount_out_atomic,
      price_impact_pct: quoted.price_impact_pct,
      platform: quoted.platform,
      network: quoted.network,
      quote: quoted.quote,
    });
  } catch (e) {
    return jsonError(e);
  }
}
