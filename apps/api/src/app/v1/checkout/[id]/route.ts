import {
  getPaymentIntentPublic,
  serializePaymentIntent,
} from "@/lib/payments";
import { ensureDb, jsonError, jsonOk } from "@/lib/http";
import { getTreasuryAddress } from "@/lib/auth";
import {
  buildCheckoutSep7,
  paymentRouterContractId,
  receiveStatusFor,
  reconcileCheckoutPayment,
  stellarNetwork,
  usdcIssuer,
} from "@/lib/chain";
import { breakdownFor, x402ResourceUrl } from "@/lib/x402";

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    ensureDb();
    const { id } = await ctx.params;
    const cs = new URL(req.url).searchParams.get("client_secret");
    if (!cs) {
      return jsonError(
        Object.assign(new Error("client_secret required"), { status: 400 }),
      );
    }
    const loaded = await getPaymentIntentPublic(id, cs);
    if (!loaded) {
      return jsonError(Object.assign(new Error("Not found"), { status: 404 }));
    }
    let row = loaded;
    try {
      row = await reconcileCheckoutPayment(loaded);
    } catch {
      row = loaded;
    }
    const issuer = row.asset_code === "USDC" ? usdcIssuer() : null;
    type Receivable = { exists: boolean; canReceive: boolean };
    let receive: {
      merchant: Receivable;
      treasury: Receivable;
      reseller: Receivable | null;
    } | null = null;
    try {
      const [merchant, treasury, reseller] = await Promise.all([
        receiveStatusFor(row.merchant_wallet, row.asset_code),
        receiveStatusFor(getTreasuryAddress(), row.asset_code),
        row.reseller_address
          ? receiveStatusFor(row.reseller_address, row.asset_code)
          : Promise.resolve(null),
      ]);
      receive = { merchant, treasury, reseller };
    } catch {
      receive = null;
    }
    let sep7Tx: string | null = null;
    let sep7Error: string | null = null;
    try {
      sep7Tx = buildCheckoutSep7(row);
    } catch (error) {
      sep7Error = error instanceof Error ? error.message : "No se pudo armar el QR";
    }

    const routerId = paymentRouterContractId();
    return jsonOk({
      ...serializePaymentIntent(row),
      treasury_wallet: getTreasuryAddress(),
      breakdown: breakdownFor(row),
      x402_url: x402ResourceUrl(row),
      sep7_tx: sep7Tx,
      settlement: routerId ? "router" : "classic",
      contract_id: routerId,
      stellar: {
        network: stellarNetwork(),
        asset_issuer: issuer,
        sep7_error: sep7Error,
        receive,
        payment_router: routerId,
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
