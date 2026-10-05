"use client";

import { useMemo, useState } from "react";
import { formatAssetAmount, parseAssetAmount } from "@viapay/shared";
import { LOCALE_TAG } from "@viapay/prefs";
import { PeriodFilter } from "@/components/PeriodFilter";
import { PaymentStatsStrip } from "@/components/PaymentStatsStrip";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import {
  computePaymentStats,
  filterPaymentsByPeriod,
  type DashboardPayment,
  type StatsPeriod,
} from "@/lib/payment-types";
import { useLocale } from "@/lib/i18n";

function money(amount: string, asset: string, localeTag: string): string {
  try {
    const n = Number(formatAssetAmount(parseAssetAmount(amount)));
    return `${n.toLocaleString(localeTag, {
      minimumFractionDigits: 0,
      maximumFractionDigits: 7,
    })} ${asset}`;
  } catch {
    return `${amount} ${asset}`;
  }
}

export function OverviewPanel({
  payments,
  onGoCobros,
  onGoHistory,
  hasWallet,
  onNeedWallet,
}: {
  payments: DashboardPayment[];
  onGoCobros: () => void;
  onGoHistory: () => void;
  hasWallet: boolean;
  onNeedWallet: () => void;
}) {
  const { t, locale } = useLocale();
  const localeTag = LOCALE_TAG[locale];
  const [period, setPeriod] = useState<StatsPeriod>("month");

  const filtered = useMemo(
    () => filterPaymentsByPeriod(payments, period),
    [payments, period],
  );
  const stats = useMemo(() => computePaymentStats(filtered), [filtered]);
  const recentPaid = useMemo(
    () => filtered.filter((p) => p.status === "succeeded").slice(0, 5),
    [filtered],
  );

  if (payments.length === 0) {
    return (
      <div className="section-empty" role="status">
        <p className="section-empty__title">{t.overviewEmptyTitle}</p>
        <p className="section-empty__body">{t.overviewEmptyBody}</p>
        <button
          type="button"
          className="section-empty__cta"
          onClick={() => (hasWallet ? onGoCobros() : onNeedWallet())}
        >
          {t.overviewEmptyCta}
        </button>
      </div>
    );
  }

  return (
    <div className="workspace workspace--overview">
      <div className="section-head">
        <div>
          <h2 className="panel-title">{t.overviewTitle}</h2>
          <p className="section-head__lede">{t.overviewDesc}</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {filtered.length === 0 ? (
        <div className="section-empty section-empty--soft" role="status">
          <p className="section-empty__body">{t.overviewPeriodEmpty}</p>
        </div>
      ) : (
        <>
          <PaymentStatsStrip payments={filtered} showSucceeded />
          <p className="overview-conversion" role="status">
            {t.overviewConversion(stats.succeeded, stats.total)}
          </p>

          <div className="overview-recent">
            <div className="overview-recent__head">
              <h3 className="panel-title panel-title--sm">
                {t.overviewRecentTitle}
              </h3>
              <button
                type="button"
                className="overview-recent__link"
                onClick={onGoHistory}
              >
                {t.overviewGoHistory}
              </button>
            </div>
            {recentPaid.length === 0 ? (
              <p className="text-sm text-[var(--text-2)]">
                {t.overviewRecentEmpty}
              </p>
            ) : (
              <ul className="overview-recent__list">
                {recentPaid.map((p) => (
                  <li key={p.id} className="overview-recent__row">
                    <div>
                      <p className="overview-recent__memo">
                        {p.description?.trim() || t.historyNoMemo}
                      </p>
                      <p className="overview-recent__when perf">
                        {new Date(p.created_at).toLocaleString(localeTag, {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    <div className="overview-recent__right">
                      <span className="perf">
                        {money(p.net_amount, p.asset, localeTag)}
                      </span>
                      <PaymentStatusBadge status={p.status} />
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </>
      )}
    </div>
  );
}
