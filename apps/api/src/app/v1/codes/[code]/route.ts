import { ensureDb, jsonError, jsonOk } from "@/lib/http";
import { resolveCobroCode } from "@/lib/cobro-codes";
import { serializePaymentIntent } from "@/lib/payments";
import { buildRailParity } from "@/lib/rail-parity";
import { getCheckoutBaseUrl } from "@/lib/payments";

/** Resolve VP-XXXX → checkout redirect info (public). */
export async function GET(
  _req: Request,
  ctx: { params: Promise<{ code: string }> },
) {
  try {
    ensureDb();
    const { code } = await ctx.params;
    const row = await resolveCobroCode(code);
    if (!row) {
      return jsonError(Object.assign(new Error("Código no encontrado"), { status: 404 }));
    }
    const site = getCheckoutBaseUrl();
    const serialized = serializePaymentIntent(row);
    const parity =
      row.status === "succeeded" ? await buildRailParity(row) : null;
    return jsonOk({
      code: code.toUpperCase(),
      payment_intent: row.id,
      status: row.status,
      amount: row.amount,
      asset: row.asset_code,
      proof_or_nothing: true,
      /** Short-link itself (this route's page). */
      short_url: `${site}/c/${code.toUpperCase()}`,
      /** Hosted human checkout — prefer this for /c redirects. */
      pay_url: serialized.pay_url,
      /** Unified gateway (browser→pay, agent→402). */
      checkout_url: serialized.checkout_url,
      receipt_url: row.status === "succeeded" ? `${site}/r/${row.id}` : null,
      parity_ok: parity?.ok ?? null,
      stellar_tx_hash: row.stellar_tx_hash,
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
