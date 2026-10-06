"use client";

import { useCallback, useEffect, useState } from "react";
import {
  ArrowLeftRight,
  ExternalLink,
  Loader2,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useStellarWallet } from "@/lib/checkout/wallet";
import { useLocale } from "@/lib/i18n";

type SwapAsset = "XLM" | "USDC";

type SwapStatus = {
  configured: boolean;
  network: "testnet" | "mainnet";
  app_url: string;
  env_hint: string | null;
};

type QuoteResult = {
  asset_in: SwapAsset;
  asset_out: SwapAsset;
  amount_in: string;
  amount_out: string;
  price_impact_pct: string | null;
  platform: string | null;
  network: string;
  quote: Record<string, unknown>;
};

export function SwapPanel({
  apiKey,
  network,
}: {
  apiKey: string | null;
  network: string;
}) {
  const { t } = useLocale();
  const kitNetwork = network === "mainnet" ? "mainnet" : "testnet";
  const wallet = useStellarWallet(kitNetwork);

  const [status, setStatus] = useState<SwapStatus | null>(null);
  const [statusError, setStatusError] = useState<string | null>(null);
  const [assetIn, setAssetIn] = useState<SwapAsset>("XLM");
  const [assetOut, setAssetOut] = useState<SwapAsset>("USDC");
  const [amount, setAmount] = useState("1");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [busy, setBusy] = useState<"quote" | "swap" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API}/v1/swap`, {
          signal: controller.signal,
        });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? t.errGeneric);
        setStatus(body as SwapStatus);
        setStatusError(null);
      } catch (e) {
        if (controller.signal.aborted) return;
        setStatusError(e instanceof Error ? e.message : t.errGeneric);
      }
    })();
    return () => controller.abort();
  }, [t]);

  const flip = useCallback(() => {
    setAssetIn(assetOut);
    setAssetOut(assetIn);
    setQuote(null);
    setTxHash(null);
    setError(null);
  }, [assetIn, assetOut]);

  async function requestQuote() {
    if (!apiKey) {
      setError(t.errNoKey);
      return;
    }
    if (!status?.configured) {
      setError(t.swapMissingKey);
      return;
    }
    setBusy("quote");
    setError(null);
    setTxHash(null);
    setQuote(null);
    try {
      const res = await fetch(`${API}/v1/swap/quote`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          asset_in: assetIn,
          asset_out: assetOut,
          amount: amount.trim().replace(",", "."),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.swapQuoteFail);
      setQuote(body as QuoteResult);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
    } finally {
      setBusy(null);
    }
  }

  async function executeSwap() {
    if (!apiKey || !quote) return;
    setBusy("swap");
    setError(null);
    setTxHash(null);
    try {
      let address = wallet.address;
      if (!address) {
        address = await wallet.connect();
      }
      if (!address) throw new Error(t.swapWalletNeeded);

      const buildRes = await fetch(`${API}/v1/swap/build`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quote: quote.quote,
          from: address,
          to: address,
        }),
      });
      const built = await buildRes.json();
      if (!buildRes.ok) throw new Error(built.error ?? t.swapBuildFail);

      const signedXdr = await wallet.sign(
        built.xdr as string,
        built.network_passphrase as string,
      );

      const sendRes = await fetch(`${API}/v1/swap/send`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ xdr: signedXdr }),
      });
      const sent = await sendRes.json();
      if (!sendRes.ok) throw new Error(sent.error ?? t.swapSendFail);
      setTxHash(sent.hash as string);
      setQuote(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
    } finally {
      setBusy(null);
    }
  }

  const explorerBase =
    (status?.network ?? kitNetwork) === "mainnet"
      ? "https://stellar.expert/explorer/public/tx"
      : "https://stellar.expert/explorer/testnet/tx";

  const degraded = status !== null && !status.configured;

  return (
    <section className="panel panel--swap">
      <div className="panel__head">
        <div className="swap-head">
          <h2 className="panel-title">{t.swapTitle}</h2>
          <span className="swap-plus">{t.swapPlusBadge}</span>
        </div>
        <p>{t.swapDesc}</p>
      </div>

      <div className="panel__body grid gap-4">
        {statusError && (
          <p className="tone tone--warning text-sm" role="alert">
            {statusError}
          </p>
        )}

        {degraded && (
          <div className="swap-degraded" role="status">
            <p className="swap-degraded__title">{t.swapMissingKey}</p>
            <p className="swap-degraded__body">{t.swapMissingKeyBody}</p>
            <code className="perf text-xs block break-all">SOROSWAP_API_KEY</code>
            <p className="text-xs text-[var(--text-2)]">{t.swapMissingKeyWhere}</p>
            <Button variant="outline" size="sm" asChild>
              <a
                href={status.app_url}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t.swapOpenApp}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Button>
          </div>
        )}

        <div className="swap-pair">
          <div className="grid gap-2">
            <Label htmlFor="swap-from">{t.swapFrom}</Label>
            <div className="swap-row">
              <select
                id="swap-from"
                className="swap-select"
                value={assetIn}
                disabled={Boolean(busy) || degraded}
                onChange={(e) => {
                  const next = e.target.value as SwapAsset;
                  setAssetIn(next);
                  if (next === assetOut) setAssetOut(next === "XLM" ? "USDC" : "XLM");
                  setQuote(null);
                  setTxHash(null);
                }}
              >
                <option value="XLM">XLM</option>
                <option value="USDC">USDC</option>
              </select>
              <Input
                id="swap-amount"
                inputMode="decimal"
                value={amount}
                disabled={Boolean(busy) || degraded}
                onChange={(e) => {
                  setAmount(e.target.value);
                  setQuote(null);
                  setTxHash(null);
                }}
                placeholder="0.00"
                className="perf"
              />
            </div>
          </div>

          <button
            type="button"
            className="swap-flip"
            aria-label={t.swapFlip}
            disabled={Boolean(busy) || degraded}
            onClick={flip}
          >
            <ArrowLeftRight className="size-4" aria-hidden />
          </button>

          <div className="grid gap-2">
            <Label htmlFor="swap-to">{t.swapTo}</Label>
            <div className="swap-row">
              <select
                id="swap-to"
                className="swap-select"
                value={assetOut}
                disabled={Boolean(busy) || degraded}
                onChange={(e) => {
                  const next = e.target.value as SwapAsset;
                  setAssetOut(next);
                  if (next === assetIn) setAssetIn(next === "XLM" ? "USDC" : "XLM");
                  setQuote(null);
                  setTxHash(null);
                }}
              >
                <option value="XLM">XLM</option>
                <option value="USDC">USDC</option>
              </select>
              <div className="swap-estimate perf" aria-live="polite">
                {quote ? quote.amount_out : "—"}
              </div>
            </div>
          </div>
        </div>

        {quote && (
          <div className="swap-quote" role="status">
            <p>
              {t.swapQuoteLine(
                quote.amount_in,
                quote.asset_in,
                quote.amount_out,
                quote.asset_out,
              )}
            </p>
            {quote.price_impact_pct && (
              <p className="text-xs text-[var(--text-2)]">
                {t.swapImpact(quote.price_impact_pct)}
                {quote.platform ? ` · ${quote.platform}` : ""}
              </p>
            )}
          </div>
        )}

        {wallet.address && (
          <p className="text-xs text-[var(--text-2)] perf break-all">
            {t.swapWallet}: {wallet.address}
          </p>
        )}

        {error && (
          <p className="tone tone--warning text-sm" role="alert">
            {error}
          </p>
        )}

        {txHash && (
          <p className="tone text-sm" role="status">
            {t.swapSuccess}{" "}
            <a
              className="underline"
              href={`${explorerBase}/${txHash}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {txHash.slice(0, 10)}…{txHash.slice(-6)}
            </a>
          </p>
        )}

        <div className="swap-actions">
          <Button
            type="button"
            variant="outline"
            disabled={Boolean(busy) || degraded || !apiKey}
            onClick={() => void requestQuote()}
          >
            {busy === "quote" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t.swapQuoting}
              </>
            ) : (
              t.swapGetQuote
            )}
          </Button>
          <Button
            type="button"
            disabled={Boolean(busy) || degraded || !quote || !apiKey}
            onClick={() => void executeSwap()}
          >
            {busy === "swap" ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                {t.swapSwapping}
              </>
            ) : (
              <>
                <Wallet className="size-4" aria-hidden />
                {wallet.address ? t.swapExecute : t.swapConnectAndSwap}
              </>
            )}
          </Button>
        </div>

        <p className="text-xs text-[var(--text-2)]">{t.swapHint}</p>

        {!degraded && status?.app_url && (
          <a
            className="swap-external text-xs"
            href={status.app_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.swapOpenApp}
            <ExternalLink className="size-3" aria-hidden />
          </a>
        )}
      </div>
    </section>
  );
}
