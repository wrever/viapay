"use client";

import { LOCALE_TAG, type Locale } from "@viapay/prefs";
import { formatFiatAmount } from "@/lib/fiat/format";
import { useFiatEquivalent } from "@/lib/fiat/use-fiat";

export function FiatEquivalent({
  amount,
  asset,
  locale,
  approx,
  unavailable,
  className = "fiat-hint",
}: {
  amount: string | number | null | undefined;
  asset: string | null | undefined;
  locale: Locale;
  approx: (formatted: string) => string;
  unavailable: string;
  className?: string;
}) {
  const { value, fiat, ready, loading } = useFiatEquivalent(amount, asset);
  const localeTag = LOCALE_TAG[locale];

  if (!ready || value == null) {
    if (loading) {
      return (
        <p className={className} aria-hidden="true">
          {approx("—")}
        </p>
      );
    }
    return (
      <p className={className} role="status">
        {unavailable}
      </p>
    );
  }

  return (
    <p className={className} role="status">
      {approx(formatFiatAmount(value, fiat, localeTag))}
    </p>
  );
}
