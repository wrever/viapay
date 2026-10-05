"use client";

import type { StatsPeriod } from "@/lib/payment-types";
import { useLocale } from "@/lib/i18n";

export function PeriodFilter({
  value,
  onChange,
}: {
  value: StatsPeriod;
  onChange: (next: StatsPeriod) => void;
}) {
  const { t } = useLocale();
  const options: { id: StatsPeriod; label: string }[] = [
    { id: "today", label: t.periodToday },
    { id: "month", label: t.periodMonth },
    { id: "all", label: t.periodAll },
  ];

  return (
    <div className="period-filter" role="group" aria-label={t.periodAria}>
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            className={`period-filter__btn${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={() => onChange(opt.id)}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
