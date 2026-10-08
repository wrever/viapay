import { createHmac, timingSafeEqual } from "node:crypto";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION ?? "v26.0";

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

export function metaSkipSignature(): boolean {
  return process.env.META_WA_SKIP_SIGNATURE === "1";
}

/** Set META_WA_APP_LIVE=1 in Vercel once Meta publishes the app. */
export function metaAppLive(): boolean {
  return process.env.META_WA_APP_LIVE === "1";
}

/** Public diagnostics for /v1/health (no secrets). */
export function metaWhatsAppDiagnostics(): {
  provider: "meta_cloud_api";
  configured: boolean;
  webhook: string;
  phone_number_id_suffix: string | null;
  graph_version: string;
  skip_signature: boolean;
  app_live: boolean;
  note: string;
} {
  const pnid = metaPhoneNumberId();
  const live = metaAppLive();
  const publicUrl = (
    process.env.VIAPAY_API_PUBLIC_URL?.replace(/\/$/, "") ??
    "https://viapay-api.vercel.app"
  );
  return {
    provider: "meta_cloud_api",
    configured: metaWhatsAppConfigured(),
    webhook: `${publicUrl}/v1/whatsapp/webhook`,
    phone_number_id_suffix: pnid ? pnid.slice(-6) : null,
    graph_version: GRAPH_VERSION,
    skip_signature: metaSkipSignature(),
    app_live: live,
    note: live
      ? "Meta app marked Live (META_WA_APP_LIVE=1). Panel share wa.me still available."
      : "Inbound production webhooks require Meta app Live/published. Set META_WA_APP_LIVE=1 after approval. Panel share wa.me works without Meta.",
  };
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
  /** Phone number ID that received the message — must be used to reply. */
  phoneNumberId: string | null;
};

export type MetaInboundNonText = {
  fromPhone: string;
  messageId: string;
  type: string;
  phoneNumberId: string | null;
};

type MetaWebhookPayload = {
  object?: string;
  entry?: Array<{
    changes?: Array<{
      value?: {
        metadata?: { phone_number_id?: string; display_phone_number?: string };
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

function expectedPhoneNumberId(): string | null {
  return metaPhoneNumberId();
}

/** True if this inbound belongs to our configured business phone (or any if unset). */
export function isConfiguredPhoneNumberId(phoneNumberId: string | null): boolean {
  const expected = expectedPhoneNumberId();
  if (!expected) return true;
  if (!phoneNumberId) return false;
  return phoneNumberId === expected;
}

/** Extract text messages from a Cloud API webhook body. */
export function parseMetaInboundTexts(payload: unknown): MetaInboundText[] {
  const data = payload as MetaWebhookPayload;
  if (data.object !== "whatsapp_business_account") return [];
  const out: MetaInboundText[] = [];
  for (const entry of data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId =
        change.value?.metadata?.phone_number_id?.trim() || null;
      for (const msg of change.value?.messages ?? []) {
        if (msg.type !== "text" || !msg.text?.body || !msg.from) continue;
        const fromPhone = normalizeMetaWaPhone(msg.from);
        if (!fromPhone) continue;
        out.push({
          fromPhone,
          body: msg.text.body,
          messageId: msg.id ?? "",
          phoneNumberId,
        });
      }
    }
  }
  return out;
}

/** Non-text inbound (image, audio, …) so we can nudge the user. */
export function parseMetaInboundNonTexts(payload: unknown): MetaInboundNonText[] {
  const data = payload as MetaWebhookPayload;
  if (data.object !== "whatsapp_business_account") return [];
  const out: MetaInboundNonText[] = [];
  for (const entry of data.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const phoneNumberId =
        change.value?.metadata?.phone_number_id?.trim() || null;
      for (const msg of change.value?.messages ?? []) {
        if (!msg.from || !msg.type || msg.type === "text") continue;
        const fromPhone = normalizeMetaWaPhone(msg.from);
        if (!fromPhone) continue;
        out.push({
          fromPhone,
          messageId: msg.id ?? "",
          type: msg.type,
          phoneNumberId,
        });
      }
    }
  }
  return out;
}

async function graphPost(
  phoneNumberId: string,
  body: Record<string, unknown>,
): Promise<void> {
  const token = process.env.META_WA_ACCESS_TOKEN;
  if (!token) {
    throw Object.assign(new Error("META WhatsApp no configurado"), {
      status: 503,
    });
  }
  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) {
    const errBody = (await res.json().catch(() => ({}))) as {
      error?: { message?: string; code?: number; error_subcode?: number };
    };
    const msg =
      errBody.error?.message ?? `Meta WhatsApp send failed (${res.status})`;
    throw Object.assign(new Error(msg), {
      status: 502,
      metaCode: errBody.error?.code,
      metaSubcode: errBody.error?.error_subcode,
    });
  }
}

/** Best-effort blue ticks; ignore failures. */
export async function markMetaWhatsAppRead(input: {
  messageId: string;
  phoneNumberId?: string | null;
}): Promise<void> {
  if (!input.messageId) return;
  const phoneNumberId =
    input.phoneNumberId?.trim() || process.env.META_WA_PHONE_NUMBER_ID;
  if (!phoneNumberId || !process.env.META_WA_ACCESS_TOKEN) return;
  try {
    await graphPost(phoneNumberId, {
      messaging_product: "whatsapp",
      status: "read",
      message_id: input.messageId,
    });
  } catch {
    /* non-fatal */
  }
}

/** Send a free-form text reply via Cloud API (within 24h customer-care window). */
export async function sendMetaWhatsAppText(input: {
  toPhoneE164: string;
  body: string;
  /** Prefer the inbound metadata phone_number_id (test vs prod). */
  phoneNumberId?: string | null;
}): Promise<void> {
  const phoneNumberId =
    input.phoneNumberId?.trim() || process.env.META_WA_PHONE_NUMBER_ID;
  if (!phoneNumberId) {
    throw Object.assign(new Error("META WhatsApp no configurado"), {
      status: 503,
    });
  }
  const to = input.toPhoneE164.replace(/\D/g, "");
  const text =
    input.body.length > 3900
      ? `${input.body.slice(0, 3900)}…`
      : input.body;

  await graphPost(phoneNumberId, {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to,
    type: "text",
    text: { preview_url: true, body: text },
  });
}
