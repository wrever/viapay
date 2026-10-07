"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeftRight,
  Bot,
  CheckCircle2,
  Loader2,
  QrCode,
  Wallet,
} from "lucide-react";
import { LOCALE_TAG } from "@viapay/prefs";
import { Logo } from "@/components/Logo";
import {
  PollarLoginButton,
  type PollarSession,
} from "@/components/checkout/PollarShell";
import { CheckoutSwap } from "@/components/checkout/CheckoutSwap";
import { SplitLegsList } from "@/components/checkout/SplitLegsList";
import { legsFromIntent } from "@/lib/checkout/breakdown";
import { buildSep7PayUri } from "@/lib/checkout/sep7";
import type { CheckoutIntent } from "@/lib/checkout/types";
import { useStellarWallet } from "@/lib/checkout/wallet";
import {
  CheckoutSiteControls,
  useCheckoutLocale,
} from "@/lib/checkout/i18n";
import type { Messages } from "@/lib/checkout/messages";
import { API } from "@/lib/config";
import { FiatEquivalent } from "@/components/FiatEquivalent";
import { FiatCurrencySelectBare } from "@/components/FiatCurrencySelect";

function totalAmount(value: string, localeTag: string): string {
  return Number(value).toLocaleString(localeTag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function receiveWarning(intent: CheckoutIntent, t: Messages): string | null {
  const receive = intent.stellar?.receive;
  if (!receive) return null;
  if (!receive.merchant.exists) return t.warnMerchantMissing;
  if (!receive.merchant.canReceive) return t.warnMerchantAsset(intent.asset);
  if (!receive.treasury.exists || !receive.treasury.canReceive) {
    return t.warnTreasuryAsset(intent.asset);
  }
  if (
    receive.reseller &&
    (!receive.reseller.exists || !receive.reseller.canReceive)
  ) {
    return t.warnResellerAsset(intent.asset);
  }
  return null;
}

function x402UrlFor(intent: CheckoutIntent): string {
  if (intent.x402_url) return intent.x402_url;
  const url = new URL(`${API}/v1/x402/${intent.id}`);
  url.searchParams.set("client_secret", intent.client_secret);
  return url.toString();
}

type Method = "wallet" | "qr" | "agent";
type View = "pay" | "swap";

export function PayPanel({ intent }: { intent: CheckoutIntent }) {
  const { t, locale } = useCheckoutLocale();
  const [view, setView] = useState<View>("pay");
  const [method, setMethod] = useState<Method>("wallet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(intent.status);
  const [txHash, setTxHash] = useState(intent.stellar_tx_hash);
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const network =
    intent.stellar?.network === "mainnet" || intent.stellar?.network === "local"
      ? intent.stellar.network
      : "testnet";
  const walletKit = useStellarWallet(network);
  const [pollar, setPollar] = useState<PollarSession | null>(null);

  const warning = receiveWarning(intent, t);
  const localeTag = LOCALE_TAG[locale];
  const legs = useMemo(() => legsFromIntent(intent), [intent]);
  const agentUrl = useMemo(() => x402UrlFor(intent), [intent]);
  const agentCurl = useMemo(
    () => `curl -i "${agentUrl}"`,
    [agentUrl],
  );

  const sep7 = useMemo(() => {
    if (intent.sep7_tx) return intent.sep7_tx;
    return buildSep7PayUri({
      destination: intent.merchant_wallet,
      amount: intent.amount,
      asset: intent.asset,
      assetIssuer: intent.stellar?.asset_issuer,
      memo: intent.id,
    });
  }, [intent]);
  const splitReady = Boolean(intent.sep7_tx);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const url = await QRCode.toDataURL(sep7, {
          errorCorrectionLevel: "L",
          margin: 1,
          width: 320,
          color: { dark: "#0B1020", light: "#ffffff" },
        });
        if (!cancelled) setQrDataUrl(url);
      } catch {
        if (!cancelled) setQrDataUrl(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [sep7]);

  function redirectIfNeeded(next: {
    success_url?: string | null;
    stellar_tx_hash?: string | null;
  }) {
    const targetUrl = next.success_url ?? intent.success_url;
    if (!targetUrl) return;
    const target = new URL(String(targetUrl));
    target.searchParams.set("payment_intent", intent.id);
    if (next.stellar_tx_hash) {
      target.searchParams.set("tx_hash", String(next.stellar_tx_hash));
    }
    window.setTimeout(() => {
      window.location.assign(target.toString());
    }, 1600);
  }

  async function refreshStatus() {
    const res = await fetch(
      `${API}/v1/checkout/${intent.id}?client_secret=${encodeURIComponent(
        intent.client_secret,
      )}`,
      { cache: "no-store" },
    );
    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? t.checkFailed);
    setStatus(body.status);
    setTxHash(body.stellar_tx_hash);
    if (body.status === "succeeded") redirectIfNeeded(body);
    return body.status as string;
  }

  async function payWithWallet() {
    const payer = pollar?.address ?? walletKit.address;
    if (!payer) return;
    setBusy(true);
    setError(null);
    try {
      const prep = await fetch(`${API}/v1/checkout/${intent.id}/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_secret: intent.client_secret,
          source: payer,
        }),
      });
      const prepared = await prep.json();
      if (!prep.ok) throw new Error(prepared.error ?? t.prepareFailed);

      const signed = pollar
        ? await pollar.sign(prepared.xdr)
        : await walletKit.sign(prepared.xdr, prepared.network_passphrase);
      const res = await fetch(`${API}/v1/checkout/${intent.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_secret: intent.client_secret,
          signed_xdr: signed,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.submitFailed);
      setStatus(body.status);
      setTxHash(body.stellar_tx_hash);
      redirectIfNeeded(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setBusy(false);
    }
  }

  async function copyAgentUrl() {
    try {
      await navigator.clipboard.writeText(agentUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setError(t.genericError);
    }
  }

  useEffect(() => {
    if (method !== "qr" || status === "succeeded") return;
    const timer = window.setInterval(() => {
      refreshStatus().catch(() => undefined);
    }, 4000);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [method, status, intent.id, intent.client_secret, locale]);

  if (status === "succeeded") {
    return (
      <>
        <div className="prefs-bar">
          <CheckoutSiteControls />
        </div>
        <div className="pay-card seal">
          <Logo variant="icon" width={208} className="pay-card__mark" alt="" />
          <div className="pay-card__body text-center">
            <CheckCircle2
              className="mx-auto h-12 w-12"
              style={{ color: "var(--success)" }}
              aria-hidden="true"
            />
            <h1 className="pay-title mt-4 text-2xl">{t.paidTitle}</h1>
            <p className="pay-amount pay-amount--hero mt-3">
              {totalAmount(intent.amount, localeTag)}
              <span className="pay-amount__asset">{intent.asset}</span>
            </p>
            <div className="pay-fiat">
              <FiatEquivalent
                amount={intent.amount}
                asset={intent.asset}
                locale={locale}
                approx={t.fiatApprox}
                unavailable={t.fiatUnavailable}
                className="fiat-hint fiat-hint--pay"
              />
              <FiatCurrencySelectBare
                label={t.fiatSelectLabel}
                locale={locale}
              />
            </div>

            <div className="mt-5 text-left">
              <SplitLegsList
                legs={legs}
                asset={intent.asset}
                localeTag={localeTag}
                t={t}
                variant="receipt"
                network={network}
              />
            </div>

            {txHash && (
              <div className="mt-6 text-left">
                <p className="via-label" style={{ color: "var(--text-2)" }}>
                  {t.txLabel}
                </p>
                <p className="mono mt-1">{txHash}</p>
                {network !== "local" && (
                  <a
                    className="mt-2 inline-block text-sm font-medium"
                    style={{ color: "var(--primary)" }}
                    href={`https://stellar.expert/explorer/${
                      network === "mainnet" ? "public" : "testnet"
                    }/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.viewOnExpert}
                  </a>
                )}
              </div>
            )}
          </div>
        </div>
      </>
    );
  }

  const canPay = Boolean(walletKit.address || pollar);

  return (
    <>
      <div className="prefs-bar">
        <CheckoutSiteControls />
      </div>
      <div className="pay-card">
        <Logo variant="icon" width={208} className="pay-card__mark" alt="" />
        <div className="pay-card__body">
          <div className="mb-6 flex items-center justify-between gap-3">
            <span className="brand-lockup">
              <Logo variant="horizontal" width={104} />
            </span>
            <span className="pay-chip">
              {network === "mainnet" ? "Stellar" : `Stellar ${network}`}
            </span>
          </div>

          <p className="via-label" style={{ color: "var(--text-2)" }}>
            {t.totalLabel}
          </p>
          <p className="pay-amount pay-amount--hero mt-2">
            {totalAmount(intent.amount, localeTag)}
            <span className="pay-amount__asset">{intent.asset}</span>
          </p>
          <div className="pay-fiat">
            <FiatEquivalent
              amount={intent.amount}
              asset={intent.asset}
              locale={locale}
              approx={t.fiatApprox}
              unavailable={t.fiatUnavailable}
              className="fiat-hint fiat-hint--pay"
            />
            <FiatCurrencySelectBare
              label={t.fiatSelectLabel}
              locale={locale}
            />
          </div>
          {intent.description && (
            <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>
              {intent.description}
            </p>
          )}

          <div className="mt-4">
            <SplitLegsList
              legs={legs}
              asset={intent.asset}
              localeTag={localeTag}
              t={t}
              variant="preview"
              network={network}
            />
          </div>

          {warning && <p className="pay-notice mt-4">{warning}</p>}

          {view === "swap" ? (
            <div className="mt-6 space-y-4">
              <CheckoutSwap
                t={t}
                network={network}
                payAsset={intent.asset}
              />
              <button
                type="button"
                onClick={() => setView("pay")}
                className="act act--ghost"
              >
                {t.backToPay}
              </button>
            </div>
          ) : (
            <>
              <p className="pay-doors mt-5">{t.doorsHint}</p>
              <div
                className="pay-tabs pay-tabs--three mt-3"
                role="tablist"
                aria-label={t.methodAria}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "wallet"}
                  onClick={() => setMethod("wallet")}
                  className="pay-tabs__tab"
                >
                  <Wallet className="h-4 w-4" aria-hidden="true" /> {t.walletTab}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "qr"}
                  onClick={() => setMethod("qr")}
                  className="pay-tabs__tab"
                >
                  <QrCode className="h-4 w-4" aria-hidden="true" /> {t.qrTab}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={method === "agent"}
                  onClick={() => setMethod("agent")}
                  className="pay-tabs__tab"
                >
                  <Bot className="h-4 w-4" aria-hidden="true" /> {t.agentTab}
                </button>
              </div>

              {method === "wallet" ? (
                <div className="mt-5 space-y-3">
                  {!canPay ? (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => {
                        setBusy(true);
                        setError(null);
                        walletKit
                          .connect()
                          .catch((e: unknown) => {
                            setError(
                              e instanceof Error ? e.message : t.connectFailed,
                            );
                          })
                          .finally(() => setBusy(false));
                      }}
                      className="act act--ghost"
                    >
                      <Wallet
                        className="h-4 w-4"
                        style={{ color: "var(--primary)" }}
                        aria-hidden="true"
                      />
                      {busy ? t.openingWallets : t.connectWallet}
                    </button>
                  ) : (
                    <div
                      className="rounded-[var(--r-lg)] px-4 py-3"
                      style={{ background: "var(--surface)" }}
                    >
                      <p
                        className="via-label"
                        style={{ color: "var(--text-2)" }}
                      >
                        {walletKit.address
                          ? t.walletConnected
                          : t.walletEmbedded}
                      </p>
                      <p className="mono mt-1">
                        {walletKit.address ?? pollar?.address}
                      </p>
                      {walletKit.address && (
                        <button
                          type="button"
                          className="mt-2 text-xs underline-offset-2 hover:underline"
                          style={{ color: "var(--text-2)" }}
                          onClick={() => {
                            walletKit
                              .disconnect()
                              .catch(() => walletKit.setError(null));
                          }}
                        >
                          {t.disconnect}
                        </button>
                      )}
                    </div>
                  )}

                  <PollarLoginButton
                    onSession={(session) =>
                      setPollar((prev) =>
                        prev?.address === session.address ? prev : session,
                      )
                    }
                  />

                  <button
                    type="button"
                    disabled={busy || !canPay}
                    onClick={() => payWithWallet()}
                    className="act act--primary"
                  >
                    {busy ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />{" "}
                        {t.signing}
                      </>
                    ) : (
                      t.signAndPay
                    )}
                  </button>
                  <p
                    className="text-center text-xs"
                    style={{ color: "var(--text-2)" }}
                  >
                    {t.walletHint}
                    {intent.asset === "USDC" ? t.walletHintUsdc : ""}
                  </p>
                </div>
              ) : method === "qr" ? (
                <div className="mt-5 space-y-4">
                  <div
                    className="mx-auto w-fit rounded-[var(--r-lg)] p-3"
                    style={{
                      background: "#ffffff",
                      border: "1px solid var(--border)",
                    }}
                  >
                    {qrDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={qrDataUrl}
                        alt={t.qrAlt}
                        width={240}
                        height={240}
                        className="block"
                      />
                    ) : (
                      <div
                        className="flex h-[240px] w-[240px] items-center justify-center text-sm"
                        style={{ color: "var(--text-2)" }}
                      >
                        {t.qrGenerating}
                      </div>
                    )}
                  </div>
                  <p
                    className="text-center text-sm"
                    style={{ color: "var(--text-2)" }}
                  >
                    {splitReady ? (
                      t.qrReady
                    ) : (
                      <>
                        {t.qrFallback}{" "}
                        {intent.stellar?.sep7_error ?? t.qrFallbackError}
                      </>
                    )}
                  </p>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      setBusy(true);
                      setError(null);
                      refreshStatus()
                        .then((next) => {
                          if (next !== "succeeded") setError(t.notSeenYet);
                        })
                        .catch((e: unknown) => {
                          setError(
                            e instanceof Error ? e.message : t.genericError,
                          );
                        })
                        .finally(() => setBusy(false));
                    }}
                    className="act act--primary"
                  >
                    {busy ? (
                      <>
                        <Loader2
                          className="h-4 w-4 animate-spin"
                          aria-hidden="true"
                        />{" "}
                        {t.checking}
                      </>
                    ) : (
                      t.checkPayment
                    )}
                  </button>
                  <p
                    className="text-center text-xs"
                    style={{ color: "var(--text-2)" }}
                  >
                    {t.qrHint}
                  </p>
                </div>
              ) : (
                <div className="mt-5 space-y-3">
                  <h2 className="pay-agent__title">{t.agentTitle}</h2>
                  <p className="pay-agent__body">{t.agentBody}</p>
                  <p className="via-label" style={{ color: "var(--text-2)" }}>
                    {t.agentUrlLabel}
                  </p>
                  <p className="pay-agent__url mono">{agentUrl}</p>
                  <button
                    type="button"
                    className="act act--ghost"
                    onClick={() => {
                      void copyAgentUrl();
                    }}
                  >
                    {copied ? t.agentCopied : t.agentCopy}
                  </button>
                  <p className="via-label mt-2" style={{ color: "var(--text-2)" }}>
                    {t.agentCurlLabel}
                  </p>
                  <pre className="pay-agent__curl">{agentCurl}</pre>
                  <p className="text-xs" style={{ color: "var(--text-2)" }}>
                    {t.agentDemoHint}
                  </p>
                </div>
              )}

              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView("swap");
                }}
                className="pay-swap-link mt-5"
              >
                <ArrowLeftRight className="h-3.5 w-3.5" aria-hidden="true" />
                {t.swapTokens}
              </button>
            </>
          )}

          {error && (
            <p
              className="mt-4 text-center text-sm font-medium"
              style={{ color: "var(--error)" }}
              role="alert"
            >
              {error}
            </p>
          )}

          {intent.cancel_url && (
            <a
              href={intent.cancel_url}
              className="mt-4 block text-center text-sm underline-offset-2 hover:underline"
              style={{ color: "var(--text-2)" }}
            >
              {t.cancel}
            </a>
          )}
        </div>
      </div>
    </>
  );
}
