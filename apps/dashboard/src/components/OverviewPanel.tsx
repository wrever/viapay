"use client";

import { useMemo, useState } from "react";
import { PeriodFilter } from "@/components/PeriodFilter";
import { PaymentStatsStrip } from "@/components/PaymentStatsStrip";
import {
  filterPaymentsByPeriod,
  type DashboardPayment,
  type StatsPeriod,
} from "@/lib/payment-types";
import { useLocale } from "@/lib/i18n";

export function OverviewPanel({
  payments,
  onGoCobros,
}: {
  payments: DashboardPayment[];
  onGoCobros: () => void;
}) {
  const { t } = useLocale();
  const [period, setPeriod] = useState<StatsPeriod>("month");

  const filtered = useMemo(
    () => filterPaymentsByPeriod(payments, period),
    [payments, period],
  );

  if (payments.length === 0) {
    return (
      <div className="section-empty" role="status">
        <p className="section-empty__title">{t.overviewEmptyTitle}</p>
        <p className="section-empty__body">{t.overviewEmptyBody}</p>
        <button type="button" className="section-empty__cta" onClick={onGoCobros}>
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
        <PaymentStatsStrip payments={filtered} showSucceeded />
      )}
    </div>
  );
}
