import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v25.0";

export function metaWhatsAppConfigured(): boolean {
  return Boolean(
    process.env.META_WA_ACCESS_TOKEN &&
      process.env.META_WA_PHONE_NUMBER_ID &&
      process.env.META_WA_VERIFY_TOKEN &&
      process.env.META_APP_SECRET,
  );
}

export function metaPhoneNumberId(): string | null {
  return process.env.META_WA_PHONE_NUMBER_ID?.trim() || null;
}

/** Meta sends digits without +; we store +E164. */
export function normalizeMetaWaPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8 || digits.length > 15) return null;
  const withPlus = `+${digits}`;
  if (!/^\+[1-9]\d{7,14}$/.test(withPlus)) return null;
  return withPlus;
}

export function waMeUrl(phoneE164: string, text: string): string {
  const digits = phoneE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

/** Webhook subscription verification (Meta GET challenge). */
export function verifyMetaWebhookChallenge(input: {
  mode: string | null;
  verifyToken: string | null;
  challenge: string | null;
}): string | null {
  const expected = process.env.META_WA_VERIFY_TOKEN;
  if (!expected) return null;
  if (input.mode !== "subscribe") return null;
  if (!input.verifyToken || input.verifyToken !== expected) return null;
  return input.challenge;
}

/**
 * Validate X-Hub-Signature-256 = sha256=<hmac_hex(app_secret, raw_body)>
 * @see https://developers.facebook.com/docs/graph-api/webhooks/getting-started#validation
 */
export function validateMetaSignature(
  rawBody: string,
  signatureHeader: string | null,
): boolean {
  const secret = process.env.META_APP_SECRET;
  if (!secret) return false;
  if (!signatureHeader?.startsWith("sha256=")) return false;
  const expected = signatureHeader.slice("sha256=".length);
  const digest = createHmac("sha256", secret)
    .update(rawBody, "utf8")
    .digest("hex");
  try {
    const a = Buffer.from(digest, "utf8");
    const b = Buffer.from(expected, "utf8");
    if (a.length !== b.length) return false;
    return timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export type MetaInboundText = {
  fromPhone: string;
  body: string;
  messageId: string;
};

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        messages?: Array<{
          from?: string;
          id?: string;
          type?: string;
          text?: { body?: string };
        }>;
      };
    }>;
  }>;
};

/** Extract text messages from a Cloud API webhook body. */
export function parseMetaInboundTexts(payload: unknown): MetaInboundText[] {
  const data = payload as MetaWebhookPayload;
  if (data.object !== "whatsapp_business_account") return [];
  const out: MetaInboundText[] = [];
  for (const entry of data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      for (const msg of change.value?.messages ?? []) {
        if (msg.type !== "text" || !msg.text?.body || !msg.from) continue;
        const fromPhone = normalizeMetaWaPhone(msg.from);
        if (!fromPhone) continue;
        out.push({
          fromPhone,
          body: msg.text.body,
          messageId: msg.id ?? "",
        });
      }
    }
  }
  return out;
}

/** Send a free-form text reply via Cloud API (within 24h customer-care window). */
export async function sendMetaWhatsAppText(input: {
  toPhoneE164: string;
  body: string;
}): Promise<void> {
  const token = process.env.META_WA_ACCESS_TOKEN;
  const phoneNumberId = process.env.META_WA_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    throw Object.assign(new Error("META WhatsApp no configurado"), {
      status: 503,
    });
  }
  const to = input.toPhoneE164.replace(/\D/g, "");
  // WhatsApp max ~4096; keep replies usable
  const text =
    input.body.length > 3900
      ? `${input.body.slice(0, 3900)}…`
      : input.body;

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      recipient_type: "individual",
      to,
      type: "text",
      text: { preview_url: true, body: text },
    }),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: { message?: string };
    };
    throw Object.assign(
      new Error(
        errBody.error?.message ?? `Meta WhatsApp send failed (${res.status})`,
      ),
      { status: 502 },
    );
  }
}
