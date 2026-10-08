import { NextResponse } from "next/server";
import { handleWhatsAppInbound } from "@/lib/whatsapp/handlers";
import { claimInboundMessage } from "@/lib/whatsapp/store";
import {
  isConfiguredPhoneNumberId,
  markMetaWhatsAppRead,
  metaSkipSignature,
  metaWhatsAppConfigured,
  parseMetaInboundNonTexts,
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
  const skipSig = metaSkipSignature();
  if (!skipSig && !validateMetaSignature(rawBody, signature)) {
    console.error("[whatsapp] signature rejected", {
      hasHeader: Boolean(signature),
      skipSig,
    });
    return NextResponse.json({ error: "firma Meta inválida" }, { status: 403 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody) as unknown;
  } catch {
    return NextResponse.json({ error: "JSON inválido" }, { status: 400 });
  }

  const texts = parseMetaInboundTexts(payload).filter((m) =>
    isConfiguredPhoneNumberId(m.phoneNumberId),
  );
  const nonTexts = parseMetaInboundNonTexts(payload).filter((m) =>
    isConfiguredPhoneNumberId(m.phoneNumberId),
  );

  console.log("[whatsapp] inbound", {
    skipSig,
    textCount: texts.length,
    nonTextCount: nonTexts.length,
    messages: texts.map((m) => ({
      from: m.fromPhone,
      body: m.body.slice(0, 40),
      pnid: m.phoneNumberId,
      id: m.messageId.slice(0, 24),
    })),
  });

  // Always 200 quickly so Meta does not retry forever; send replies via Graph.
  for (const msg of texts) {
    const claimed = await claimInboundMessage({
      messageId: msg.messageId,
      phoneE164: msg.fromPhone,
      phoneNumberId: msg.phoneNumberId,
    });
    if (!claimed) {
      console.log("[whatsapp] duplicate skipped", msg.messageId.slice(0, 32));
      continue;
    }

    const replyFrom = msg.phoneNumberId;
    void markMetaWhatsAppRead({
      messageId: msg.messageId,
      phoneNumberId: replyFrom,
    });

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
      console.log("[whatsapp] reply sent", {
        to: msg.fromPhone,
        pnid: replyFrom,
      });
    } catch (e) {
      const err =
        e instanceof Error ? e.message : "Error interno ViaPay WhatsApp";
      console.error("[whatsapp] reply failed", {
        to: msg.fromPhone,
        pnid: replyFrom,
        err,
      });
      try {
        await sendMetaWhatsAppText({
          toPhoneE164: msg.fromPhone,
          body: "Hubo un problema procesando tu mensaje. Reintentá en un momento o usá el panel ViaPay.",
          phoneNumberId: replyFrom,
        });
      } catch (sendErr) {
        console.error(
          "[whatsapp] error-notify send failed",
          sendErr instanceof Error ? sendErr.message : sendErr,
        );
      }
    }
  }

  for (const msg of nonTexts) {
    const claimed = await claimInboundMessage({
      messageId: msg.messageId,
      phoneE164: msg.fromPhone,
      phoneNumberId: msg.phoneNumberId,
    });
    if (!claimed) continue;
    try {
      await sendMetaWhatsAppText({
        toPhoneE164: msg.fromPhone,
        body: "Por ahora el asistente solo entiende texto. Escribí 0 para el menú.",
        phoneNumberId: msg.phoneNumberId,
      });
    } catch (e) {
      console.error(
        "[whatsapp] non-text nudge failed",
        e instanceof Error ? e.message : e,
      );
    }
  }

  return NextResponse.json({ ok: true });
}
