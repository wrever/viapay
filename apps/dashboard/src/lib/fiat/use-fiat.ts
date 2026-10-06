"use client";

import { useCallback, useEffect, useState } from "react";
import {
  DEFAULT_FIAT,
  FIAT_CODES,
  readStoredFiat,
  writeStoredFiat,
  type FiatCode,
} from "@viapay/prefs";
import { API } from "@/lib/config";
import {
  convertCryptoToFiat,
  formatFiatAmount,
  type CryptoAsset,
  type RatesPayload,
} from "@/lib/fiat/format";

export { FIAT_CODES, DEFAULT_FIAT, type FiatCode };
export type { CryptoAsset, RatesPayload };

let ratesMemory: RatesPayload | null = null;
let ratesFetchedAt = 0;
let ratesInflight: Promise<RatesPayload> | null = null;

const CLIENT_TTL_MS = 10 * 60 * 1000;

async function fetchRates(): Promise<RatesPayload> {
  const now = Date.now();
  if (ratesMemory && now - ratesFetchedAt < CLIENT_TTL_MS) {
    return ratesMemory;
  }
  if (ratesInflight) return ratesInflight;

  ratesInflight = (async () => {
    try {
      const res = await fetch(`${API}/v1/rates`, { cache: "no-store" });
      if (!res.ok) throw new Error(`rates_${res.status}`);
      const body = (await res.json()) as RatesPayload;
      ratesMemory = body;
      ratesFetchedAt = Date.now();
      return body;
    } catch {
      if (ratesMemory) {
        return { ...ratesMemory, stale: true };
      }
      return {
        base: "crypto",
        assets: ["XLM", "USDC"],
        fiats: [...FIAT_CODES],
        rates: { XLM: {}, USDC: {} },
        updated_at: null,
        stale: true,
        source: "none",
      };
    } finally {
      ratesInflight = null;
    }
  })();

  return ratesInflight;
}

export function useFiatCurrency() {
  const [fiat, setFiatState] = useState<FiatCode>(DEFAULT_FIAT);

  useEffect(() => {
    setFiatState(readStoredFiat());
    function sync() {
      setFiatState(readStoredFiat());
    }
    window.addEventListener("viapay-fiat", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("viapay-fiat", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setFiat = useCallback((code: FiatCode) => {
    writeStoredFiat(code);
    setFiatState(code);
  }, []);

  return { fiat, setFiat };
}

export function useCryptoRates() {
  const [rates, setRates] = useState<RatesPayload | null>(ratesMemory);
  const [loading, setLoading] = useState(!ratesMemory);

  useEffect(() => {
    let cancelled = false;
    setLoading(!ratesMemory);
    fetchRates()
      .then((payload) => {
        if (!cancelled) {
          setRates(payload);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });

    const timer = window.setInterval(() => {
      fetchRates()
        .then((payload) => {
          if (!cancelled) setRates(payload);
        })
        .catch(() => undefined);
    }, CLIENT_TTL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, []);

  return { rates, loading };
}

export function useFiatEquivalent(
  amount: string | number | null | undefined,
  asset: string | null | undefined,
) {
  const { fiat } = useFiatCurrency();
  const { rates, loading } = useCryptoRates();
  const crypto = asset === "USDC" || asset === "XLM" ? asset : null;
  const value =
    crypto && amount != null
      ? convertCryptoToFiat(amount, crypto, fiat, rates)
      : null;
  const formatted =
    value != null ? formatFiatAmount(value, fiat) : null;

  return {
    fiat,
    value,
    formatted,
    loading,
    stale: rates?.stale ?? false,
    ready: formatted != null,
  };
}
