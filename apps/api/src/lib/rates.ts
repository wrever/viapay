export type FiatCode =
  | "CLP"
  | "ARS"
  | "COP"
  | "BOB"
  | "MXN"
  | "PEN"
  | "USD";

export type CryptoAsset = "XLM" | "USDC";

const FIAT_CODES: FiatCode[] = [
  "CLP",
  "ARS",
  "COP",
  "BOB",
  "MXN",
  "PEN",
  "USD",
];

export type RatesPayload = {
  base: "crypto";
  assets: CryptoAsset[];
  fiats: FiatCode[];
  /** asset → fiat → price of 1 unit of asset in that fiat */
  rates: Record<CryptoAsset, Partial<Record<FiatCode, number>>>;
  updated_at: string | null;
  stale: boolean;
  source: "live" | "cache" | "none";
};

const COINGECKO_IDS: Record<CryptoAsset, string> = {
  XLM: "stellar",
  USDC: "usd-coin",
};

const ASSETS: CryptoAsset[] = ["XLM", "USDC"];

const CACHE_TTL_MS = 10 * 60 * 1000;

type CacheEntry = {
  payload: RatesPayload;
  fetchedAt: number;
};

let cache: CacheEntry | null = null;

function emptyRates(): RatesPayload["rates"] {
  return { XLM: {}, USDC: {} };
}

function hasAnyRate(rates: RatesPayload["rates"]): boolean {
  return ASSETS.some((a) => Object.keys(rates[a]).length > 0);
}

/** Crypto unit prices in USD (CoinGecko). */
async function fetchCryptoUsd(): Promise<Partial<Record<CryptoAsset, number>>> {
  const ids = ASSETS.map((a) => COINGECKO_IDS[a]).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`coingecko_${res.status}`);
  const body = (await res.json()) as Record<string, { usd?: number }>;
  const out: Partial<Record<CryptoAsset, number>> = {};
  for (const asset of ASSETS) {
    const usd = body[COINGECKO_IDS[asset]]?.usd;
    if (typeof usd === "number" && Number.isFinite(usd) && usd > 0) {
      out[asset] = usd;
    }
  }
  return out;
}

/**
 * USD → fiat multipliers. open.er-api covers LatAm codes CoinGecko omits
 * (COP, BOB, PEN, …).
 */
async function fetchUsdToFiat(): Promise<Partial<Record<FiatCode, number>>> {
  const res = await fetch("https://open.er-api.com/v6/latest/USD", {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(8_000),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`fx_${res.status}`);
  const body = (await res.json()) as {
    result?: string;
    rates?: Record<string, number>;
  };
  if (body.result !== "success" || !body.rates) {
    throw new Error("fx_invalid");
  }
  const out: Partial<Record<FiatCode, number>> = { USD: 1 };
  for (const fiat of FIAT_CODES) {
    if (fiat === "USD") continue;
    const rate = body.rates[fiat];
    if (typeof rate === "number" && Number.isFinite(rate) && rate > 0) {
      out[fiat] = rate;
    }
  }
  return out;
}

function composeRates(
  cryptoUsd: Partial<Record<CryptoAsset, number>>,
  usdFiat: Partial<Record<FiatCode, number>>,
): RatesPayload["rates"] {
  const rates = emptyRates();
  for (const asset of ASSETS) {
    const usd = cryptoUsd[asset];
    if (usd == null) continue;
    for (const fiat of FIAT_CODES) {
      const mult = usdFiat[fiat];
      if (mult == null) continue;
      rates[asset][fiat] = usd * mult;
    }
  }
  return rates;
}

/** Public rates with short in-memory cache. Falls back to last good payload. */
export async function getCryptoFiatRates(): Promise<RatesPayload> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return { ...cache.payload, stale: false, source: "cache" };
  }

  try {
    const [cryptoUsd, usdFiat] = await Promise.all([
      fetchCryptoUsd(),
      fetchUsdToFiat(),
    ]);
    const rates = composeRates(cryptoUsd, usdFiat);
    if (!hasAnyRate(rates)) {
      throw new Error("rates_empty");
    }
    const payload: RatesPayload = {
      base: "crypto",
      assets: ASSETS,
      fiats: [...FIAT_CODES],
      rates,
      updated_at: new Date().toISOString(),
      stale: false,
      source: "live",
    };
    cache = { payload, fetchedAt: now };
    return payload;
  } catch {
    if (cache) {
      return { ...cache.payload, stale: true, source: "cache" };
    }
    return {
      base: "crypto",
      assets: ASSETS,
      fiats: [...FIAT_CODES],
      rates: emptyRates(),
      updated_at: null,
      stale: true,
      source: "none",
    };
  }
}
