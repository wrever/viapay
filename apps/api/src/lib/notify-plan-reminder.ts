/**
 * Best-effort installment reminders (debt pressure). Never blocks settlement.
 */
import {
  isPlanChild,
  readPlan,
  type PlanMeta,
} from "@viapay/shared";
import { getDb } from "./db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";
import { emailConfigured, sendInvoiceEmail } from "./email/resend";
import { sendMetaWhatsAppText } from "./whatsapp/meta";
import {
  buildPayUrl,
  normalizeRow,
  type PaymentIntentRow,
} from "./payments";
import { getAccountName, readInvoiceMeta } from "./notify-succeeded";

const REMINDER_COOLDOWN_MS = 20 * 60 * 60 * 1000;

function parseRow(raw: Record<string, unknown>): PaymentIntentRow {
  return normalizeRow(raw);
}

/** Exported for tests — decide if a child is due for a reminder. */
export function shouldRemindPlanChild(
  row: PaymentIntentRow,
  nowMs = Date.now(),
): { remind: boolean; due_at: string | null; reason?: string } {
  if (row.status !== "requires_payment") {
    return { remind: false, due_at: null, reason: "not_open" };
  }
  const plan = readPlan(row.metadata);
  if (!plan || !isPlanChild(plan) || plan.installment_index == null) {
    return { remind: false, due_at: null, reason: "not_child" };
  }
  const entry = plan.schedule.find((e) => e.child_id === row.id);
  const due_at = entry?.due_at ?? null;
  if (!due_at) return { remind: false, due_at: null, reason: "no_due" };
  const dueMs = Date.parse(due_at);
  if (!Number.isFinite(dueMs) || dueMs > nowMs) {
    return { remind: false, due_at, reason: "not_due" };
  }
  const last = plan.last_reminder_at
    ? Date.parse(plan.last_reminder_at)
    : NaN;
  if (Number.isFinite(last) && nowMs - last < REMINDER_COOLDOWN_MS) {
    return { remind: false, due_at, reason: "cooldown" };
  }
  return { remind: true, due_at };
}

async function listOpenPlanChildren(limit = 80): Promise<PaymentIntentRow[]> {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .eq("status", "requires_payment")
      .order("created_at", { ascending: false })
      .limit(limit * 3);
    throwSb(res.error, "plan reminder list failed");
    return (res.data ?? [])
      .map((r) => parseRow(r as Record<string, unknown>))
      .filter((r) => {
        const p = readPlan(r.metadata);
        return Boolean(p && isPlanChild(p));
      })
      .slice(0, limit);
  }
  const rows = getDb()
    .prepare(
      `select * from payment_intents
       where status = 'requires_payment'
       order by created_at desc limit ?`,
    )
    .all(limit * 3) as Record<string, unknown>[];
  return rows
    .map(parseRow)
    .filter((r) => {
      const p = readPlan(r.metadata);
      return Boolean(p && isPlanChild(p));
    })
    .slice(0, limit);
}

async function markReminded(row: PaymentIntentRow, at: string): Promise<void> {
  const plan = readPlan(row.metadata);
  if (!plan) return;
  const next: PlanMeta = { ...plan, last_reminder_at: at };
  const meta = { ...(row.metadata ?? {}), plan: next };
  const metaJson = JSON.stringify(meta);
  if (usesSupabase()) {
    const upd = await getSupabaseAdmin()
      .from("payment_intents")
      .update({ metadata: metaJson, updated_at: at })
      .eq("id", row.id);
    throwSb(upd.error, "plan reminder stamp failed");
    return;
  }
  getDb()
    .prepare(
      `update payment_intents set metadata = ?, updated_at = ? where id = ?`,
    )
    .run(metaJson, at, row.id);
}

export type ReminderRunResult = {
  scanned: number;
  reminded: number;
  skipped: number;
  dry_run: boolean;
  details: Array<{ id: string; channels: string[]; due_at: string | null }>;
};

export async function runPlanReminders(opts?: {
  dryRun?: boolean;
  nowMs?: number;
}): Promise<ReminderRunResult> {
  const nowMs = opts?.nowMs ?? Date.now();
  const dry =
    opts?.dryRun === true ||
    (!emailConfigured() && process.env.META_WA_APP_LIVE !== "1");
  const rows = await listOpenPlanChildren();
  const details: ReminderRunResult["details"] = [];
  let reminded = 0;
  let skipped = 0;

  for (const row of rows) {
    const check = shouldRemindPlanChild(row, nowMs);
    if (!check.remind) {
      skipped += 1;
      continue;
    }
    const invoice = readInvoiceMeta(row.metadata);
    const payUrl = buildPayUrl(row.id, row.client_secret);
    const idx = readPlan(row.metadata)?.installment_index ?? "?";
    const text =
      `ViaPay · cuota ${idx} ${check.due_at && Date.parse(check.due_at) < nowMs - 86400000 ? "vencida" : "vence hoy"}: ` +
      `${row.amount} ${row.asset_code}. Pagá acá: ${payUrl}`;
    const channels: string[] = [];

    if (!dry) {
      if (invoice?.phone_e164) {
        try {
          await sendMetaWhatsAppText({
            toPhoneE164: invoice.phone_e164,
            body: text,
          });
          channels.push("payer_whatsapp");
        } catch (e) {
          console.warn("[plan-reminder] wa", row.id, e);
        }
      }
      if (invoice?.email && emailConfigured()) {
        try {
          const merchantName = await getAccountName(row.account_id);
          await sendInvoiceEmail({
            to: invoice.email,
            merchantName,
            amount: row.amount,
            asset: row.asset_code,
            checkoutUrl: payUrl,
            recipientName: invoice.recipient_name,
          });
          channels.push("payer_email");
        } catch (e) {
          console.warn("[plan-reminder] email", row.id, e);
        }
      }
      if (channels.length === 0) {
        console.info("[plan-reminder] no channel", row.id, text);
        channels.push("log");
      }
      await markReminded(row, new Date(nowMs).toISOString());
    } else {
      console.info("[plan-reminder] dry-run", row.id, text);
      channels.push("dry_run");
    }

    reminded += 1;
    details.push({ id: row.id, channels, due_at: check.due_at });
  }

  return {
    scanned: rows.length,
    reminded,
    skipped,
    dry_run: dry,
    details,
  };
}
