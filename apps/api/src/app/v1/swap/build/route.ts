import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";
import { assertSwapRateLimit } from "@/lib/rate-limit";
import {
  buildSoroswapTx,
  resolveSwapNetwork,
  tokenFor,
  type SoroswapQuote,
  type SwapAsset,
  type SwapNetwork,
} from "@/lib/soroswap";

const schema = z.object({
  quote: z.record(z.any()),
  from: z.string().regex(/^G[A-Z2-7]{55}$/),
  to: z
    .string()
    .regex(/^G[A-Z2-7]{55}$/)
    .optional(),
  network: z.enum(["testnet", "mainnet"]).optional(),
});

function assertKnownSwapPair(
  quote: Record<string, unknown>,
  network: SwapNetwork,
): void {
  const allowed = new Set<string>([
    tokenFor("XLM" as SwapAsset, network).contract,
    tokenFor("USDC" as SwapAsset, network).contract,
  ]);
  const assetIn = typeof quote.assetIn === "string" ? quote.assetIn : "";
  const assetOut = typeof quote.assetOut === "string" ? quote.assetOut : "";
  if (!allowed.has(assetIn) || !allowed.has(assetOut) || assetIn === assetOut) {
    throw Object.assign(
      new Error("Solo se permiten swaps XLM ↔ USDC en esta red"),
      { status: 400 },
    );
  }
}

/** Public: build unsigned XDR from a prior Soroswap quote. */
export async function POST(req: Request) {
  try {
    assertSwapRateLimit(req);
    const body = schema.parse(await req.json());
    const network = body.network ?? resolveSwapNetwork();
    assertKnownSwapPair(body.quote, network);
    const built = await buildSoroswapTx({
      quote: body.quote as SoroswapQuote,
      from: body.from,
      to: body.to,
      network,
    });
    return jsonOk(built);
  } catch (e) {
    return jsonError(e);
  }
}
