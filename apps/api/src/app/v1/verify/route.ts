import { z } from "zod";
import { verifyRouterPayTx } from "@viapay/stellar";
import { jsonError, jsonOk } from "@/lib/http";
import {
  parseNetwork,
  paymentRouterContractId,
} from "@/lib/chain";

const querySchema = z.object({
  tx_hash: z
    .string()
    .min(64)
    .max(66)
    .transform((v) => v.replace(/^0x/i, "").toLowerCase()),
  network: z.enum(["testnet", "mainnet", "local"]).default("mainnet"),
});

/**
 * Public settlement verifier — no auth.
 * Anyone can prove a tx settled via ViaPay payment-router without trusting our DB.
 * Demo: /v1/verify?network=mainnet&tx_hash=b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e
 */
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const q = querySchema.parse({
      tx_hash: url.searchParams.get("tx_hash") ?? "",
      network: url.searchParams.get("network") ?? "mainnet",
    });
    const network = parseNetwork(q.network);
    const expected = paymentRouterContractId(network);
    const result = await verifyRouterPayTx({
      network,
      txHash: q.tx_hash,
      expectedContractId: expected,
    });
    return jsonOk({
      ...result,
      rail: "viapay",
      note: "Decoded from on-chain envelope; Paid event is emitted by the same pay() invoke.",
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
