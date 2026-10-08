"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  ExternalLink,
  Link2,
  Loader2,
  Mail,
  MessageCircle,
} from "lucide-react";
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
import type { Contact } from "@/components/ContactsSection";

function waMeShare(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function mailtoShare(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

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
  const [lastPayment, setLastPayment] = useState<DashboardPayment | null>(null);
  const [copied, setCopied] = useState(false);
  const [emailBusy, setEmailBusy] = useState(false);
  const [emailNote, setEmailNote] = useState<string | null>(null);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [contactId, setContactId] = useState("");

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === contactId) ?? null,
    [contacts, contactId],
  );

  useEffect(() => {
    if (!apiKey) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/v1/contacts`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        const body = (await res.json()) as { data?: Contact[] };
        if (!cancelled && res.ok) setContacts(body.data ?? []);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

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
    setCopied(false);
    try {
      const normalized = Number(amount.trim().replace(",", ".")).toFixed(7);
      const invoice = selectedContact
        ? {
            contact_id: selectedContact.id,
            recipient_name: selectedContact.display_name,
            channel: selectedContact.phone_e164
              ? "whatsapp"
              : selectedContact.email
                ? "email"
                : "link",
            source: "panel",
            phone_e164: selectedContact.phone_e164,
            email: selectedContact.email,
          }
        : undefined;
      const res = await fetch(`${API}/v1/payment_intents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          amount: normalized,
          asset,
          description:
            description.trim() ||
            (selectedContact
              ? `Cobro a ${selectedContact.display_name}`
              : undefined),
          external_user_id: selectedContact?.id,
          metadata: invoice ? { invoice } : undefined,
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
      const payment = body as DashboardPayment;
      onPaymentCreated(payment);
      setLastPayment(payment);
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
    <section className="panel panel--composer">
      <div className="panel__head">
        <h2 className="panel-title">{t.createTitle}</h2>
      </div>
      <div className="panel__body">
        <form className="grid gap-4" onSubmit={onCreate}>
          <div className="grid gap-2">
            <Label htmlFor="contact">{t.invoiceContact}</Label>
            <select
              id="contact"
              className="asset-select w-full"
              value={contactId}
              onChange={(e) => setContactId(e.target.value)}
            >
              <option value="">{t.invoiceNoContact}</option>
              {contacts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.display_name}
                  {c.phone_e164
                    ? ` · ${c.phone_e164}`
                    : c.email
                      ? ` · ${c.email}`
                      : ""}
                </option>
              ))}
            </select>
            <p className="text-xs text-[var(--text-2)]">{t.invoiceContactHint}</p>
          </div>

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
            <div className="success-strip__actions flex flex-wrap gap-2">
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
              {selectedContact?.phone_e164 && (
                <Button type="button" variant="default" asChild>
                  <a
                    href={waMeShare(
                      selectedContact.phone_e164,
                      t.invoiceWaText(
                        selectedContact.display_name,
                        lastPayment?.amount ?? amount,
                        lastPayment?.asset ?? asset,
                        lastUrl,
                      ),
                    )}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <MessageCircle className="h-4 w-4" /> {t.shareWhatsApp}
                  </a>
                </Button>
              )}
              {selectedContact?.email && lastPayment && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={emailBusy || !apiKey}
                  onClick={() => {
                    void (async () => {
                      if (!apiKey || !lastPayment) return;
                      setEmailBusy(true);
                      setEmailNote(null);
                      try {
                        const res = await fetch(
                          `${API}/v1/payment_intents/${lastPayment.id}/send_email`,
                          {
                            method: "POST",
                            headers: {
                              Authorization: `Bearer ${apiKey}`,
                              "Content-Type": "application/json",
                            },
                            body: JSON.stringify({
                              to: selectedContact.email,
                            }),
                          },
                        );
                        const body = (await res.json()) as {
                          error?: string;
                          to?: string;
                        };
                        if (res.ok) {
                          setEmailNote(t.emailSent);
                          return;
                        }
                        // Fallback mailto if Resend not configured / failed
                        window.location.href = mailtoShare(
                          selectedContact.email!,
                          t.invoiceMailSubject(
                            lastPayment.amount,
                            lastPayment.asset,
                          ),
                          t.invoiceWaText(
                            selectedContact.display_name,
                            lastPayment.amount,
                            lastPayment.asset,
                            lastUrl!,
                          ),
                        );
                        if (res.status === 503) {
                          setEmailNote(t.emailMailtoFallback);
                        } else {
                          setEmailNote(body.error ?? t.emailFail);
                        }
                      } catch {
                        window.location.href = mailtoShare(
                          selectedContact.email!,
                          t.invoiceMailSubject(
                            lastPayment.amount,
                            lastPayment.asset,
                          ),
                          t.invoiceWaText(
                            selectedContact.display_name,
                            lastPayment.amount,
                            lastPayment.asset,
                            lastUrl!,
                          ),
                        );
                        setEmailNote(t.emailMailtoFallback);
                      } finally {
                        setEmailBusy(false);
                      }
                    })();
                  }}
                >
                  {emailBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}{" "}
                  {t.shareEmail}
                </Button>
              )}
              {emailNote && (
                <p className="text-xs text-[var(--text-2)] w-full" role="status">
                  {emailNote}
                </p>
              )}
              <Button type="button" variant="outline" asChild>
                <a href={lastUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" /> {t.openCheckout}
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
