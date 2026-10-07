"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, ExternalLink, Link2, Loader2 } from "lucide-react";
import {
  calcFeeSplit,
  DEFAULT_FEE_BPS,
  formatAssetAmount,
  formatBps,
  isValidStellarPubkey,
  MAX_RESELLER_FEE_BPS,
  parseAssetAmount,
} from "@viapay/shared";
import { LOCALE_TAG } from "@viapay/prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import type { DashboardPayment } from "@/lib/payment-types";
import { useLocale } from "@/lib/i18n";
import { FiatEquivalent } from "@/components/FiatEquivalent";

function pctToBps(raw: string): number | null {
  const cleaned = raw.trim().replace(",", ".");
  if (cleaned === "") return null;
  const pct = Number(cleaned);
  if (!Number.isFinite(pct) || pct < 0) return null;
  return Math.round(pct * 100);
}

function money(units: bigint, asset: string, localeTag: string): string {
  const text = formatAssetAmount(units);
  return `${Number(text).toLocaleString(localeTag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  })} ${asset}`;
}

export function CreatePaymentLink({
  apiKey,
  feeBps = DEFAULT_FEE_BPS,
  hasWallet,
  merchantUsdcReady,
  onNeedWallet,
  onNeedUsdcTrustline,
  onPaymentCreated,
}: {
  apiKey: string | null;
  feeBps?: number;
  hasWallet: boolean;
  /** True when Horizon shows USDC trustline on the saved merchant wallet. */
  merchantUsdcReady: boolean | null;
  onNeedWallet: () => void;
  onNeedUsdcTrustline: () => void;
  onPaymentCreated: (payment: DashboardPayment) => void;
}) {
  const { t, locale } = useLocale();
  const localeTag = LOCALE_TAG[locale];
  const [amount, setAmount] = useState("20");
  // Prefer XLM when USDC readiness is unknown/false; keep USDC selectable with gate.
  const [asset, setAsset] = useState<"USDC" | "XLM">("XLM");
  const [description, setDescription] = useState("");
  const [resellerOpen, setResellerOpen] = useState(false);
  const [resellerPct, setResellerPct] = useState("");
  const [resellerAddress, setResellerAddress] = useState("");
  const [resellerWarning, setResellerWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [lastX402, setLastX402] = useState<string | null>(null);
  const [copied, setCopied] = useState<"checkout" | "x402" | null>(null);

  const resellerBps = resellerOpen ? (pctToBps(resellerPct) ?? 0) : 0;
  const addressValid = isValidStellarPubkey(resellerAddress.trim());
  const usdcBlocked = asset === "USDC" && merchantUsdcReady === false;

  const resellerError = useMemo(() => {
    if (!resellerOpen) return null;
    if (resellerBps > MAX_RESELLER_FEE_BPS) {
      return t.errResellerMax(formatBps(MAX_RESELLER_FEE_BPS));
    }
    if (feeBps + resellerBps >= 10000) return t.errResellerAll;
    if (resellerBps > 0 && !addressValid) return t.errResellerWallet;
    return null;
  }, [resellerOpen, resellerBps, addressValid, feeBps, t]);

  const preview = useMemo(() => {
    let units: bigint;
    try {
      units = parseAssetAmount(amount.trim().replace(",", "."));
    } catch {
      return null;
    }
    if (units <= 0n || resellerError) return null;
    const split = calcFeeSplit(units, feeBps, resellerBps);
    if (split.net <= 0n) return null;
    return split;
  }, [amount, feeBps, resellerBps, resellerError]);

  useEffect(() => {
    if (!apiKey || !resellerOpen || !addressValid || resellerBps <= 0) {
      setResellerWarning(null);
      return;
    }
    const address = resellerAddress.trim();
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const res = await fetch(
          `${API}/v1/readiness?reseller=${encodeURIComponent(address)}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            signal: controller.signal,
          },
        );
        if (!res.ok) return;
        const body = await res.json();
        const found = (body.resellers ?? []).find(
          (item: { address: string }) => item.address === address,
        );
        if (!found) return;
        if (!found.xlm.exists) setResellerWarning(t.warnResellerMissing);
        else if (asset === "USDC" && !found.usdc.canReceive) {
          setResellerWarning(t.warnResellerUsdc);
        } else setResellerWarning(null);
      } catch {
        // Horizon or the API being down should not block creating the link.
      }
    }, 500);
    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    apiKey,
    resellerOpen,
    addressValid,
    resellerBps,
    resellerAddress,
    asset,
    t,
  ]);

  function selectAsset(next: "USDC" | "XLM") {
    setAsset(next);
    if (next === "USDC" && merchantUsdcReady === false) {
      onNeedUsdcTrustline();
    }
  }

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!hasWallet) {
      onNeedWallet();
      return;
    }
    if (usdcBlocked) {
      onNeedUsdcTrustline();
      setError(t.trustlineUsdcBlocked);
      return;
    }
    if (!apiKey) {
      setError(t.errNoKey);
      return;
    }
    if (resellerError) {
      setError(resellerError);
      return;
    }
    setBusy(true);
    setError(null);
    setCopied(null);
    try {
      const normalized = Number(amount.trim().replace(",", ".")).toFixed(7);
      const res = await fetch(`${API}/v1/payment_intents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: normalized,
          asset,
          description: description.trim() || undefined,
          ...(resellerBps > 0
            ? {
                reseller_fee_bps: resellerBps,
                reseller_address: resellerAddress.trim(),
              }
            : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.errCreate);
      onPaymentCreated(body as DashboardPayment);
      setLastUrl(body.checkout_url as string);
      setLastX402(
        typeof body.x402_url === "string" ? (body.x402_url as string) : null,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string, kind: "checkout" | "x402") {
    await navigator.clipboard.writeText(url);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className="panel panel--composer">
      <div className="panel__head">
        <h2 className="panel-title">{t.createTitle}</h2>
      </div>
      <div className="panel__body">
        <form className="grid gap-4" onSubmit={onCreate}>
          <div className="grid gap-2">
            <Label htmlFor="amount">{t.amount}</Label>
            <div className="amount-row">
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="20"
                required
                className="amount-input"
              />
              <select
                aria-label={t.asset}
                className="asset-select"
                value={asset}
                onChange={(e) =>
                  selectAsset(e.target.value as "USDC" | "XLM")
                }
              >
                <option value="XLM">XLM</option>
                <option value="USDC">USDC</option>
              </select>
            </div>
            <FiatEquivalent
              amount={amount}
              asset={asset}
              locale={locale}
              approx={t.fiatApprox}
              unavailable={t.fiatUnavailable}
            />
            {usdcBlocked && (
              <p className="tone tone--warning text-sm" role="status">
                {t.trustlineUsdcBlocked}
              </p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="desc">{t.whyOptional}</Label>
            <Input
              id="desc"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t.whyPlaceholder}
            />
          </div>

          <div className="disclosure" data-open={resellerOpen}>
            <label className="disclosure__toggle">
              <input
                type="checkbox"
                checked={resellerOpen}
                onChange={(e) => setResellerOpen(e.target.checked)}
              />
              <span>
                <strong>{t.resellerToggle}</strong>
                <span>{t.resellerHint}</span>
              </span>
            </label>

            {resellerOpen && (
              <div className="mt-3 grid gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="reseller-pct">{t.resellerPct}</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      id="reseller-pct"
                      inputMode="decimal"
                      value={resellerPct}
                      onChange={(e) => setResellerPct(e.target.value)}
                      placeholder="7"
                    />
                    <span className="text-sm font-semibold text-[var(--text-2)]">
                      %
                    </span>
                  </div>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="reseller-address">{t.resellerWallet}</Label>
                  <Input
                    id="reseller-address"
                    value={resellerAddress}
                    onChange={(e) => setResellerAddress(e.target.value)}
                    placeholder="G…"
                    spellCheck={false}
                    className="perf text-xs"
                  />
                </div>
                {resellerWarning && (
                  <p className="tone tone--warning px-3 py-2 text-xs font-medium">
                    {resellerWarning}
                  </p>
                )}
              </div>
            )}
          </div>

          {resellerError && (
            <p className="text-sm font-medium text-[var(--error)]">
              {resellerError}
            </p>
          )}

          {preview && (
            <dl className="split-preview">
              <div className="split-preview__row">
                <dt>{t.feeVia(formatBps(preview.viaBps))}</dt>
                <dd className="perf">
                  {money(preview.viaFee, asset, localeTag)}
                </dd>
              </div>
              {preview.resellerFee > 0n && (
                <div className="split-preview__row">
                  <dt>{t.feeReseller(formatBps(preview.resellerBps))}</dt>
                  <dd className="perf">
                    {money(preview.resellerFee, asset, localeTag)}
                  </dd>
                </div>
              )}
              <div className="split-preview__row split-preview__row--net">
                <dt>{t.youReceive}</dt>
                <dd className="perf">{money(preview.net, asset, localeTag)}</dd>
              </div>
            </dl>
          )}

          {error && (
            <p className="text-sm font-medium text-[var(--error)]">{error}</p>
          )}

          {!hasWallet && (
            <p className="tone tone--warning text-sm" role="status">
              {t.walletGateBlocked}
            </p>
          )}

          <Button
            type="submit"
            size="lg"
            disabled={busy || !hasWallet || usdcBlocked}
            className="w-full"
            onClick={(e) => {
              if (!hasWallet) {
                e.preventDefault();
                onNeedWallet();
                return;
              }
              if (usdcBlocked) {
                e.preventDefault();
                onNeedUsdcTrustline();
              }
            }}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" /> {t.creating}
              </>
            ) : (
              <>
                <Link2 className="h-4 w-4" /> {t.createCta}
              </>
            )}
          </Button>
        </form>

        {lastUrl && (
          <div className="success-strip">
            <p className="success-strip__label">{t.readyCopy}</p>
            <p className="success-strip__url perf">{lastUrl}</p>
            <div className="success-strip__actions">
              <Button type="button" onClick={() => copy(lastUrl, "checkout")}>
                {copied === "checkout" ? (
                  <>
                    <Check className="h-4 w-4" /> {t.copied}
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" /> {t.copyLink}
                  </>
                )}
              </Button>
              <Button type="button" variant="outline" asChild>
                <a href={lastUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> {t.openCheckout}
                </a>
              </Button>
            </div>
            {lastX402 && (
              <div className="success-strip__agent">
                <p className="success-strip__label">{t.readyAgent}</p>
                <p className="success-strip__url perf">{lastX402}</p>
                <div className="success-strip__actions">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => copy(lastX402, "x402")}
                  >
                    {copied === "x402" ? (
                      <>
                        <Check className="h-4 w-4" /> {t.copied}
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" /> {t.copyAgentLink}
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
