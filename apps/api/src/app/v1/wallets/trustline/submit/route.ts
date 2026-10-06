import { z } from "zod";
import { submitSignedXdr } from "@viapay/stellar";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { stellarNetwork } from "@/lib/chain";

const schema = z.object({
  signed_xdr: z.string().min(1),
});

/** Submit a Freighter-signed changeTrust for the authenticated merchant. */
export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    if (!auth.merchantWallet) {
      throw Object.assign(
        new Error("Guardá una billetera de destino antes de abrir la trustline."),
        { status: 400 },
      );
    }
    const body = schema.parse(await req.json());
    const network = stellarNetwork();
    const result = await submitSignedXdr(network, body.signed_xdr);
    if (result.source !== auth.merchantWallet) {
      throw Object.assign(
        new Error(
          "La firma no corresponde a tu billetera de destino guardada. Conectá esa misma cuenta en Freighter.",
        ),
        { status: 400 },
      );
    }
    return jsonOk({
      hash: result.hash,
      ledger: result.ledger,
      source: result.source,
      network,
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
