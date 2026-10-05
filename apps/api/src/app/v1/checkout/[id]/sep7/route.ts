import { submitCheckoutXdr } from "@/lib/chain";
import { ensureDb, jsonError, jsonOk } from "@/lib/http";
import { serializePaymentIntent } from "@/lib/payments";

/** SEP-7 callback: wallet POSTs application/x-www-form-urlencoded `xdr`. */
export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    ensureDb();
    const { id } = await ctx.params;
    const url = new URL(req.url);
    const clientSecret = url.searchParams.get("client_secret") ?? "";
    const contentType = req.headers.get("content-type") ?? "";
    let signedXdr = "";
    if (contentType.includes("application/x-www-form-urlencoded")) {
      const form = await req.formData();
      signedXdr = String(form.get("xdr") ?? "");
    } else {
      const body = (await req.json()) as { xdr?: string; signed_xdr?: string };
      signedXdr = body.xdr ?? body.signed_xdr ?? "";
    }
    if (!clientSecret || signedXdr.length < 20) {
      return jsonError(
        Object.assign(new Error("callback SEP-7 inválido"), { status: 400 }),
      );
    }
    const updated = await submitCheckoutXdr(id, clientSecret, signedXdr);
    return jsonOk(serializePaymentIntent(updated));
  } catch (e) {
    return jsonError(e);
  }
}
