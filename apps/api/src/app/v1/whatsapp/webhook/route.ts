import { NextResponse } from "next/server";
import { handleWhatsAppInbound } from "@/lib/whatsapp/handlers";
import {
  metaWhatsAppConfigured,
  parseMetaInboundTexts,
  sendMetaWhatsAppText,
  validateMetaSignature,
  verifyMetaWebhookChallenge,
} from "@/lib/whatsapp/meta";

/**
 * Meta Cloud API webhook.
 * GET = subscription verify; POST = inbound messages (reply via Graph API).
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const challenge = verifyMetaWebhookChallenge({
    mode: url.searchParams.get("hub.mode"),
    verifyToken: url.searchParams.get("hub.verify_token"),
    challenge: url.searchParams.get("hub.challenge"),
  });
  if (challenge != null) {
    return new NextResponse(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
  return NextResponse.json(
    {
      ok: true,
      product: "ViaPay WhatsApp Cloud API webhook",
      configured: metaWhatsAppConfigured(),
    },
    { status: metaWhatsAppConfigured() ? 200 : 503 },
  );
}

export async function POST(req: Request) {
  if (!metaWhatsAppConfigured()) {
    return NextResponse.json(
      { error: "WhatsApp no configurado (META_WA_* / META_APP_SECRET)" },
      { status: 503 },
    );
  }

  const rawBody = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const skipSig = process.env.META_WA_SKIP_SIGNATURE === "1";
  if (!skipSig && !validateMetaSignature(rawBody, signature)) {
    return NextResponse.json({ error: "firma Meta inválida" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const messages = parseMetaInboundTexts(payload);
  console.log(
    "[whatsapp] inbound",
    messages.map((m) => ({ from: m.fromPhone, body: m.body.slice(0, 40), pnid: m.phoneNumberId })),
  );
  // Always 200 quickly so Meta does not retry; send replies via Graph.
  for (const msg of messages) {
    const replyFrom = msg.phoneNumberId;
    try {
      const reply = await handleWhatsAppInbound({
        fromPhone: msg.fromPhone,
        body: msg.body,
      });
      await sendMetaWhatsAppText({
        toPhoneE164: msg.fromPhone,
        body: reply,
        phoneNumberId: replyFrom,
      });
    } catch (e) {
      const err =
        e instanceof Error ? e.message : "Error interno ViaPay WhatsApp";
      try {
        await sendMetaWhatsAppText({
          toPhoneE164: msg.fromPhone,
          body: err,
          phoneNumberId: replyFrom,
        });
      } catch {
        /* swallow secondary send errors */
      }
    }
  }

  return NextResponse.json({ ok: true });
}
