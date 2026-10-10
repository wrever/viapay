/**
 * Best-effort channels when a payment_intent becomes succeeded:
 * - Merchant: WhatsApp (if WA linked) + email (accounts.email via Resend)
 * - Payer: WhatsApp / email from metadata.invoice
 *
 * Never throws to the settlement path. Idempotent at markCheckoutSucceeded
 * (only called when status flips to succeeded).
 */
import type { PaymentIntentRow } from "./payments";
import { getDb } from "./db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";
import { emailConfigured, sendPaymentReceiptEmail } from "./email/resend";
import { sendMetaWhatsAppText } from "./whatsapp/meta";
import { getLinkForAccount } from "./whatsapp/store";

export type InvoiceMeta = {
  contact_id?: string;
  recipient_name?: string | null;
  channel?: string;
  source?: string;
  phone_e164?: string | null;
  email?: string | null;
};

export function readInvoiceMeta(
  metadata: Record<string, unknown> | null | undefined,
): InvoiceMeta | null {
  if (!metadata || typeof metadata !== "object") return null;
  const inv = metadata.invoice;
  if (!inv || typeof inv !== "object") return null;
  const o = inv as Record<string, unknown>;
  return {
    contact_id: typeof o.contact_id === "string" ? o.contact_id : undefined,
    recipient_name:
      typeof o.recipient_name === "string" ? o.recipient_name : null,
    channel: typeof o.channel === "string" ? o.channel : undefined,
    source: typeof o.source === "string" ? o.source : undefined,
    phone_e164: typeof o.phone_e164 === "string" ? o.phone_e164 : null,
    email: typeof o.email === "string" ? o.email : null,
  };
}

export type NotifyPlan = {
  merchantWa: string | null;
  merchantEmail: string | null;
  payerWa: string | null;
  payerEmail: string | null;
  payerName: string | null;
};

export function planNotifyChannels(input: {
  merchantWa: string | null;
  merchantEmail: string | null;
  invoice: InvoiceMeta | null;
}): NotifyPlan {
  return {
    merchantWa: input.merchantWa,
    merchantEmail: input.merchantEmail,
    payerWa: input.invoice?.phone_e164?.trim() || null,
    payerEmail: input.invoice?.email?.trim().toLowerCase() || null,
    payerName: input.invoice?.recipient_name?.trim() || null,
  };
}

export async function getAccountEmail(
  accountId: string,
): Promise<string | null> {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("accounts")
      .select("email")
      .eq("id", accountId)
      .maybeSingle();
    throwSb(res.error, "account email lookup failed");
    const e = res.data?.email;
    return typeof e === "string" && e.includes("@") ? e.trim().toLowerCase() : null;
  }
  const row = getDb()
    .prepare(`select email from accounts where id = ?`)
    .get(accountId) as { email?: string } | undefined;
  const e = row?.email;
  return typeof e === "string" && e.includes("@") ? e.trim().toLowerCase() : null;
}

export async function getAccountName(accountId: string): Promise<string> {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("accounts")
      .select("name")
      .eq("id", accountId)
      .maybeSingle();
    throwSb(res.error, "account name lookup failed");
    return (res.data?.name as string) || "ViaPay";
  }
  const row = getDb()
    .prepare(`select name from accounts where id = ?`)
    .get(accountId) as { name?: string } | undefined;
  return row?.name || "ViaPay";
}

