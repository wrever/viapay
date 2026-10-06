import { z } from "zod";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { getSoroswapQuote } from "@/lib/soroswap";

const schema = z.object({
  asset_in: z.enum(["XLM", "USDC"]),
  asset_out: z.enum(["XLM", "USDC"]),
  amount: z.string().min(1).max(32),
  slippage_bps: z.number().int().min(1).max(5000).optional(),
});

/** Quote XLM↔USDC via Soroswap Aggregator (API key server-side). */
export async function POST(req: Request) {
  try {
    await requireAuth(req);
    const body = schema.parse(await req.json());
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
