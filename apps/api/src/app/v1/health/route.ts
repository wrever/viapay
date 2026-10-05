import { resolveViaFeeBps } from "@viapay/shared";
import { jsonOk } from "@/lib/http";
import { getTreasuryAddress } from "@/lib/auth";
import { paymentRouterContractId, stellarNetwork } from "@/lib/chain";

export async function GET() {
  return jsonOk({
    ok: true,
    product: "ViaPay",
    env: process.env.NODE_ENV ?? "local",
    fee_bps: resolveViaFeeBps(process.env.FEE_BPS),
    treasury: getTreasuryAddress(),
    network: stellarNetwork(),
    mode: process.env.STELLAR_MODE === "simulated" ? "simulated" : "onchain",
    payment_router: paymentRouterContractId(),
  });
}
