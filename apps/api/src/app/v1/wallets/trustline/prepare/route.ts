import { z } from "zod";
import {
  buildChangeTrustXdr,
  predefinedCreditAssets,
  type Network,
} from "@viapay/stellar";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { parseNetwork, stellarNetwork, usdcIssuer } from "@/lib/chain";

const schema = z.object({
  asset: z.enum(["USDC"]).default("USDC"),
  network: z.enum(["testnet", "mainnet", "local"]).optional(),
});

/** Build unsigned changeTrust XDR for the merchant wallet (Freighter / Wallets Kit). */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = schema.parse(await req.json().catch(() => ({})));
    const network: Network = body.network
      ? parseNetwork(body.network)
      : stellarNetwork();
    const source = auth.merchantWallet;
    if (!source) {
      throw Object.assign(
        new Error("Guardá una billetera de destino antes de abrir la trustline."),
        { status: 400 },
      );
    }
    const prepared = await buildChangeTrustXdr({
      network,
      source,
      asset: body.asset,
      assetIssuer: usdcIssuer(network),
    });
    return jsonOk({
      xdr: prepared.xdr,
      network_passphrase: prepared.networkPassphrase,
      alreadyTrusted: prepared.alreadyTrusted,
      asset: prepared.asset,
      source,
      network,
      assets: predefinedCreditAssets(network),
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
