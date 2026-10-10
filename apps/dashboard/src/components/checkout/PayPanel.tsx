"use client";

import { useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";
import {
  ArrowLeftRight,
  CheckCircle2,
  Loader2,
  QrCode,
  Wallet,
} from "lucide-react";
import { LOCALE_TAG } from "@viapay/prefs";
import { Logo } from "@/components/Logo";
import {
  PollarLoginButton,
  PollarShell,
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

type Method = "wallet" | "qr";
type View = "pay" | "swap";

export function PayPanel({ intent }: { intent: CheckoutIntent }) {
  const { t, locale } = useCheckoutLocale();
  const [view, setView] = useState<View>("pay");
  const [method, setMethod] = useState<Method>("wallet");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState(intent.status);
  const [txHash, setTxHash] = useState(intent.stellar_tx_hash);
  const [abonoAmount, setAbonoAmount] = useState(
    intent.amount_remaining ?? intent.amount,
  );
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const networkRaw = intent.stellar?.network ?? intent.network;
  const network =
    networkRaw === "mainnet" || networkRaw === "local" ? networkRaw : "testnet";
  const walletKit = useStellarWallet(network);
  const [pollar, setPollar] = useState<PollarSession | null>(null);

  const warning = receiveWarning(intent, t);
  const localeTag = LOCALE_TAG[locale];
  const legs = useMemo(() => legsFromIntent(intent), [intent]);
  const routerMode =
    intent.settlement === "router" ||
    Boolean(intent.contract_id ?? intent.stellar?.payment_router);

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
  const splitReady = Boolean(intent.sep7_tx) && !routerMode;

  useEffect(() => {
    if (routerMode && method === "qr") setMethod("wallet");
  }, [routerMode, method]);

  useEffect(() => {
    if (routerMode) return;
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
  }, [sep7, routerMode]);

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
      const payAmt = intent.abonos_enabled
        ? Number(abonoAmount.replace(",", ".")).toFixed(7)
        : undefined;
      const prep = await fetch(`${API}/v1/checkout/${intent.id}/prepare`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          client_secret: intent.client_secret,
          source: payer,
          ...(payAmt ? { amount: payAmt } : {}),
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
          ...(payAmt ? { amount: payAmt } : {}),
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.submitFailed);
      setStatus(body.status);
      setTxHash(body.stellar_tx_hash);
      if (body.amount_remaining) setAbonoAmount(body.amount_remaining);
      if (body.status === "succeeded") redirectIfNeeded(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.genericError);
    } finally {
      setBusy(false);
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

  if (status === "succeeded" || status === "partially_paid") {
    const partial = status === "partially_paid";
    return (
      <PollarShell network={network}>
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
            <h1 className="pay-title mt-4 text-2xl">
              {partial ? "Abono confirmado" : t.paidTitle}
            </h1>
            <p className="mt-2 text-sm" style={{ color: "var(--text-2)" }}>
              {partial
                ? "Pago parcial on-chain. Todavía hay saldo pendiente."
                : "Confirmado on-chain. Las capturas no son prueba."}
            </p>
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

            <div className="mt-4 flex flex-col gap-2 items-center">
              <a
                className="text-sm font-medium"
                style={{ color: "var(--primary)" }}
                href={`/r/${intent.id}`}
              >
                Abrir recibo verificable
              </a>
              <a
                className="text-xs opacity-70"
                href={`${process.env.NEXT_PUBLIC_VIAPAY_API_URL || "https://viapay-api.vercel.app"}/v1/parity/${intent.id}`}
                target="_blank"
                rel="noreferrer"
              >
                rail-parity
              </a>
            </div>

            {txHash && (
              <div className="mt-6 text-left">
                <p className="via-label" style={{ color: "var(--text-2)" }}>
                  {t.txLabel}
                </p>
                <p className="mono mt-1 break-all">{txHash}</p>
                {network !== "local" && (
                  <div className="mt-2 flex flex-col gap-1.5 items-start">
                    <a
                      className="text-sm font-medium"
                      style={{ color: "var(--primary)" }}
                      href={`https://stellar.expert/explorer/${
                        network === "mainnet" ? "public" : "testnet"
                      }/tx/${txHash}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {t.viewOnExpert}
                    </a>
                    {routerMode && (
                      <a
                        className="text-sm font-medium"
                        style={{ color: "var(--primary)" }}
                        href={`https://stellar.expert/explorer/${
                          network === "mainnet" ? "public" : "testnet"
                        }/tx/${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.viewPaidEvent}
                      </a>
                    )}
                    {routerMode && (
                      <a
                        className="text-sm font-medium"
                        style={{ color: "var(--primary)" }}
                        href={`${API}/v1/verify?network=${
                          network === "mainnet" ? "mainnet" : "testnet"
                        }&tx_hash=${txHash}`}
                        target="_blank"
                        rel="noreferrer"
                      >
                        {t.verifyRail}
                      </a>
                    )}
                    {routerMode &&
                      (intent.contract_id ??
                        intent.stellar?.payment_router) && (
                        <a
                          className="text-sm font-medium"
                          style={{ color: "var(--primary)" }}
                          href={`https://stellar.expert/explorer/${
                            network === "mainnet" ? "public" : "testnet"
                          }/contract/${
                            intent.contract_id ??
                            intent.stellar?.payment_router
                          }`}
                          target="_blank"
                          rel="noreferrer"
                        >
                          {t.viewRouterContract}
                        </a>
                      )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </PollarShell>
    );
  }

  const canPay = Boolean(walletKit.address || pollar);

  return (
    <PollarShell network={network}>
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
            <span className="pay-chip-row">
              <span className="pay-chip">
                {network === "mainnet"
                  ? "Stellar mainnet"
                  : `Stellar ${network}`}
              </span>
              <span className="pay-chip" title="Solo Paid on-chain confirma">
                sin capturas
              </span>
              {routerMode && (
                (intent.contract_id ?? intent.stellar?.payment_router) ? (
                  <a
                    className="pay-chip pay-chip--router"
                    href={`https://stellar.expert/explorer/${
                      network === "mainnet" ? "public" : "testnet"
                    }/contract/${intent.contract_id ?? intent.stellar?.payment_router}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    {t.routerChip}
                  </a>
                ) : (
                  <span className="pay-chip pay-chip--router">
                    {t.routerChip}
                  </span>
                )
              )}
            </span>
          </div>

          <p className="via-label" style={{ color: "var(--text-2)" }}>
            {t.totalLabel}
          </p>
          {intent.link_sig_status === "verified" ||
          intent.link_verified === true ? (
            <p className="mt-2 text-xs" style={{ color: "var(--success)" }}>
              Comercio verificado: destino {intent.merchant_wallet.slice(0, 4)}…
              {intent.merchant_wallet.slice(-4)} firmó este cobro.
            </p>
          ) : intent.link_sig_status === "expired" ? (
            <p className="mt-2 text-xs" style={{ color: "var(--text-2)" }}>
              Firma del enlace vencida — el destino ya no está verificado.
            </p>
          ) : intent.link_sig_status === "invalid" ? (
            <p className="mt-2 text-xs" style={{ color: "var(--text-2)" }}>
              Firma del enlace no válida.
            </p>
          ) : null}
          {intent.plan_enabled && intent.plan_summary?.role === "parent" && (
            <div className="mt-2 space-y-2">
              <p className="text-xs" style={{ color: "var(--text-2)" }}>
                Plan en cuotas · {intent.plan_summary.paid_count}/
                {intent.plan_summary.installment_count} pagadas
                {intent.plan_summary.overdue_count > 0
                  ? ` · ${intent.plan_summary.overdue_count} vencida(s)`
                  : ""}
              </p>
              {intent.plan_summary.next_pay_url && status !== "succeeded" && (
                <a
                  className="inline-block text-sm underline"
                  href={intent.plan_summary.next_pay_url}
                  style={{ color: "var(--text)" }}
                >
                  Pagar próxima cuota
                </a>
              )}
            </div>
          )}
          {intent.plan_enabled &&
            intent.plan_summary?.role === "child" &&
            intent.plan_summary.installment_index != null && (
              <p className="mt-2 text-xs" style={{ color: "var(--text-2)" }}>
                Cuota {intent.plan_summary.installment_index} de{" "}
                {intent.plan_summary.installment_count}
              </p>
            )}
          <p className="pay-amount pay-amount--hero mt-2">
            {totalAmount(
              intent.abonos_enabled && intent.amount_remaining
                ? intent.amount_remaining
                : intent.amount,
              localeTag,
            )}
            <span className="pay-amount__asset">{intent.asset}</span>
          </p>
          {intent.abonos_enabled && (
            <div className="mt-2 space-y-2">
              <p className="text-xs" style={{ color: "var(--text-2)" }}>
                Abonos · total {totalAmount(intent.amount, localeTag)} · pagado{" "}
                {totalAmount(intent.amount_paid ?? "0", localeTag)} · resta{" "}
                {totalAmount(
                  intent.amount_remaining ?? intent.amount,
                  localeTag,
                )}
                {status === "partially_paid" ? " · en curso" : ""}
              </p>
              <label className="block text-xs text-[var(--text-2)]">
                Monto de este abono
                <input
                  className="mt-1 w-full rounded border border-[var(--border)] bg-[var(--surface)] px-2 py-1.5 text-sm text-[var(--text)]"
                  value={abonoAmount}
                  onChange={(e) => setAbonoAmount(e.target.value)}
                  inputMode="decimal"
                />
              </label>
            </div>
          )}
          <div className="pay-fiat">
            <FiatEquivalent
              amount={
                intent.abonos_enabled ? abonoAmount || intent.amount : intent.amount
              }
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

          {warning && <p className="pay-notice mt-4">{warning}</p>}

          <section
            className="mt-5 rounded-[var(--r-lg)] px-3 py-3 text-xs"
            style={{
              border: "1px solid var(--border)",
              color: "var(--text-2)",
            }}
            aria-label="Checklist del cobro"
          >
            <p
              className="font-medium"
              style={{ color: "var(--text)" }}
            >
              Antes de firmar, revisá
            </p>
            <ul className="mt-2 list-disc space-y-1 pl-4">
              <li>
                Cobrado por{" "}
                <span className="font-mono">
                  {intent.merchant_wallet.slice(0, 4)}…
                  {intent.merchant_wallet.slice(-4)}
                </span>
                {intent.link_sig_status === "verified" ||
                intent.link_verified === true
                  ? " · firma del comercio OK"
                  : intent.link_sig_status === "invalid"
                    ? " · ⚠ firma inválida (link alterado)"
                    : intent.link_sig_status === "expired"
                      ? " · firma vencida"
                      : " · sin firma de enlace"}
              </li>
              <li>
                Total{" "}
                {totalAmount(
                  intent.abonos_enabled && intent.amount_remaining
                    ? intent.amount_remaining
                    : intent.amount,
                  localeTag,
                )}{" "}
                {intent.asset}
                {intent.fee_amount
                  ? ` · fee ${intent.fee_amount} · neto comercio ${intent.net_amount}`
                  : ""}
              </li>
              <li>
                Red{" "}
                {network === "mainnet" ? "mainnet" : network}
                {" · "}
                {status === "succeeded"
                  ? "ya pagado"
                  : intent.plan_enabled &&
                      intent.plan_summary?.role === "child"
                    ? `cuota ${intent.plan_summary.installment_index}/${intent.plan_summary.installment_count}`
                    : intent.abonos_enabled
                      ? "acepta abonos"
                      : "un pago"}
              </li>
            </ul>
          </section>

          {intent.plan_enabled &&
          intent.plan_summary?.role === "parent" &&
          status !== "succeeded" ? (
            <p className="mt-6 text-sm" style={{ color: "var(--text-2)" }}>
              Este link es el plan completo. Abrí “Pagar próxima cuota” para
              liquidar on-chain.
            </p>
          ) : view === "swap" ? (
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
              <div
                className="pay-tabs mt-6"
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
                    network={network}
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
              ) : (
                <div className="mt-5 space-y-4">
                  {routerMode ? (
                    <>
                      <p className="pay-notice">{t.qrRouterOnly}</p>
                      <button
                        type="button"
                        className="act act--primary"
                        onClick={() => setMethod("wallet")}
                      >
                        <Wallet className="h-4 w-4" aria-hidden="true" />
                        {t.walletTab}
                      </button>
                    </>
                  ) : (
                    <>
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
                                e instanceof Error
                                  ? e.message
                                  : t.genericError,
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
                    </>
                  )}
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
    </PollarShell>
  );
}
