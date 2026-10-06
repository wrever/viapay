"use client";

import { formatAssetAmount } from "@viapay/shared";
import { LOCALE_TAG } from "@viapay/prefs";
import { computePaymentStats, type DashboardPayment } from "@/lib/payment-types";
import { formatFiatAmount, sumCryptoToFiat } from "@/lib/fiat/format";
import { useCryptoRates, useFiatCurrency } from "@/lib/fiat/use-fiat";
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
  field: "net" | "pendingGross",
  localeTag: string,
): string {
  const rows = stats.byAsset.filter((a) => a[field] > 0n);
  if (rows.length === 0) return "—";
  return rows
    .map((r) => formatTotals(r[field], r.asset, localeTag))
    .join(" · ");
}

function fiatSumHint(
  stats: ReturnType<typeof computePaymentStats>,
  field: "net" | "pendingGross",
  fiat: ReturnType<typeof useFiatCurrency>["fiat"],
  rates: ReturnType<typeof useCryptoRates>["rates"],
  localeTag: string,
  approx: (formatted: string) => string,
): string | null {
  const rows = stats.byAsset
    .filter((a) => a[field] > 0n)
    .map((a) => ({
      amount: formatAssetAmount(a[field]),
      asset: a.asset,
    }));
  const total = sumCryptoToFiat(rows, fiat, rates);
  if (total == null) return null;
  return approx(formatFiatAmount(total, fiat, localeTag));
}

export function PaymentStatsStrip({
  payments,
  showSucceeded = true,
}: {
  payments: DashboardPayment[];
  showSucceeded?: boolean;
}) {
  const { t, locale } = useLocale();
  const localeTag = LOCALE_TAG[locale];
  const { fiat } = useFiatCurrency();
  const { rates } = useCryptoRates();
  const stats = computePaymentStats(payments);

  const receivedFiat = fiatSumHint(
    stats,
    "net",
    fiat,
    rates,
    localeTag,
    t.fiatApprox,
  );
  const pendingFiat = fiatSumHint(
    stats,
    "pendingGross",
    fiat,
    rates,
    localeTag,
    t.fiatApprox,
  );

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
      hint: receivedFiat
        ? `${t.statReceivedHint(stats.succeeded)} · ${receivedFiat}`
        : t.statReceivedHint(stats.succeeded),
    },
    {
      key: "pending",
      label: t.statPending,
      value:
        stats.pending > 0
          ? `${stats.pending} · ${localizedSum(stats, "pendingGross", localeTag)}`
          : String(stats.pending),
      hint: pendingFiat
        ? `${t.statPendingHint} · ${pendingFiat}`
        : t.statPendingHint,
    },
    ...(showSucceeded
      ? [
          {
            key: "succeeded",
            label: t.statSucceeded,
            value: String(stats.succeeded),
            hint: t.statSucceededHint,
          },
        ]
      : []),
  ];

  return (
    <section
      className={`stats-strip${showSucceeded ? " stats-strip--4" : ""}`}
      aria-label={t.statsAria}
    >
      {cards.map((card) => (
        <article key={card.key} className="stat-card">
          <p className="stat-card__label">{card.label}</p>
          <p className="stat-card__value perf">{card.value}</p>
          <p className="stat-card__hint">{card.hint}</p>
        </article>
      ))}
    </section>
  );
}
