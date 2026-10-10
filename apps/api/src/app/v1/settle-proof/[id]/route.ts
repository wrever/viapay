import { formatAssetAmount, readAbonos, remainingAmount } from "@viapay/shared";
import { ensureDb, jsonError, jsonOk } from "@/lib/http";
import { getPaymentIntentById } from "@/lib/payments";
import { buildSettleProofResponse } from "@/lib/settle-proof";

/**
 * Public settle-proof package. Prefer chain + /v1/parity for truth;
 * HMAC is share integrity only (proof-or-nothing: no screenshots).
 */
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
    if (row.status === "partially_paid") {
      const abonos = readAbonos(row.metadata);
      return jsonOk({
        status: "partially_paid",
        payment_intent: row.id,
        proof_or_nothing: true,
        amount: row.amount,
        amount_paid: formatAssetAmount(BigInt(abonos?.paid_atomic ?? "0")),
        amount_remaining: remainingAmount(row.amount, abonos),
        paid_atomic: abonos?.paid_atomic ?? "0",
        pays: abonos?.pays ?? [],
        stellar_tx_hash: row.stellar_tx_hash,
        note: "Abonos in progress — not fully paid. Full settle-proof HMAC only when succeeded.",
        parity_url: `https://viapay-api.vercel.app/v1/parity/${row.id}`,
      });
    }
    if (row.status !== "succeeded") {
      return Response.json(
        {
          status: "unpaid",
          payment_intent: row.id,
          intent_status: row.status,
          proof_or_nothing: true,
          error:
            "settle-proof only for succeeded (on-chain Paid). Screenshots / pending are not proof.",
          parity_url: `https://viapay-api.vercel.app/v1/parity/${row.id}`,
        },
        {
          status: 409,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
    const proof = await buildSettleProofResponse(row);
    return jsonOk(proof);
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
