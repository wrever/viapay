"use client";

import { useCallback, useEffect, useState } from "react";
import { ArrowLeftRight, ExternalLink, Loader2, Wallet } from "lucide-react";
import { API } from "@/lib/config";
import { useStellarWallet } from "@/lib/checkout/wallet";
import type { Messages } from "@/lib/checkout/messages";

type SwapAsset = "XLM" | "USDC";

type SwapStatus = {
  configured: boolean;
  network: "testnet" | "mainnet";
  app_url: string;
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

export function CheckoutSwap({
  t,
  network,
  payAsset,
}: {
  t: Messages;
  network: "testnet" | "mainnet" | "local";
  payAsset: string;
}) {
  const kitNetwork = network === "mainnet" ? "mainnet" : "testnet";
  const wallet = useStellarWallet(kitNetwork);

  const defaultOut: SwapAsset = payAsset === "USDC" ? "USDC" : "XLM";
  const defaultIn: SwapAsset = defaultOut === "USDC" ? "XLM" : "USDC";

  const [status, setStatus] = useState<SwapStatus | null>(null);
  const [assetIn, setAssetIn] = useState<SwapAsset>(defaultIn);
  const [assetOut, setAssetOut] = useState<SwapAsset>(defaultOut);
  const [amount, setAmount] = useState("1");
  const [quote, setQuote] = useState<QuoteResult | null>(null);
  const [busy, setBusy] = useState<"quote" | "swap" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [txHash, setTxHash] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API}/v1/swap`, { signal: controller.signal });
        const body = await res.json();
        if (!res.ok) throw new Error(body.error ?? t.genericError);
        setStatus(body as SwapStatus);
      } catch (e) {
        if (controller.signal.aborted) return;
        setError(e instanceof Error ? e.message : t.genericError);
      }
    })();
    return () => controller.abort();
  }, [t.genericError]);

  const flip = useCallback(() => {
    setAssetIn(assetOut);
    setAssetOut(assetIn);
    setQuote(null);
    setTxHash(null);
    setError(null);
  }, [assetIn, assetOut]);

  async function requestQuote() {
    if (!status?.configured) {
      setError(t.swapUnavailable);
      return;
    }
    setBusy("quote");
    setError(null);
    setTxHash(null);
    setQuote(null);
    try {
      const res = await fetch(`${API}/v1/swap/quote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setBusy(null);
    }
  }

  async function executeSwap() {
    if (!quote) return;
    setBusy("swap");
    setError(null);
    setTxHash(null);
    try {
      let address = wallet.address;
      if (!address) address = await wallet.connect();
      if (!address) throw new Error(t.swapWalletNeeded);

      const buildRes = await fetch(`${API}/v1/swap/build`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
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
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ xdr: signedXdr }),
      });
      const sent = await sendRes.json();
      if (!sendRes.ok) throw new Error(sent.error ?? t.swapSendFail);
      setTxHash(sent.hash as string);
      setQuote(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
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
    <div className="checkout-swap" role="region" aria-label={t.swapTitle}>
      <p className="checkout-swap__desc">{t.swapDesc}</p>

      {degraded ? (
        <div className="checkout-swap__degraded" role="status">
          <p>{t.swapUnavailable}</p>
          {status?.app_url && (
            <a
              href={status.app_url}
              target="_blank"
              rel="noopener noreferrer"
              className="checkout-swap__ext"
            >
              {t.swapOpenApp}
              <ExternalLink className="size-3" aria-hidden />
            </a>
          )}
        </div>
      ) : (
        <>
          <div className="checkout-swap__pair">
            <label className="checkout-swap__label">
              {t.swapFrom}
              <span className="checkout-swap__row">
                <select
                  className="checkout-swap__select"
                  value={assetIn}
                  disabled={Boolean(busy)}
                  onChange={(e) => {
                    const next = e.target.value as SwapAsset;
                    setAssetIn(next);
                    if (next === assetOut) {
                      setAssetOut(next === "XLM" ? "USDC" : "XLM");
                    }
                    setQuote(null);
                    setTxHash(null);
                  }}
                >
                  <option value="XLM">XLM</option>
                  <option value="USDC">USDC</option>
                </select>
                <input
                  className="checkout-swap__input perf"
                  inputMode="decimal"
                  value={amount}
                  disabled={Boolean(busy)}
                  onChange={(e) => {
                    setAmount(e.target.value);
                    setQuote(null);
                    setTxHash(null);
                  }}
                  placeholder="0.00"
                />
              </span>
            </label>

            <button
              type="button"
              className="checkout-swap__flip"
              aria-label={t.swapFlip}
              disabled={Boolean(busy)}
              onClick={flip}
            >
              <ArrowLeftRight className="size-4" aria-hidden />
            </button>

            <label className="checkout-swap__label">
              {t.swapTo}
              <span className="checkout-swap__row">
                <select
                  className="checkout-swap__select"
                  value={assetOut}
                  disabled={Boolean(busy)}
                  onChange={(e) => {
                    const next = e.target.value as SwapAsset;
                    setAssetOut(next);
                    if (next === assetIn) {
                      setAssetIn(next === "XLM" ? "USDC" : "XLM");
                    }
                    setQuote(null);
                    setTxHash(null);
                  }}
                >
                  <option value="XLM">XLM</option>
                  <option value="USDC">USDC</option>
                </select>
                <span className="checkout-swap__estimate perf" aria-live="polite">
                  {quote ? quote.amount_out : "—"}
                </span>
              </span>
            </label>
          </div>

          {quote && (
            <p className="checkout-swap__quote" role="status">
              {t.swapQuoteLine(
                quote.amount_in,
                quote.asset_in,
                quote.amount_out,
                quote.asset_out,
              )}
              {quote.price_impact_pct
                ? ` · ${t.swapImpact(quote.price_impact_pct)}`
                : ""}
            </p>
          )}

          {wallet.address && (
            <p className="checkout-swap__wallet perf">
              {t.swapWallet}: {wallet.address.slice(0, 4)}…{wallet.address.slice(-4)}
            </p>
          )}

          {error && (
            <p className="checkout-swap__error" role="alert">
              {error}
            </p>
          )}

          {txHash && (
            <p className="checkout-swap__ok" role="status">
              {t.swapSuccess}{" "}
              <a
                href={`${explorerBase}/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                {txHash.slice(0, 10)}…{txHash.slice(-6)}
              </a>
            </p>
          )}

          <div className="checkout-swap__actions">
            <button
              type="button"
              className="act act--ghost"
              disabled={Boolean(busy) || degraded}
              onClick={() => void requestQuote()}
            >
              {busy === "quote" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t.swapQuoting}
                </>
              ) : (
                t.swapGetQuote
              )}
            </button>
            <button
              type="button"
              className="act act--primary"
              disabled={Boolean(busy) || degraded || !quote}
              onClick={() => void executeSwap()}
            >
              {busy === "swap" ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                  {t.swapSwapping}
                </>
              ) : (
                <>
                  <Wallet className="h-4 w-4" aria-hidden />
                  {wallet.address ? t.swapExecute : t.swapConnectAndSwap}
                </>
              )}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
