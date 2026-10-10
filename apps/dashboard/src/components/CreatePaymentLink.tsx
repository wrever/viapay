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
  defaultLinkSigExpiresUnix,
  formatAssetAmount,
  formatBps,
  generateLinkSigNonce,
  isValidStellarPubkey,
  linkSigMessageV2,
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
import { FIAT_CODES, type FiatCode } from "@viapay/prefs";
import { useCryptoRates, useFiatCurrency } from "@/lib/fiat/use-fiat";
import { useStellarWallet } from "@/lib/checkout/wallet";

function waMeShare(phone: string, text: string): string {
  const digits = phone.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

function mailtoShare(email: string, subject: string, body: string): string {
  return `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function normalizeQuickEmail(raw: string): string | null {
  const e = raw.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e)) return null;
  return e;
}

function normalizeQuickPhone(raw: string): string | null {
  let p = raw.trim().replace(/^whatsapp:/i, "").replace(/[\s()-]/g, "");
  if (!p.startsWith("+")) {
    if (/^\d{8,15}$/.test(p)) p = `+${p}`;
    else return null;
  }
  if (!/^\+[1-9]\d{7,14}$/.test(p)) return null;
  return p;
}

type ShareTarget = {
  name: string;
  phone_e164: string | null;
  email: string | null;
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
  feeBps = DEFAULT_FEE_BPS,
  hasWallet,
  merchantWallet,
  merchantUsdcReady,
  network,
  onNeedWallet,
  onNeedUsdcTrustline,
  onPaymentCreated,
}: {
  apiKey: string | null;
  feeBps?: number;
  hasWallet: boolean;
  merchantWallet?: string | null;
  /** True when Horizon shows USDC trustline on the saved merchant wallet. */
  merchantUsdcReady: boolean | null;
  /** Charge network from the dash-bar toggle. */
  network: "testnet" | "mainnet";
  onNeedWallet: () => void;
  onNeedUsdcTrustline: () => void;
  onPaymentCreated: (payment: DashboardPayment) => void;
}) {
  const { t, locale } = useLocale();
  const localeTag = LOCALE_TAG[locale];
  const [amount, setAmount] = useState("20");
  // Prefer XLM when USDC readiness is unknown/false; keep USDC selectable with gate.
  const [asset, setAsset] = useState<"USDC" | "XLM">("XLM");
  /** USDC trustline on the selected charge network (not only env default). */
  const [usdcReadyForNetwork, setUsdcReadyForNetwork] = useState<
    boolean | null
  >(null);
  const [description, setDescription] = useState("");
  const [sendToSomeone, setSendToSomeone] = useState(false);
  const [sendMode, setSendMode] = useState<"agenda" | "new">("new");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [saveNewContact, setSaveNewContact] = useState(true);
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
  const [lastShare, setLastShare] = useState<ShareTarget | null>(null);
  const [pricingMode, setPricingMode] = useState<"exact" | "exact_pay">(
    "exact",
  );
  const [allowAbonos, setAllowAbonos] = useState(false);
  const [planCuotas, setPlanCuotas] = useState(false);
  const [installments, setInstallments] = useState("3");
  const [signLink, setSignLink] = useState(false);
  const [treasuryWallet, setTreasuryWallet] = useState<string | null>(null);
  const { fiat, setFiat } = useFiatCurrency();
  const { rates } = useCryptoRates();
  const wallet = useStellarWallet(network);

  const selectedContact = useMemo(
    () => contacts.find((c) => c.id === contactId) ?? null,
    [contacts, contactId],
  );

  const exactPayPreview = useMemo(() => {
    if (pricingMode !== "exact_pay" || !rates) return null;
    const fiatNum = Number(amount.trim().replace(",", "."));
    const rate = rates.rates[asset]?.[fiat];
    if (!(fiatNum > 0) || typeof rate !== "number" || !(rate > 0)) return null;
    const crypto = (fiatNum / rate).toFixed(7);
    return crypto;
  }, [pricingMode, amount, asset, fiat, rates]);

  const newEmailNorm = useMemo(
    () => normalizeQuickEmail(newEmail),
    [newEmail],
  );
  const newPhoneNorm = useMemo(
    () => normalizeQuickPhone(newPhone),
    [newPhone],
  );

  useEffect(() => {
    if (sendToSomeone && contacts.length === 0) setSendMode("new");
  }, [sendToSomeone, contacts.length]);

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

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/v1/health`, { cache: "no-store" });
        const body = (await res.json()) as {
          treasury?: string;
        };
        if (!cancelled && res.ok) {
          if (typeof body.treasury === "string") setTreasuryWallet(body.treasury);
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const resellerBps = resellerOpen ? (pctToBps(resellerPct) ?? 0) : 0;
  const addressValid = isValidStellarPubkey(resellerAddress.trim());
  const usdcReady =
    usdcReadyForNetwork ??
    (network === "testnet" ? merchantUsdcReady : null);
  const usdcBlocked = asset === "USDC" && usdcReady === false;

  useEffect(() => {
    if (!apiKey) {
      setUsdcReadyForNetwork(null);
      return;
    }
    let cancelled = false;
    setUsdcReadyForNetwork(null);
    (async () => {
      try {
        const res = await fetch(
          `${API}/v1/readiness?network=${encodeURIComponent(network)}`,
          {
            headers: { Authorization: `Bearer ${apiKey}` },
            cache: "no-store",
          },
        );
        if (!res.ok || cancelled) return;
        const body = (await res.json()) as {
          merchant?: { usdc?: { canReceive?: boolean } };
        };
        if (!cancelled) {
          setUsdcReadyForNetwork(body.merchant?.usdc?.canReceive ?? null);
        }
      } catch {
        /* Horizon/API down: leave null */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey, network]);

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
          `${API}/v1/readiness?network=${encodeURIComponent(network)}&reseller=${encodeURIComponent(address)}`,
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
    network,
    t,
  ]);

  function selectAsset(next: "USDC" | "XLM") {
    setAsset(next);
    if (next === "USDC" && usdcReady === false) {
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
      let resolvedContactId = selectedContact?.id;
      let shareTarget: ShareTarget | null = null;

      if (sendToSomeone && sendMode === "agenda") {
        if (!selectedContact) {
          throw new Error(t.invoicePickContact);
        }
        shareTarget = {
          name: selectedContact.display_name,
          phone_e164: selectedContact.phone_e164,
          email: selectedContact.email,
        };
      } else if (sendToSomeone && sendMode === "new") {
        const name = newName.trim();
        if (!name) throw new Error(t.invoiceNewNameRequired);
        if (!newPhoneNorm && !newEmailNorm) {
          throw new Error(t.invoiceNewDestRequired);
        }
        if (newPhone.trim() && !newPhoneNorm) {
          throw new Error(t.invoiceQuickDestHint);
        }
        if (newEmail.trim() && !newEmailNorm) {
          throw new Error(t.invoiceQuickDestHint);
        }
        shareTarget = {
          name,
          phone_e164: newPhoneNorm,
          email: newEmailNorm,
        };
        if (saveNewContact && apiKey) {
          const res = await fetch(`${API}/v1/contacts`, {
            method: "POST",
            headers: {
              Authorization: `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              display_name: name,
              phone_e164: newPhoneNorm,
              email: newEmailNorm,
            }),
          });
          const body = (await res.json()) as Contact & { error?: string };
          if (!res.ok) throw new Error(body.error ?? t.contactsSaveFail);
          resolvedContactId = body.id;
          setContacts((prev) => {
            if (prev.some((c) => c.id === body.id)) return prev;
            return [body, ...prev];
          });
        }
      }

      const invoice = shareTarget
        ? {
            contact_id: resolvedContactId,
            recipient_name: shareTarget.name,
            channel: shareTarget.phone_e164
              ? "whatsapp"
              : shareTarget.email
                ? "email"
                : "link",
            source: "panel",
            phone_e164: shareTarget.phone_e164,
            email: shareTarget.email,
          }
        : undefined;
      const nInstallments = Math.round(Number(installments));
      if (planCuotas) {
        if (
          !Number.isInteger(nInstallments) ||
          nInstallments < 2 ||
          nInstallments > 24
        ) {
          throw new Error("Elegí entre 2 y 24 cuotas");
        }
      }
      const cryptoAmount =
        pricingMode === "exact_pay"
          ? null
          : Number(amount.trim().replace(",", ".")).toFixed(7);

      const payload: Record<string, unknown> = {
        asset,
        network,
        scheme: pricingMode,
        allow_abonos: !planCuotas && allowAbonos ? true : undefined,
        plan: planCuotas
          ? { installments: nInstallments }
          : undefined,
        description:
          description.trim() ||
          (shareTarget ? `Cobro a ${shareTarget.name}` : undefined),
        external_user_id: resolvedContactId,
        metadata: invoice ? { invoice } : undefined,
        ...(resellerBps > 0
          ? {
              reseller_fee_bps: resellerBps,
              reseller_address: resellerAddress.trim(),
            }
          : {}),
      };
      if (pricingMode === "exact_pay") {
        payload.fiat_amount = amount.trim().replace(",", ".");
        payload.fiat_currency = fiat;
      } else {
        payload.amount = cryptoAmount;
      }

      if (signLink) {
        if (!merchantWallet || !treasuryWallet) {
          throw new Error(
            "Falta wallet del comercio o tesorería para firmar el enlace",
          );
        }
        if (pricingMode === "exact_pay") {
          throw new Error(
            "Enlace firmado por ahora solo con monto crypto (exact)",
          );
        }
        const amountStr = cryptoAmount!;
        const nonce = generateLinkSigNonce();
        const expires_unix = defaultLinkSigExpiresUnix();
        const reseller =
          resellerBps > 0 && resellerAddress.trim()
            ? resellerAddress.trim()
            : "-";
        const link_sig = {
          v: 2 as const,
          nonce,
          expires_unix,
          treasury: treasuryWallet,
          reseller,
          fee_bps: feeBps,
          amount: amountStr,
        };
        const message = linkSigMessageV2({
          network,
          asset,
          amount: amountStr,
          merchant: merchantWallet,
          treasury: treasuryWallet,
          reseller,
          fee_bps: feeBps,
          expires_unix,
          nonce,
        });
        let address = wallet.address;
        if (!address) {
          address = await wallet.connect();
        }
        if (address !== merchantWallet) {
          throw new Error(
            "Freighter debe estar en la misma G… guardada como destino",
          );
        }
        const { signedMessage } = await wallet.signMessage(message, address);
        payload.link_signature = signedMessage;
        payload.link_sig = link_sig;
      }

      const res = await fetch(`${API}/v1/payment_intents`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.errCreate);
      const payment = body as DashboardPayment & {
        plan_summary?: { next_pay_url?: string | null };
        checkout_url?: string;
        pay_url?: string;
      };
      onPaymentCreated(payment);
      setLastPayment(payment);
      const share =
        payment.plan_summary?.next_pay_url ||
        (body.checkout_url as string) ||
        payment.pay_url ||
        null;
      setLastUrl(share);
      setLastShare(shareTarget);
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
            <label className="flex items-start gap-2 text-sm text-[var(--text)] cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={signLink}
                onChange={(e) => setSignLink(e.target.checked)}
              />
              <span>
                Enlace verificado (firmar con Freighter)
                <span className="block text-xs text-[var(--text-2)]">
                  El pagador ve que tu wallet firmó el destino del cobro
                  (anti-phishing / ecommerce).
                </span>
              </span>
            </label>
            <label className="flex items-start gap-2 text-sm text-[var(--text)] cursor-pointer">
              <input
                type="checkbox"
                className="mt-1"
                checked={planCuotas}
                onChange={(e) => {
                  const on = e.target.checked;
                  setPlanCuotas(on);
                  if (on) setAllowAbonos(false);
                }}
              />
              <span>
                Cobrar en cuotas (opt-in)
                <span className="block text-xs text-[var(--text-2)]">
                  Plan fijo con fechas y avisos de deuda. El pagador no elige el
                  modo: paga el link que armes.
                </span>
              </span>
            </label>
            {planCuotas && (
              <div className="grid gap-2 pl-6">
                <Label htmlFor="installments">Número de cuotas</Label>
                <Input
                  id="installments"
                  inputMode="numeric"
                  value={installments}
                  onChange={(e) => setInstallments(e.target.value)}
                  min={2}
                  max={24}
                />
                <p className="text-xs text-[var(--text-2)]">
                  Mensuales desde hoy (2–24). Cada cuota es un cobro aparte.
                </p>
              </div>
            )}
            <label
              className={`flex items-start gap-2 text-sm cursor-pointer ${
                planCuotas
                  ? "opacity-50 cursor-not-allowed text-[var(--text-2)]"
                  : "text-[var(--text)]"
              }`}
            >
              <input
                type="checkbox"
                className="mt-1"
                checked={allowAbonos}
                disabled={planCuotas}
                onChange={(e) => setAllowAbonos(e.target.checked)}
              />
              <span>
                Aceptar abonos (fiado / layaway)
                <span className="block text-xs text-[var(--text-2)]">
                  El pagador puede pagar en partes; “pagado” solo cuando la suma
                  on-chain cubre el total.
                </span>
              </span>
            </label>
            <Label htmlFor="pricingMode">{t.pricingModeLabel}</Label>
            <select
              id="pricingMode"
              className="asset-select w-full"
              value={pricingMode}
              onChange={(e) =>
                setPricingMode(e.target.value as "exact" | "exact_pay")
              }
            >
              <option value="exact">{t.pricingExact}</option>
              <option value="exact_pay">{t.pricingExactPay}</option>
            </select>
            <p className="text-xs text-[var(--text-2)]">
              {pricingMode === "exact_pay"
                ? t.pricingExactPayHint
                : t.pricingExactHint}
            </p>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="amount">
              {pricingMode === "exact_pay" ? t.fiatAmountLabel : t.amount}
            </Label>
            <div className="amount-row">
              <Input
                id="amount"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={pricingMode === "exact_pay" ? "10000" : "20"}
                required
                className="amount-input"
              />
              {pricingMode === "exact_pay" ? (
                <select
                  aria-label={t.fiatSelectLabel}
                  className="asset-select"
                  value={fiat}
                  onChange={(e) => setFiat(e.target.value as FiatCode)}
                >
                  {FIAT_CODES.map((code) => (
                    <option key={code} value={code}>
                      {code}
                    </option>
                  ))}
                </select>
              ) : (
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
              )}
            </div>
            {pricingMode === "exact_pay" && (
              <div className="grid gap-2">
                <Label htmlFor="settleAsset">{t.settleAssetLabel}</Label>
                <select
                  id="settleAsset"
                  className="asset-select w-full"
                  value={asset}
                  onChange={(e) =>
                    selectAsset(e.target.value as "USDC" | "XLM")
                  }
                >
                  <option value="XLM">XLM</option>
                  <option value="USDC">USDC</option>
                </select>
                {exactPayPreview && (
                  <p className="text-xs text-[var(--text-2)]">
                    {t.exactPayPreview(exactPayPreview, asset)}
                  </p>
                )}
              </div>
            )}
            {pricingMode === "exact" && (
              <FiatEquivalent
                amount={amount}
                asset={asset}
                locale={locale}
                approx={t.fiatApprox}
                unavailable={t.fiatUnavailable}
              />
            )}
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

          <div className="disclosure" data-open={sendToSomeone}>
            <label className="disclosure__toggle">
              <input
                type="checkbox"
                checked={sendToSomeone}
                onChange={(e) => {
                  const on = e.target.checked;
                  setSendToSomeone(on);
                  if (!on) {
                    setContactId("");
                    setNewName("");
                    setNewPhone("");
                    setNewEmail("");
                  } else if (contacts.length === 0) {
                    setSendMode("new");
                  }
                }}
              />
              <span>
                <strong>{t.invoiceSendToggle}</strong>
                <span>{t.invoiceSendHint}</span>
              </span>
            </label>

            {sendToSomeone && (
              <div className="mt-3 grid gap-3">
                <div
                  className="send-mode"
                  role="group"
                  aria-label={t.invoiceSendToggle}
                >
                  <button
                    type="button"
                    className={`send-mode__btn${sendMode === "agenda" ? " is-active" : ""}`}
                    aria-pressed={sendMode === "agenda"}
                    disabled={contacts.length === 0}
                    title={
                      contacts.length === 0
                        ? t.invoiceAgendaEmpty
                        : undefined
                    }
                    onClick={() => setSendMode("agenda")}
                  >
                    {t.invoiceSendAgenda}
                  </button>
                  <button
                    type="button"
                    className={`send-mode__btn${sendMode === "new" ? " is-active" : ""}`}
                    aria-pressed={sendMode === "new"}
                    onClick={() => {
                      setSendMode("new");
                      setContactId("");
                    }}
                  >
                    {t.invoiceSendNew}
                  </button>
                </div>

                {sendMode === "agenda" ? (
                  <div className="grid gap-2">
                    <Label htmlFor="contact">{t.invoiceContact}</Label>
                    <select
                      id="contact"
                      className="asset-select w-full"
                      value={contactId}
                      onChange={(e) => setContactId(e.target.value)}
                      required
                    >
                      <option value="">{t.invoicePickContact}</option>
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
                  </div>
                ) : (
                  <div className="grid gap-3">
                    <div className="grid gap-2">
                      <Label htmlFor="new-contact-name">{t.contactsName}</Label>
                      <Input
                        id="new-contact-name"
                        value={newName}
                        onChange={(e) => setNewName(e.target.value)}
                        placeholder="Juanito"
                        required
                        autoComplete="name"
                      />
                    </div>
                    <div className="grid gap-2 sm:grid-cols-2">
                      <div className="grid gap-2">
                        <Label htmlFor="new-contact-phone">
                          {t.contactsPhone}
                        </Label>
                        <Input
                          id="new-contact-phone"
                          value={newPhone}
                          onChange={(e) => setNewPhone(e.target.value)}
                          placeholder="+569…"
                          inputMode="tel"
                          autoComplete="tel"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="new-contact-email">
                          {t.contactsEmail}
                        </Label>
                        <Input
                          id="new-contact-email"
                          type="email"
                          value={newEmail}
                          onChange={(e) => setNewEmail(e.target.value)}
                          placeholder="mail@…"
                          autoComplete="email"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-[var(--text-2)]">
                      {t.invoiceNewDestHint}
                    </p>
                    <label className="flex items-start gap-2 text-sm text-[var(--text)] cursor-pointer">
                      <input
                        type="checkbox"
                        className="mt-1"
                        checked={saveNewContact}
                        onChange={(e) => setSaveNewContact(e.target.checked)}
                      />
                      <span>{t.invoiceSaveContact}</span>
                    </label>
                  </div>
                )}
              </div>
            )}
          </div>

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
            <p className="flex flex-wrap gap-2 text-xs mb-2 text-[var(--text-2)]">
              <span className="font-medium text-[var(--text)]">
                {t.chargeNetworkBadge(lastPayment?.network ?? network)}
              </span>
              <span>· {t.chargeRouterBadge}</span>
            </p>
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
              {lastShare?.phone_e164 && (
                <Button type="button" variant="default" asChild>
                  <a
                    href={waMeShare(
                      lastShare.phone_e164,
                      t.invoiceWaText(
                        lastShare.name,
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
              {lastShare?.email && lastPayment && (
                <Button
                  type="button"
                  variant="outline"
                  disabled={emailBusy || !apiKey}
                  onClick={() => {
                    void (async () => {
                      if (!apiKey || !lastPayment || !lastShare.email) return;
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
                              to: lastShare.email,
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
                        window.location.href = mailtoShare(
                          lastShare.email,
                          t.invoiceMailSubject(
                            lastPayment.amount,
                            lastPayment.asset,
                          ),
                          t.invoiceWaText(
                            lastShare.name,
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
                          lastShare.email!,
                          t.invoiceMailSubject(
                            lastPayment.amount,
                            lastPayment.asset,
                          ),
                          t.invoiceWaText(
                            lastShare.name,
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
