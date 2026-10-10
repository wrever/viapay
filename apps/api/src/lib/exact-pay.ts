/**
 * ViaPay exact-pay — own scheme (not Local402 exact-fx).
 *
 * Merchant quotes in local fiat (CLP, ARS, …). At intent creation we lock a
 * crypto amount (XLM|USDC) using GET /v1/rates sources. Settlement is that
 * exact crypto via payment-router — no Reflector oracle, no atomic FX swap
 * at pay time.
 */
import { formatAssetAmount, parseAssetAmount } from "@viapay/shared";
import {
  getCryptoFiatRates,
  type CryptoAsset,
  type FiatCode,
} from "./rates";

const FIATS: FiatCode[] = [
  "CLP",
  "ARS",
  "COP",
  "BOB",
  "MXN",
  "PEN",
  "USD",
];

export function isFiatCode(raw: string): raw is FiatCode {
  return (FIATS as string[]).includes(raw.toUpperCase());
}

export type ExactPayLock = {
  scheme: "exact_pay";
  fiat_amount: string;
  fiat_currency: FiatCode;
  asset: CryptoAsset;
  /** Locked on-chain settlement amount (7 decimals). */
  crypto_amount: string;
  /** 1 unit of asset ≈ this many fiat units at lock time. */
  rate_asset_in_fiat: number;
  locked_at: string;
  rates_updated_at: string | null;
  rates_source: "live" | "cache" | "none";
  rates_stale: boolean;
  note: string;
};

/** Pure: fiat units ÷ (fiat per 1 crypto) → 7-decimal crypto string. */
export function cryptoAmountFromFiat(fiatNum: number, rateAssetInFiat: number): string {
  if (!(fiatNum > 0) || !(rateAssetInFiat > 0)) {
    throw new Error("fiat/rate inválidos");
  }
  const cryptoFloat = fiatNum / rateAssetInFiat;
  const units = parseAssetAmount(cryptoFloat.toFixed(8), 7);
  if (units <= 0n) {
    throw new Error("crypto amount zero");
  }
  return formatAssetAmount(units);
}

/**
 * Convert fiat → crypto and return a lock record for metadata.exact_pay.
 */
export async function lockExactPayAmount(input: {
  fiatAmount: string;
  fiatCurrency: string;
  asset: CryptoAsset;
}): Promise<ExactPayLock> {
  const fiatCurrency = input.fiatCurrency.trim().toUpperCase();
  if (!isFiatCode(fiatCurrency)) {
    throw Object.assign(
      new Error(`fiat_currency inválida (usa ${FIATS.join(", ")})`),
      { status: 400 },
    );
  }
  const fiatRaw = input.fiatAmount.trim().replace(",", ".");
  const fiatNum = Number(fiatRaw);
  if (!Number.isFinite(fiatNum) || fiatNum <= 0 || fiatNum > 1e12) {
    throw Object.assign(new Error("fiat_amount inválido"), { status: 400 });
  }

  const rates = await getCryptoFiatRates();
  const rate = rates.rates[input.asset]?.[fiatCurrency];
  if (typeof rate !== "number" || !(rate > 0)) {
    throw Object.assign(
      new Error(
        `Sin tasa ${input.asset}/${fiatCurrency} ahora. Probá de nuevo o cobrá en crypto (scheme exact).`,
      ),
      { status: 503 },
    );
  }

  let crypto_amount: string;
  try {
    crypto_amount = cryptoAmountFromFiat(fiatNum, rate);
  } catch {
    throw Object.assign(
      new Error("El monto en crypto quedó en 0; subí el fiat_amount"),
      { status: 400 },
    );
  }

  const zeroDec =
    fiatCurrency === "CLP" ||
    fiatCurrency === "COP" ||
    fiatCurrency === "ARS";

  return {
    scheme: "exact_pay",
    fiat_amount: fiatNum.toFixed(zeroDec ? 0 : 2),
    fiat_currency: fiatCurrency,
    asset: input.asset,
    crypto_amount,
    rate_asset_in_fiat: rate,
    locked_at: new Date().toISOString(),
    rates_updated_at: rates.updated_at,
    rates_source: rates.source,
    rates_stale: rates.stale,
    note: "Fiat quote locked to crypto at create time. Not Reflector / not exact-fx atomic swap.",
  };
}
