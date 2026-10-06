"use client";

import { FIAT_CODES, FIAT_NAME, type FiatCode } from "@viapay/prefs";
import { Label } from "@/components/ui/label";
import { useFiatCurrency } from "@/lib/fiat/use-fiat";
import { useLocale } from "@/lib/i18n";

export function FiatCurrencySelect({
  id = "fiat-currency",
  compact = false,
  label,
  hint,
}: {
  id?: string;
  compact?: boolean;
  label?: string;
  hint?: string;
}) {
  const { t, locale } = useLocale();
  const { fiat, setFiat } = useFiatCurrency();
  const nameLocale = locale === "en" || locale === "pt" ? locale : "es";
  const selectLabel = label ?? t.fiatSelectLabel;
  const selectHint = hint ?? t.fiatSelectHint;

  if (compact) {
    return (
      <select
        id={id}
        aria-label={selectLabel}
        className="fiat-select fiat-select--compact"
        value={fiat}
        onChange={(e) => setFiat(e.target.value as FiatCode)}
      >
        {FIAT_CODES.map((code) => (
          <option key={code} value={code}>
            {code}
          </option>
        ))}
      </select>
    );
  }

  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{selectLabel}</Label>
      <select
        id={id}
        className="fiat-select"
        value={fiat}
        onChange={(e) => setFiat(e.target.value as FiatCode)}
      >
        {FIAT_CODES.map((code) => (
          <option key={code} value={code}>
            {code} — {FIAT_NAME[code][nameLocale]}
          </option>
        ))}
      </select>
      {selectHint ? (
        <p className="text-xs text-[var(--text-2)]">{selectHint}</p>
      ) : null}
    </div>
  );
}

/** Compact selector without dashboard LocaleProvider (checkout). */
export function FiatCurrencySelectBare({
  id = "checkout-fiat",
  label,
  locale = "es",
}: {
  id?: string;
  label: string;
  locale?: "es" | "en" | "pt";
}) {
  const { fiat, setFiat } = useFiatCurrency();

  return (
    <select
      id={id}
      aria-label={label}
      className="fiat-select fiat-select--compact"
      value={fiat}
      onChange={(e) => setFiat(e.target.value as FiatCode)}
      title={FIAT_NAME[fiat][locale]}
    >
      {FIAT_CODES.map((code) => (
        <option key={code} value={code}>
          {code}
        </option>
      ))}
    </select>
  );
}
