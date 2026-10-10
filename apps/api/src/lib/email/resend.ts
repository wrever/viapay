/**
 * Invoice email via Resend (https://resend.com).
 * Without RESEND_API_KEY the helpers report not configured — callers fall back to mailto.
 */

export function emailConfigured(): boolean {
  return Boolean(process.env.RESEND_API_KEY?.trim());
}

export function emailFromAddress(): string {
  return (
    process.env.RESEND_FROM_EMAIL?.trim() ||
    "ViaPay <onboarding@resend.dev>"
  );
}

export function emailDiagnostics(): {
  provider: "resend";
  configured: boolean;
  from: string | null;
  note: string;
} {
  const configured = emailConfigured();
  return {
    provider: "resend",
    configured,
    from: configured ? emailFromAddress() : null,
    note: configured
      ? "Invoice + payment-receipt emails via Resend (merchant + payer)."
      : "Set RESEND_API_KEY (+ optional RESEND_FROM_EMAIL) on viapay-api to enable.",
  };
}

export type SendInvoiceEmailInput = {
  to: string;
  merchantName: string;
  amount: string;
  asset: string;
  checkoutUrl: string;
  recipientName?: string | null;
};

function invoiceText(input: SendInvoiceEmailInput): string {
  const who = input.recipientName?.trim() || "hola";
  return `${who}, ${input.merchantName} te cobra ${input.amount} ${input.asset} por ViaPay.

Pagá acá (Stellar / Freighter):
${input.checkoutUrl}

No necesitás cuenta ViaPay. Solo abrí el link y firmá el pago.
`;
}

function invoiceHtml(input: SendInvoiceEmailInput): string {
  const who = escapeHtml(input.recipientName?.trim() || "hola");
  const merchant = escapeHtml(input.merchantName);
  const amount = escapeHtml(input.amount);
  const asset = escapeHtml(input.asset);
  const url = escapeHtml(input.checkoutUrl);
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0b1020">
  <p>${who}, <strong>${merchant}</strong> te cobra <strong>${amount} ${asset}</strong> por ViaPay.</p>
  <p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#2b59ff;color:#fff;text-decoration:none;border-radius:8px">Pagar ahora</a></p>
  <p style="color:#4b5468;font-size:14px">O abrí este link:<br/><a href="${url}">${url}</a></p>
  <p style="color:#4b5468;font-size:13px">No necesitás cuenta ViaPay. Pagás con Freighter / wallet Stellar.</p>
</body></html>`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SendEmailResult =
  | { ok: true; id: string }
  | { ok: false; error: string; status?: number };

/** Send a payment-link invoice. Requires RESEND_API_KEY. */
export async function sendInvoiceEmail(
  input: SendInvoiceEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no configurada", status: 503 };
  }
  const to = input.to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "Email destino inválido", status: 400 };
  }

  const subject = `Cobro ViaPay ${input.amount} ${input.asset}`;
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFromAddress(),
      to: [to],
      subject,
      text: invoiceText(input),
      html: invoiceHtml(input),
    }),
    signal: AbortSignal.timeout(15000),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      error: body.message ?? body.name ?? `Resend error (${res.status})`,
      status: res.status,
    };
  }
  return { ok: true, id: body.id ?? "ok" };
}

export type SendReceiptEmailInput = {
  to: string;
  role: "merchant" | "payer";
  merchantName: string;
  amount: string;
  asset: string;
  paymentIntentId: string;
  explorerUrl: string;
  recipientName?: string | null;
};

function receiptText(input: SendReceiptEmailInput): string {
  if (input.role === "merchant") {
    const who = input.recipientName?.trim();
    return `Cobro pagado en ViaPay

Monto: ${input.amount} ${input.asset}
Id: ${input.paymentIntentId}
${who ? `Pagador: ${who}\n` : ""}Comprobante: ${input.explorerUrl}

— ${input.merchantName}
`;
  }
  const who = input.recipientName?.trim() || "Hola";
  return `${who}, tu pago a ${input.merchantName} quedó confirmado.

Monto: ${input.amount} ${input.asset}
Comprobante: ${input.explorerUrl}

ViaPay
`;
}

function receiptHtml(input: SendReceiptEmailInput): string {
  const amount = escapeHtml(input.amount);
  const asset = escapeHtml(input.asset);
  const url = escapeHtml(input.explorerUrl);
  const merchant = escapeHtml(input.merchantName);
  const id = escapeHtml(input.paymentIntentId);
  if (input.role === "merchant") {
    const who = input.recipientName
      ? `<p>Pagador: <strong>${escapeHtml(input.recipientName)}</strong></p>`
      : "";
    return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0b1020">
  <p><strong>Cobro pagado</strong> en ViaPay</p>
  <p>${amount} ${asset}</p>
  <p>Id: <code>${id}</code></p>
  ${who}
  <p><a href="${url}">Ver en stellar.expert</a></p>
  <p style="color:#4b5468;font-size:13px">— ${merchant}</p>
</body></html>`;
  }
  const who = escapeHtml(input.recipientName?.trim() || "Hola");
  return `<!doctype html>
<html><body style="font-family:system-ui,sans-serif;line-height:1.5;color:#0b1020">
  <p>${who}, tu pago a <strong>${merchant}</strong> quedó confirmado.</p>
  <p><strong>${amount} ${asset}</strong></p>
  <p><a href="${url}" style="display:inline-block;padding:12px 18px;background:#2b59ff;color:#fff;text-decoration:none;border-radius:8px">Ver comprobante</a></p>
  <p style="color:#4b5468;font-size:13px">ViaPay</p>
</body></html>`;
}

/** Receipt after payment_intent.succeeded. Requires RESEND_API_KEY. */
export async function sendPaymentReceiptEmail(
  input: SendReceiptEmailInput,
): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY?.trim();
  if (!apiKey) {
    return { ok: false, error: "RESEND_API_KEY no configurada", status: 503 };
  }
  const to = input.to.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
    return { ok: false, error: "Email destino inválido", status: 400 };
  }

  const subject =
    input.role === "merchant"
      ? `Pagado · ${input.amount} ${input.asset} · ViaPay`
      : `Comprobante · ${input.amount} ${input.asset} · ViaPay`;

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: emailFromAddress(),
      to: [to],
      subject,
      text: receiptText(input),
      html: receiptHtml(input),
    }),
    signal: AbortSignal.timeout(15000),
  });

  const body = (await res.json().catch(() => ({}))) as {
    id?: string;
    message?: string;
    name?: string;
  };

  if (!res.ok) {
    return {
      ok: false,
      error: body.message ?? body.name ?? `Resend error (${res.status})`,
      status: res.status,
    };
  }
  return { ok: true, id: body.id ?? "ok" };
}
