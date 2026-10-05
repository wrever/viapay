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
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

type Payment = {
  id: string;
  status: string;
  amount: string;
  fee_amount: string;
  net_amount: string;
  reseller_fee_bps?: number;
  reseller_amount?: string;
  reseller_address?: string | null;
  asset: string;
  description: string | null;
  checkout_url: string;
  created_at: string;
  stellar_tx_hash?: string | null;
};

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
  initial,
  feeBps = DEFAULT_FEE_BPS,
}: {
  apiKey: string | null;
  initial: Payment[];
  feeBps?: number;
}) {
  const { t, locale } = useLocale();
  const localeTag = LOCALE_TAG[locale];
  const [amount, setAmount] = useState("20");
  const [asset, setAsset] = useState<"USDC" | "XLM">("USDC");
  const [description, setDescription] = useState("");
  const [resellerOpen, setResellerOpen] = useState(false);
  const [resellerPct, setResellerPct] = useState("");
  const [resellerAddress, setResellerAddress] = useState("");
  const [resellerWarning, setResellerWarning] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [payments, setPayments] = useState(initial);
  const [lastUrl, setLastUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const resellerBps = resellerOpen ? (pctToBps(resellerPct) ?? 0) : 0;
  const addressValid = isValidStellarPubkey(resellerAddress.trim());

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
          { headers: { Authorization: `Bearer ${apiKey}` }, signal: controller.signal },
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

  async function onCreate(e: React.FormEvent) {
    e.preventDefault();
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
    setCopied(false);
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
      setPayments((prev) => [body as Payment, ...prev]);
      setLastUrl(body.checkout_url as string);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
      <Card>
        <CardHeader>
          <CardTitle>{t.createTitle}</CardTitle>
          <CardDescription>{t.createDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={onCreate}>
            <div className="grid gap-2">
              <Label htmlFor="amount">{t.amount}</Label>
              <div className="flex gap-2">
                <Input
                  id="amount"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="20"
                  required
                />
                <select
                  aria-label={t.asset}
                  className="h-11 rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--bg)] px-3 text-sm font-bold text-[var(--text)]"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value as "USDC" | "XLM")}
                >
                  <option value="USDC">USDC</option>
                  <option value="XLM">XLM</option>
                </select>
              </div>
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

            <div className="rounded-[var(--r-md)] border border-[var(--border)] px-4 py-3">
              <label className="flex cursor-pointer items-center gap-2 text-sm font-bold">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--primary)]"
                  checked={resellerOpen}
                  onChange={(e) => setResellerOpen(e.target.checked)}
                />
                {t.resellerToggle}
              </label>
              <p className="mt-1 text-xs text-[var(--text-2)]">{t.resellerHint}</p>

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
              <dl className="grid gap-1.5 rounded-[var(--r-md)] bg-[var(--tint)] px-4 py-3 text-sm text-[var(--text-2)]">
                <div className="flex justify-between gap-3">
                  <dt>{t.feeVia(formatBps(preview.viaBps))}</dt>
                  <dd className="perf">
                    {money(preview.viaFee, asset, localeTag)}
                  </dd>
                </div>
                {preview.resellerFee > 0n && (
                  <div className="flex justify-between gap-3">
                    <dt>{t.feeReseller(formatBps(preview.resellerBps))}</dt>
                    <dd className="perf">
                      {money(preview.resellerFee, asset, localeTag)}
                    </dd>
                  </div>
                )}
                <div className="flex justify-between gap-3 border-t border-[var(--border)] pt-1.5 font-bold text-[var(--text)]">
                  <dt>{t.youReceive}</dt>
                  <dd className="perf">
                    {money(preview.net, asset, localeTag)}
                  </dd>
                </div>
              </dl>
            )}

            {error && (
              <p className="text-sm font-medium text-[var(--error)]">{error}</p>
            )}

            <Button type="submit" size="lg" disabled={busy} className="w-full">
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
            <div className="mt-5 rounded-[var(--r-lg)] border border-[var(--primary)] bg-[var(--tint)] p-4">
              <p className="mb-2 text-sm font-bold text-[var(--text)]">
                {t.readyCopy}
              </p>
              <p className="perf mb-3 break-all text-xs text-[var(--text-2)]">
                {lastUrl}
              </p>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => copy(lastUrl)}>
                  {copied ? (
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
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{t.recentTitle}</CardTitle>
          <CardDescription>{t.recentDesc}</CardDescription>
        </CardHeader>
        <CardContent>
          {payments.length === 0 ? (
            <p className="rounded-[var(--r-md)] border border-dashed border-[var(--border)] px-4 py-8 text-center text-sm text-[var(--text-2)]">
              {t.recentEmpty}
            </p>
          ) : (
            <ul className="grid gap-3">
              {payments.slice(0, 8).map((p) => (
                <li
                  key={p.id}
                  className="rounded-[var(--r-md)] border border-[var(--border)] bg-[var(--surface)] p-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="perf text-base">
                        {Number(p.amount).toLocaleString(localeTag, {
                          maximumFractionDigits: 2,
                        })}{" "}
                        {p.asset}
                      </p>
                      <p className="text-xs text-[var(--text-2)]">
                        {p.description || p.id}
                      </p>
                      {p.reseller_address && (
                        <p className="mt-1 text-xs text-[var(--text-2)]">
                          {t.resellerLine(
                            formatBps(p.reseller_fee_bps ?? 0),
                            p.reseller_amount ?? "",
                            p.asset,
                            p.reseller_address.slice(0, 6),
                          )}
                        </p>
                      )}
                      {p.stellar_tx_hash && (
                        <p className="perf mt-1 break-all text-[10px] text-[var(--text-2)]">
                          {p.stellar_tx_hash}
                        </p>
                      )}
                    </div>
                    <StatusBadge status={p.status} />
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      onClick={() => copy(p.checkout_url)}
                    >
                      <Copy className="h-3.5 w-3.5" /> {t.copy}
                    </Button>
                    <Button type="button" size="sm" variant="outline" asChild>
                      <a href={p.checkout_url} target="_blank" rel="noreferrer">
                        {t.open}
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useLocale();
  const tone: Record<string, string> = {
    requires_payment: "tone--warning",
    succeeded: "tone--success",
    canceled: "tone--neutral",
    expired: "tone--error",
  };
  const label: Record<string, string> = {
    requires_payment: t.statusPending,
    succeeded: t.statusPaid,
    canceled: t.statusCanceled,
    expired: t.statusExpired,
  };
  return (
    <span className={`badge ${tone[status] ?? "tone--neutral"}`}>
      {label[status] ?? status}
    </span>
  );
}