function explorerTx(network: string, hash: string): string {
  const net =
    network === "mainnet" || network === "public" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/tx/${hash}`;
}

function receiptUrl(row: PaymentIntentRow): string {
  const site = (
    process.env.VIAPAY_CHECKOUT_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_CHECKOUT_URL ??
    "https://viapay.vercel.app"
  ).replace(/\/$/, "");
  return `${site}/r/${row.id}`;
}

function splitGlassLine(row: PaymentIntentRow): string {
  const parts = [
    `neto ${row.net_amount}`,
    `fee ${row.fee_amount}`,
  ];
  if (row.reseller_fee_bps > 0) {
    parts.push(`reseller ${row.reseller_amount}`);
  }
  return parts.join(" · ");
}

function merchantBody(row: PaymentIntentRow, merchantName: string): string {
  const tx = row.stellar_tx_hash
    ? explorerTx(row.network, row.stellar_tx_hash)
    : "";
  const code =
    row.metadata && typeof row.metadata.cobro_code === "string"
      ? row.metadata.cobro_code
      : null;
  return `ViaPay · PAGADO (on-chain)
${row.amount} ${row.asset_code}${code ? ` · ${code}` : ""}
split-glass: ${splitGlassLine(row)}
Id: ${row.id}
Recibo: ${receiptUrl(row)}
${tx ? `Tx: ${tx}` : ""}
proof-or-nothing: no hace falta captura
— ${merchantName}`;
}

function payerBody(
  row: PaymentIntentRow,
  merchantName: string,
  payerName: string | null,
): string {
  const who = payerName || "Hola";
  return `${who}, tu pago a ${merchantName} quedó confirmado on-chain.
${row.amount} ${row.asset_code}
Recibo verificable: ${receiptUrl(row)}
ViaPay · proof-or-nothing`;
}

export type NotifyResult = {
  attempted: string[];
  skipped: string[];
  errors: string[];
};

/** Fire-and-forget safe: never throws. */
export async function notifyPaymentSucceeded(
  row: PaymentIntentRow,
): Promise<NotifyResult> {
  const result: NotifyResult = { attempted: [], skipped: [], errors: [] };
  try {
    if (!row.stellar_tx_hash) {
      result.skipped.push("no_tx_hash");
      return result;
    }
    const invoice = readInvoiceMeta(row.metadata);
    let merchantWa: string | null = null;
    let merchantEmail: string | null = null;
    let merchantName = "ViaPay";
    try {
      const link = await getLinkForAccount(row.account_id);
      merchantWa = link?.phone_e164 ?? null;
    } catch (e) {
      result.errors.push(`wa_link:${e instanceof Error ? e.message : String(e)}`);
    }
    try {
      merchantEmail = await getAccountEmail(row.account_id);
      merchantName = await getAccountName(row.account_id);
    } catch (e) {
      result.errors.push(
        `account:${e instanceof Error ? e.message : String(e)}`,
      );
    }

    const plan = planNotifyChannels({ merchantWa, merchantEmail, invoice });
    const txUrl = explorerTx(row.network, row.stellar_tx_hash);

    if (plan.merchantWa) {
      result.attempted.push("merchant_wa");
      try {
        await sendMetaWhatsAppText({
          toPhoneE164: plan.merchantWa,
          body: merchantBody(row, merchantName),
        });
      } catch (e) {
        result.errors.push(
          `merchant_wa:${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } else {
      result.skipped.push("merchant_wa");
    }

    if (plan.merchantEmail && emailConfigured()) {
      result.attempted.push("merchant_email");
      const r = await sendPaymentReceiptEmail({
        to: plan.merchantEmail,
        role: "merchant",
        merchantName,
        amount: row.amount,
        asset: row.asset_code,
        paymentIntentId: row.id,
        explorerUrl: txUrl,
        recipientName: plan.payerName,
      });
      if (!r.ok) result.errors.push(`merchant_email:${r.error}`);
    } else {
      result.skipped.push("merchant_email");
    }

    if (plan.payerWa) {
      result.attempted.push("payer_wa");
      try {
        await sendMetaWhatsAppText({
          toPhoneE164: plan.payerWa,
          body: payerBody(row, merchantName, plan.payerName),
        });
      } catch (e) {
        result.errors.push(
          `payer_wa:${e instanceof Error ? e.message : String(e)}`,
        );
      }
    } else {
      result.skipped.push("payer_wa");
    }

    if (plan.payerEmail && emailConfigured()) {
      result.attempted.push("payer_email");
      const r = await sendPaymentReceiptEmail({
        to: plan.payerEmail,
        role: "payer",
        merchantName,
        amount: row.amount,
        asset: row.asset_code,
        paymentIntentId: row.id,
        explorerUrl: txUrl,
        recipientName: plan.payerName,
      });
      if (!r.ok) result.errors.push(`payer_email:${r.error}`);
    } else {
      result.skipped.push("payer_email");
    }
  } catch (e) {
    result.errors.push(e instanceof Error ? e.message : String(e));
  }
  if (result.errors.length) {
    console.warn("[notify-succeeded]", row.id, result);
  }
  return result;
}
