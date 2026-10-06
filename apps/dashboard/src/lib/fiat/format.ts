import type { FiatCode } from "@viapay/prefs";

export type CryptoAsset = "XLM" | "USDC";

export type RatesPayload = {
  base: "crypto";
  assets: CryptoAsset[];
  fiats: FiatCode[];
  rates: Record<CryptoAsset, Partial<Record<FiatCode, number>>>;
  updated_at: string | null;
  stale: boolean;
  source: "live" | "cache" | "none";
};

const ZERO_DECIMAL: FiatCode[] = ["CLP", "ARS", "COP"];

export function parseAmountInput(raw: string | number | null | undefined): number | null {
  if (raw == null) return null;
  const cleaned =
    typeof raw === "number" ? raw : Number(String(raw).trim().replace(",", "."));
  if (!Number.isFinite(cleaned) || cleaned < 0) return null;
  return cleaned;
}

export function convertCryptoToFiat(
  amount: string | number | null | undefined,
  asset: CryptoAsset,
  fiat: FiatCode,
  rates: RatesPayload | null | undefined,
): number | null {
  const n = parseAmountInput(amount);
  if (n == null || !rates) return null;
  const unit = rates.rates[asset]?.[fiat];
  if (typeof unit !== "number" || !Number.isFinite(unit) || unit <= 0) {
    return null;
  }
  return n * unit;
}

export function formatFiatAmount(
  value: number,
  fiat: FiatCode,
  localeTag = "es-CL",
): string {
  const fractionDigits = ZERO_DECIMAL.includes(fiat) ? 0 : 2;
  try {
    return new Intl.NumberFormat(localeTag, {
      style: "currency",
      currency: fiat,
      currencyDisplay: "narrowSymbol",
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    }).format(value);
  } catch {
    const rounded = value.toLocaleString(localeTag, {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });
    return `${rounded} ${fiat}`;
  }
}

/** Sum several crypto bags into one fiat total when rates exist. */
export function sumCryptoToFiat(
  rows: { amount: string | number; asset: string }[],
  fiat: FiatCode,
  rates: RatesPayload | null | undefined,
): number | null {
  if (!rates || rows.length === 0) return null;
  let total = 0;
  let any = false;
  for (const row of rows) {
    if (row.asset !== "XLM" && row.asset !== "USDC") continue;
    const part = convertCryptoToFiat(row.amount, row.asset, fiat, rates);
    if (part == null) return null;
    total += part;
    any = true;
  }
  return any ? total : null;
}
