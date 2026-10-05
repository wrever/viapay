"use client";

import { useLocale } from "@/lib/i18n";

export function PaymentStatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const tone: Record<string, string> = {
    requires_payment: "tone--warning",
    succeeded: "tone--success",
    canceled: "tone--neutral",
    expired: "tone--error",
  };
  const label: Record<string, string> = {
    requires_payment: t.statusPending,
    succeeded: t.statusPaid,
    canceled: t.statusCanceled,
    expired: t.statusExpired,
  };
  return (
    <span className={`badge ${tone[status] ?? "tone--neutral"}`}>
      {label[status] ?? status}
    </span>
  );
}
