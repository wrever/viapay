import { z } from "zod";
import { prefersBrowserNavigation } from "@/lib/accept";
import { reconcileCheckoutPayment, submitCheckoutXdr } from "@/lib/chain";
import { ensureDb, jsonError } from "@/lib/http";
import {
  buildPayUrl,
  getPaymentIntentPublic,
  serializePaymentIntent,
  type PaymentIntentRow,
} from "@/lib/payments";
import {
  breakdownFor,
  buildChallenge,
  parsePaymentHeader,
  paymentResponseHeader,
} from "@/lib/x402";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Expose-Headers": "X-PAYMENT-RESPONSE",
} as const;

const bodySchema = z
  .object({
    client_secret: z.string().min(10).optional(),
    signed_xdr: z.string().min(20).optional(),
    reconcile: z.boolean().optional(),
  })
  .default({});

function clientSecretFrom(req: Request, bodySecret?: string): string {
  const fromQuery = new URL(req.url).searchParams.get("client_secret");
  const secret = bodySecret ?? fromQuery ?? req.headers.get("x-client-secret");
  if (!secret) {
    throw Object.assign(
      new Error("Falta client_secret. Va en la query, en el body o en X-Client-Secret."),
      { status: 400 },
    );
  }
  return secret;
}

async function loadIntent(id: string, clientSecret: string): Promise<PaymentIntentRow> {
  const row = await getPaymentIntentPublic(id, clientSecret);
  if (!row) throw Object.assign(new Error("Not found"), { status: 404 });
  return row;
}

function paidResponse(row: PaymentIntentRow) {
  return Response.json(
    {
      ...serializePaymentIntent(row),
      x402: { settled: true, breakdown: breakdownFor(row) },
    },
    {
      status: 200,
      headers: { ...CORS, "X-PAYMENT-RESPONSE": paymentResponseHeader(row) },
    },
  );
}

function challengeResponse(row: PaymentIntentRow) {
  return Response.json(buildChallenge(row), {
    status: 402,
    headers: {
      ...CORS,
      // Tells a generic HTTP client where the machine-readable terms live.
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Unified entry for the shared checkout link:
 * - Browser navigation → 302 to hosted `/pay` (human Freighter/QR).
 * - Agent / API client → 402 challenge (or 200 if already paid).
 */
export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    ensureDb();
    const { id } = await ctx.params;
    const secret = clientSecretFrom(req);

    if (prefersBrowserNavigation(req)) {
      return Response.redirect(buildPayUrl(id, secret), 302);
    }

    const loaded = await loadIntent(id, secret);
    let row = loaded;
    try {
      row = await reconcileCheckoutPayment(loaded);
    } catch {
      row = loaded;
    }
    return row.status === "succeeded" ? paidResponse(row) : challengeResponse(row);
  } catch (e) {
    return jsonError(e);
  }
}

/**
 * Settles the challenge. Either hand over a signed envelope (in the `X-PAYMENT`
 * header or as `signed_xdr`), or ask ViaPay to look for an already-sent payment
 * on Horizon. Anything short of a settled payment answers 402 again.
 */
export async function POST(req: Request, ctx: { params: Promise<{ id: string }> }) {
  try {
    ensureDb();
    const { id } = await ctx.params;
    const raw = await req.text();
    const body = bodySchema.parse(raw ? JSON.parse(raw) : {});
    const header = parsePaymentHeader(req.headers.get("x-payment"));
    const clientSecret = clientSecretFrom(req, body.client_secret);
    const row = await loadIntent(id, clientSecret);
    if (row.status === "succeeded") return paidResponse(row);

    const signedXdr = header?.signedXdr ?? body.signed_xdr;
    if (signedXdr) {
      const settled = await submitCheckoutXdr(id, clientSecret, signedXdr);
      return paidResponse(settled);
    }

    if (body.reconcile || header?.reconcile) {
      const found = await reconcileCheckoutPayment(row);
      if (found.status === "succeeded") return paidResponse(found);
    }

    return challengeResponse(row);
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      ...CORS,
      "Access-Control-Allow-Headers": "Content-Type, X-PAYMENT, X-Client-Secret",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
    },
  });
}
