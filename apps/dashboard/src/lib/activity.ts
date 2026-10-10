import type { DashboardPayment } from "@/lib/payment-types";
import { invoiceRecipient } from "@/lib/payment-types";

export type WebhookDeliveryRow = {
  id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  type: string;
  url: string;
};

export type ActivityKind =
  | "paid"
  | "partial"
  | "pending"
  | "canceled"
  | "webhook_ok"
  | "webhook_fail";

export type ActivityItem = {
  id: string;
  kind: ActivityKind;
  title: string;
  detail: string;
  at: string;
  paymentId?: string;
};

type Labels = {
  paid: (amount: string, asset: string) => string;
  partial: (amount: string, asset: string) => string;
  pending: (amount: string, asset: string) => string;
  canceled: (amount: string, asset: string) => string;
  webhookOk: (type: string) => string;
  webhookFail: (type: string) => string;
  webhookAttempts: (n: number) => string;
  noRecipient: string;
};

function sortDesc(a: ActivityItem, b: ActivityItem) {
  return Date.parse(b.at) - Date.parse(a.at);
}

/** Build merchant-facing activity from payments + webhook deliveries. */
export function buildActivityFeed(
  payments: DashboardPayment[],
  deliveries: WebhookDeliveryRow[],
  labels: Labels,
  limit = 30,
): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const p of payments) {
    const who = invoiceRecipient(p);
    const dest = who ?? labels.noRecipient;
    const base = {
      at: p.created_at,
      paymentId: p.id,
      detail: [dest, p.network, p.description].filter(Boolean).join(" · "),
    };
    if (p.status === "succeeded") {
      items.push({
        id: `pay-${p.id}`,
        kind: "paid",
        title: labels.paid(p.amount, p.asset),
        ...base,
        at: p.created_at,
        detail: [
          dest,
          p.stellar_tx_hash ? `tx ${p.stellar_tx_hash.slice(0, 8)}…` : null,
          p.network,
        ]
          .filter(Boolean)
          .join(" · "),
      });
    } else if (p.status === "partially_paid") {
      items.push({
        id: `pay-${p.id}`,
        kind: "partial",
        title: labels.partial(p.amount, p.asset),
        ...base,
      });
    } else if (p.status === "requires_payment") {
      items.push({
        id: `pay-${p.id}`,
        kind: "pending",
        title: labels.pending(p.amount, p.asset),
        ...base,
      });
    } else if (p.status === "canceled" || p.status === "expired") {
      items.push({
        id: `pay-${p.id}`,
        kind: "canceled",
        title: labels.canceled(p.amount, p.asset),
        ...base,
      });
    }
  }

  for (const d of deliveries) {
    const fail =
      d.status === "failed" ||
      d.status === "dead" ||
      Boolean(d.last_error && d.status !== "delivered");
    items.push({
      id: `wh-${d.id}`,
      kind: fail ? "webhook_fail" : "webhook_ok",
      title: fail
        ? labels.webhookFail(d.type || "webhook")
        : labels.webhookOk(d.type || "webhook"),
      detail: [
        d.status,
        labels.webhookAttempts(d.attempts),
        d.url ? d.url.replace(/^https?:\/\//, "").slice(0, 36) : null,
        d.last_error,
      ]
        .filter(Boolean)
        .join(" · "),
      at: d.created_at,
    });
  }

  return items.sort(sortDesc).slice(0, limit);
}

export function activityAttentionCount(payments: DashboardPayment[]): number {
  return payments.filter(
    (p) => p.status === "requires_payment" || p.status === "partially_paid",
  ).length;
}
