"use client";

import { useMemo, useState } from "react";
import { formatAssetAmount } from "@viapay/shared";
import { LOCALE_TAG } from "@viapay/prefs";
import { PeriodFilter } from "@/components/PeriodFilter";
import { FiatEquivalent } from "@/components/FiatEquivalent";
import {
  computePaymentStats,
  filterPaymentsByPeriod,
  type DashboardPayment,
  type StatsPeriod,
} from "@/lib/payment-types";
import { useLocale } from "@/lib/i18n";

function money(units: bigint, asset: string, localeTag: string): string {
  const n = Number(formatAssetAmount(units));
  return `${n.toLocaleString(localeTag, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 7,
  })} ${asset}`;
}

export function PaymentStatsDetail({
  payments,
}: {
  payments: DashboardPayment[];
}) {
  const { t, locale } = useLocale();
  const localeTag = LOCALE_TAG[locale];
  const [period, setPeriod] = useState<StatsPeriod>("month");

  const filtered = useMemo(
    () => filterPaymentsByPeriod(payments, period),
    [payments, period],
  );
  const stats = useMemo(() => computePaymentStats(filtered), [filtered]);

  if (payments.length === 0) {
    return (
      <div className="section-empty" role="status">
        <p className="section-empty__title">{t.statsEmptyTitle}</p>
        <p className="section-empty__body">{t.statsEmptyBody}</p>
      </div>
    );
  }

  return (
    <div className="workspace workspace--stats">
      <div className="section-head">
        <div>
          <h2 className="panel-title">{t.statsTitle}</h2>
          <p className="section-head__lede">{t.statsDesc}</p>
        </div>
        <PeriodFilter value={period} onChange={setPeriod} />
      </div>

      {filtered.length === 0 ? (
        <div className="section-empty section-empty--soft" role="status">
          <p className="section-empty__body">{t.statsPeriodEmpty}</p>
        </div>
      ) : (
        <>
          <ul className="stats-breakdown" aria-label={t.statsBreakdownAria}>
            <li>
              <span>{t.statTotalCharges}</span>
              <strong className="perf">{stats.total}</strong>
            </li>
            <li>
              <span>{t.statSucceeded}</span>
              <strong className="perf">{stats.succeeded}</strong>
            </li>
            <li>
              <span>{t.statPending}</span>
              <strong className="perf">{stats.pending}</strong>
            </li>
            <li>
              <span>{t.statCanceled}</span>
              <strong className="perf">{stats.canceledOrExpired}</strong>
            </li>
          </ul>

          {stats.byAsset.length > 0 && (
            <section className="panel panel--asset-stats">
              <div className="panel__head">
                <h3 className="panel-title panel-title--sm">{t.statsByAsset}</h3>
              </div>
              <div className="panel__body panel__body--flush">
                <table className="asset-stats-table">
                  <thead>
                    <tr>
                      <th scope="col">{t.asset}</th>
                      <th scope="col" className="history-table__num">
                        {t.statReceived}
                      </th>
                      <th scope="col" className="history-table__num">
                        {t.statPending}
                      </th>
                      <th scope="col" className="history-table__num">
                        {t.statsFees}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.byAsset.map((row) => (
                      <tr key={row.asset}>
                        <td className="perf">{row.asset}</td>
                        <td className="history-table__num perf">
                          {row.net > 0n ? (
                            <>
                              {money(row.net, row.asset, localeTag)}
                              <FiatEquivalent
                                amount={formatAssetAmount(row.net)}
                                asset={row.asset}
                                locale={locale}
                                approx={t.fiatApprox}
                                unavailable={t.fiatUnavailable}
                                className="fiat-hint fiat-hint--table"
                              />
                            </>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="history-table__num perf">
                          {row.pendingGross > 0n
                            ? money(row.pendingGross, row.asset, localeTag)
                            : "—"}
                        </td>
                        <td className="history-table__num perf">
                          {row.fees > 0n
                            ? money(row.fees, row.asset, localeTag)
                            : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
}
