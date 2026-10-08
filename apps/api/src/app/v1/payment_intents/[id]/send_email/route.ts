import { getPaymentIntentById, serializePaymentIntent } from "@/lib/payments";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import {
  emailConfigured,
  sendInvoiceEmail,
} from "@/lib/email/resend";
import { normalizeEmail } from "@/lib/contacts";

/**
 * POST /v1/payment_intents/:id/send_email
 * Body: { to?: string } — optional; defaults to invoice.email in metadata.
 */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    if (!emailConfigured()) {
      return jsonError(
        Object.assign(
          new Error(
            "Email no configurado (RESEND_API_KEY). Usá mailto mientras tanto.",
          ),
          { status: 503 },
        ),
      );
    }
    const { id } = await ctx.params;
    const row = await getPaymentIntentById(id);
    if (!row || row.account_id !== auth.accountId) {
      return jsonError(Object.assign(new Error("Not found"), { status: 404 }));
    }

    let bodyTo: string | undefined;
    try {
      const body = (await req.json()) as { to?: string };
      bodyTo = body.to;
    } catch {
      bodyTo = undefined;
    }

    const invoice = row.metadata?.invoice as
      | { email?: string | null; recipient_name?: string | null }
      | undefined;
    const to = normalizeEmail(bodyTo ?? invoice?.email ?? null);
    if (!to) {
      return jsonError(
        Object.assign(new Error("Pasá to o guardá email en el contacto"), {
          status: 400,
        }),
      );
    }

    const s = serializePaymentIntent(row);
    const result = await sendInvoiceEmail({
      to,
      merchantName: auth.accountName,
      amount: row.amount,
      asset: row.asset_code,
      checkoutUrl: s.checkout_url,
      recipientName: invoice?.recipient_name ?? null,
    });
    if (!result.ok) {
      return jsonError(
        Object.assign(new Error(result.error), {
          status: result.status ?? 502,
        }),
      );
    }
    return jsonOk({ ok: true, id: result.id, to });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
