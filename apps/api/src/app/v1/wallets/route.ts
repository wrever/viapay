import { z } from "zod";
import { STELLAR_PUBKEY_RE } from "@viapay/shared";
import { upsertMerchantWallet } from "@/lib/auth";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { stellarNetwork } from "@/lib/chain";

const schema = z.object({
  address: z.string().regex(STELLAR_PUBKEY_RE, "address inválida"),
});

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    return jsonOk({
      merchant_wallet: auth.merchantWallet,
      network: stellarNetwork(),
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const body = schema.parse(await req.json());
    const wallet = await upsertMerchantWallet(
      auth.accountId,
      body.address,
      stellarNetwork(),
    );
    return jsonOk(wallet, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
