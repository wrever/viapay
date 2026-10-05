"use client";

import { formatAssetAmount } from "@viapay/shared";
import { LOCALE_TAG } from "@viapay/prefs";
import { computePaymentStats, type DashboardPayment } from "@/lib/payment-types";
import { useLocale } from "@/lib/i18n";

function formatTotals(
  units: bigint,
  asset: string,
  localeTag: string,
): string {
  const text = formatAssetAmount(units);
  const num = Number(text);
  const formatted = num.toLocaleString(localeTag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  });
  return `${formatted} ${asset}`;
}

function localizedSum(
  stats: ReturnType<typeof computePaymentStats>,
  field: "net" | "fees" | "pendingGross",
  localeTag: string,
): string {
  const rows = stats.byAsset.filter((a) => a[field] > 0n);
  if (rows.length === 0) return "—";
  return rows
    .map((r) => formatTotals(r[field], r.asset, localeTag))
    .join(" · ");
}

export function PaymentStatsStrip({ payments }: { payments: DashboardPayment[] }) {
  const { t, locale } = useLocale();
  const localeTag = LOCALE_TAG[locale];
  const stats = computePaymentStats(payments);

  const cards = [
    {
      key: "total",
      label: t.statTotalCharges,
      value: String(stats.total),
      hint: t.statTotalHint,
    },
    {
      key: "received",
      label: t.statReceived,
      value: localizedSum(stats, "net", localeTag),
      hint: t.statReceivedHint(stats.succeeded),
    },
    {
      key: "pending",
      label: t.statPending,
      value:
        stats.pending > 0
          ? `${stats.pending} · ${localizedSum(stats, "pendingGross", localeTag)}`
          : String(stats.pending),
      hint: t.statPendingHint,
    },
    {
      key: "fees",
      label: t.statViaPayFees,
      value: localizedSum(stats, "fees", localeTag),
      hint: t.statFeesHint,
      accent: true,
    },
  ];

  return (
    <section className="stats-strip" aria-label={t.statsAria}>
      {cards.map((card) => (
        <article
          key={card.key}
          className={`stat-card${card.accent ? " stat-card--accent" : ""}`}
        >
          <p className="stat-card__label">{card.label}</p>
          <p className="stat-card__value perf">{card.value}</p>
          <p className="stat-card__hint">{card.hint}</p>
        </article>
      ))}
    </section>
  );
}
