import { ensureDb, jsonError, jsonOk } from "@/lib/http";
import { getPaymentIntentById } from "@/lib/payments";
import { buildRailParity } from "@/lib/rail-parity";

/** Public rail-parity: intent ≡ x402 ≡ Paid (when succeeded). No API key. */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    ensureDb();
    const { id } = await ctx.params;
    const row = await getPaymentIntentById(id);
    if (!row) {
      return jsonError(Object.assign(new Error("Not found"), { status: 404 }));
    }
    const parity = await buildRailParity(row);
    return jsonOk(parity);
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
