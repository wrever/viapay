"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { formatBps } from "@viapay/shared";
import {
  ArrowLeftRight,
  BarChart3,
  Bell,
  History,
  LayoutDashboard,
  PlusCircle,
  Users,
  Wallet,
} from "lucide-react";
import { ActivityFeed } from "@/components/ActivityFeed";
import { CreatePaymentLink } from "@/components/CreatePaymentLink";
import { ContactsSection } from "@/components/ContactsSection";
import { WhatsAppAssistantCard } from "@/components/WhatsAppAssistantCard";
import { Logo } from "@/components/Logo";
import { IntegrationPanel } from "@/components/IntegrationPanel";
import { NetworkToggle } from "@/components/NetworkToggle";
import { OverviewPanel } from "@/components/OverviewPanel";
import { PaymentHistory } from "@/components/PaymentHistory";
import { PaymentStatsDetail } from "@/components/PaymentStatsDetail";
import { SwapPanel } from "@/components/SwapPanel";
import { TrustlineGateModal } from "@/components/TrustlineGateModal";
import { UserMenu } from "@/components/UserMenu";
import { WalletGateModal } from "@/components/WalletGateModal";
import { WebhooksSection } from "@/components/WebhooksSection";
import { Button } from "@/components/ui/button";
import {
  activityAttentionCount,
  buildActivityFeed,
  type WebhookDeliveryRow,
} from "@/lib/activity";
import type { DashboardPayment } from "@/lib/payment-types";
import type { Readiness } from "@/lib/readiness";
import { API } from "@/lib/config";
import { SiteControls, useLocale } from "@/lib/i18n";

const SECTIONS = [
  "resumen",
  "cobros",
  "contactos",
  "historial",
  "estadisticas",
  "swap",
  "integracion",
  "notificaciones",
] as const;
type DashSection = (typeof SECTIONS)[number];
const DEFAULT_SECTION: DashSection = "resumen";
const WALLET_REQUIRED_SECTION: DashSection = "integracion";

function parseSection(raw: string | null | undefined): DashSection | null {
  const value = (raw ?? "").replace(/^#/, "").toLowerCase().trim();
  return (SECTIONS as readonly string[]).includes(value)
    ? (value as DashSection)
    : null;
}

function readSectionFromLocation(): DashSection {
  if (typeof window === "undefined") return DEFAULT_SECTION;
  const params = new URLSearchParams(window.location.search);
  const fromTab = parseSection(params.get("tab"));
  if (fromTab) return fromTab;
  const fromHash = parseSection(window.location.hash);
  if (fromHash) return fromHash;
  return DEFAULT_SECTION;
}

function writeSectionToLocation(next: DashSection) {
  const url = new URL(window.location.href);
  url.searchParams.set("tab", next);
  url.hash = next;
  const nextUrl = `${url.pathname}?tab=${encodeURIComponent(next)}#${next}`;
  if (
    `${window.location.pathname}${window.location.search}${window.location.hash}` !==
    nextUrl
  ) {
    window.history.replaceState(null, "", nextUrl);
  }
}

export function DashboardHome({
  sessionName,
  sessionEmail,
  apiKey,
  payments: initialPayments,
  readiness,
  feeBps,
}: {
  sessionName: string;
  sessionEmail: string;
  apiKey: string | null;
  payments: DashboardPayment[];
  readiness: Readiness | null;
  feeBps: number;
}) {
  const { t } = useLocale();
  const fee = formatBps(feeBps);
  const network = readiness?.network ?? "testnet";
  const firstName = sessionName.split(/\s+/)[0] || sessionName;
  const [payments, setPayments] = useState(initialPayments);
  const [section, setSection] = useState<DashSection>(DEFAULT_SECTION);
  const [chargeNetwork, setChargeNetwork] = useState<"testnet" | "mainnet">(
    "testnet",
  );
  const [mainnetReady, setMainnetReady] = useState(false);
  const [merchantWallet, setMerchantWallet] = useState<string | null>(
    readiness?.merchant_wallet ?? null,
  );
  const [merchantUsdcReady, setMerchantUsdcReady] = useState<boolean | null>(
    readiness?.merchant?.usdc?.canReceive ?? null,
  );
  const [trustlineGateOpen, setTrustlineGateOpen] = useState(false);
  const [noticesOpen, setNoticesOpen] = useState(false);
  const [deliveries, setDeliveries] = useState<WebhookDeliveryRow[]>([]);
  const bellRef = useRef<HTMLDivElement | null>(null);

  const hasWallet = Boolean(merchantWallet);
  const walletLocked = Boolean(apiKey) && !hasWallet;
  const merchantWalletRef = useRef(merchantWallet);
  merchantWalletRef.current = merchantWallet;

  const refreshActivity = useCallback(async () => {
    if (!apiKey) return;
    try {
      const headers = { Authorization: `Bearer ${apiKey}` };
      const [pRes, dRes] = await Promise.all([
        fetch(`${API}/v1/payment_intents`, {
          headers,
          cache: "no-store",
        }),
        fetch(`${API}/v1/webhook_deliveries`, {
          headers,
          cache: "no-store",
        }),
      ]);
      if (pRes.ok) {
        const body = (await pRes.json()) as { data?: DashboardPayment[] };
        setPayments(body.data ?? []);
      }
      if (dRes.ok) {
        const body = (await dRes.json()) as { data?: WebhookDeliveryRow[] };
        setDeliveries(body.data ?? []);
      }
    } catch {
      /* keep last known */
    }
  }, [apiKey]);

  useEffect(() => {
    if (!apiKey || walletLocked) return;
    void refreshActivity();
    const id = window.setInterval(() => void refreshActivity(), 20_000);
    return () => window.clearInterval(id);
  }, [apiKey, walletLocked, refreshActivity]);

  useEffect(() => {
    if (!noticesOpen) return;
    void refreshActivity();
    const onDoc = (e: MouseEvent) => {
      if (!bellRef.current?.contains(e.target as Node)) {
        setNoticesOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setNoticesOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [noticesOpen, refreshActivity]);

  const refreshMerchantUsdc = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await fetch(`${API}/v1/readiness`, {
        headers: { Authorization: `Bearer ${apiKey}` },
        cache: "no-store",
      });
      if (!res.ok) return;
      const body = (await res.json()) as Readiness;
      setMerchantUsdcReady(body.merchant?.usdc?.canReceive ?? null);
      if (body.merchant_wallet) setMerchantWallet(body.merchant_wallet);
    } catch {
      // Horizon/API down: leave last known readiness.
    }
  }, [apiKey]);

  const afterWalletSaved = useCallback((_address: string) => {
    // Full reload so nav unlock, readiness, and Integración reflect the new wallet.
    window.location.assign("/app?tab=integracion#integracion");
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/v1/health`, { cache: "no-store" });
        const body = (await res.json()) as {
          networks?: { mainnet?: { ready?: boolean } };
        };
        if (!cancelled && res.ok) {
          setMainnetReady(Boolean(body.networks?.mainnet?.ready));
        }
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!mainnetReady && chargeNetwork === "mainnet") {
      setChargeNetwork("testnet");
    }
  }, [mainnetReady, chargeNetwork]);

  useEffect(() => {
    const initial = readSectionFromLocation();
    const lockedBoot = Boolean(apiKey) && !readiness?.merchant_wallet;
    const next = lockedBoot ? WALLET_REQUIRED_SECTION : initial;
    setSection(next);
    writeSectionToLocation(next);

    const sync = () => {
      const fromUrl = readSectionFromLocation();
      if (Boolean(apiKey) && !merchantWalletRef.current) {
        if (fromUrl !== WALLET_REQUIRED_SECTION) {
          setSection(WALLET_REQUIRED_SECTION);
          writeSectionToLocation(WALLET_REQUIRED_SECTION);
          return;
        }
        setSection(WALLET_REQUIRED_SECTION);
        return;
      }
      setSection(fromUrl);
    };
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, [apiKey, readiness?.merchant_wallet]);

  useEffect(() => {
    if (!walletLocked) return;
    if (section !== WALLET_REQUIRED_SECTION) {
      setSection(WALLET_REQUIRED_SECTION);
      writeSectionToLocation(WALLET_REQUIRED_SECTION);
    }
  }, [walletLocked, section]);

  const go = useCallback(
    (next: DashSection) => {
      if (walletLocked && next !== WALLET_REQUIRED_SECTION) {
        setSection(WALLET_REQUIRED_SECTION);
        writeSectionToLocation(WALLET_REQUIRED_SECTION);
        setNoticesOpen(false);
        return;
      }
      setSection(next);
      writeSectionToLocation(next);
      setNoticesOpen(false);
    },
    [walletLocked],
  );

  const tryGoCobros = useCallback(() => {
    if (!hasWallet) {
      go(WALLET_REQUIRED_SECTION);
      return;
    }
    go("cobros");
  }, [go, hasWallet]);

  const received = useMemo(
    () => payments.filter((p) => p.status === "succeeded"),
    [payments],
  );
  const attentionCount = useMemo(
    () => activityAttentionCount(payments),
    [payments],
  );
  const activityLabels = useMemo(
    () => ({
      paid: t.activityPaid,
      partial: t.activityPartial,
      pending: t.activityPending,
      canceled: t.activityCanceled,
      webhookOk: t.activityWebhookOk,
      webhookFail: t.activityWebhookFail,
      webhookAttempts: t.webhooksAttempts,
      noRecipient: t.activityNoRecipient,
    }),
    [t],
  );
  const activityItems = useMemo(
    () => buildActivityFeed(payments, deliveries, activityLabels, 30),
    [payments, deliveries, activityLabels],
  );
  const bellItems = useMemo(() => activityItems.slice(0, 6), [activityItems]);

  const navItems: {
    id: DashSection;
    label: string;
    icon: typeof PlusCircle;
  }[] = [
    { id: "resumen", label: t.navResumen, icon: LayoutDashboard },
    { id: "cobros", label: t.navCobros, icon: PlusCircle },
    { id: "contactos", label: t.navContactos, icon: Users },
    { id: "historial", label: t.navHistorial, icon: History },
    { id: "estadisticas", label: t.navEstadisticas, icon: BarChart3 },
    { id: "swap", label: t.navSwap, icon: ArrowLeftRight },
    { id: "integracion", label: t.navIntegracion, icon: Wallet },
    { id: "notificaciones", label: t.navNotificaciones, icon: Bell },
  ];

  return (
    <div className="dash">
      <header className="dash-bar">
        <div className="dash-bar__inner">
          <Link href="/app" className="brand-lockup" aria-label={t.homeAria}>
            <Logo variant="horizontal" width={112} alt="" />
          </Link>
          <div className="dash-bar__user">
            {!walletLocked && (
              <NetworkToggle
                value={chargeNetwork}
                onChange={setChargeNetwork}
                mainnetReady={mainnetReady}
              />
            )}
            <div className="notices-bell" ref={bellRef}>
              <button
                type="button"
                className="notices-bell__btn"
                aria-label={t.noticesBellAria}
                aria-expanded={noticesOpen}
                aria-haspopup="menu"
                onClick={() => {
                  if (walletLocked) return;
                  setNoticesOpen((v) => !v);
                }}
              >
                <Bell className="size-4" aria-hidden />
                {attentionCount > 0 && (
                  <span className="notices-bell__badge" aria-hidden>
                    {attentionCount > 9 ? "9+" : attentionCount}
                  </span>
                )}
              </button>
              {noticesOpen && !walletLocked && (
                <div className="notices-bell__menu" role="menu">
                  <div className="notices-bell__head">
                    <p className="notices-bell__title">{t.noticesTitle}</p>
                    {attentionCount > 0 && (
                      <p className="notices-bell__body">
                        {t.noticesBellPending(attentionCount)}
                      </p>
                    )}
                  </div>
                  <ActivityFeed
                    items={bellItems}
                    empty={t.activityEmpty}
                    compact
                    onOpenPayment={(id) => {
                      setNoticesOpen(false);
                      window.open(`/recibo?id=${encodeURIComponent(id)}`, "_blank");
                    }}
                  />
                  <button
                    type="button"
                    className="notices-bell__cta"
                    role="menuitem"
                    onClick={() => {
                      setNoticesOpen(false);
                      go("notificaciones");
                    }}
                  >
                    {t.noticesBellOpen}
                  </button>
                </div>
              )}
            </div>
            <SiteControls />
            <UserMenu
              name={sessionName}
              email={sessionEmail}
              onGoProfile={() => go(WALLET_REQUIRED_SECTION)}
              onGoIntegracion={() => go(WALLET_REQUIRED_SECTION)}
            />
          </div>
        </div>
      </header>

      <div className="dash-shell">
        <nav className="dash-nav" aria-label={t.navAria}>
          <ul className="dash-nav__list">
            {navItems.map(({ id, label, icon: Icon }) => {
              const locked = walletLocked && id !== WALLET_REQUIRED_SECTION;
              const active = section === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`dash-nav__item${active ? " is-active" : ""}${locked ? " is-locked" : ""}`}
                    aria-current={active ? "page" : undefined}
                    aria-disabled={locked || undefined}
                    title={locked ? t.walletGateLockedHint : undefined}
                    onClick={() => {
                      if (locked) return;
                      go(id);
                    }}
                  >
                    <Icon className="dash-nav__icon" aria-hidden="true" />
                    <span>{label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <main className="dash-main">
          <div className="dash-intro">
            <h1 className="panel-title">{t.mastheadTitle(firstName)}</h1>
            <div className="meta-chips" aria-label={t.panelMetaAria}>
              <span className="meta-chip">
                <span className="meta-chip__dot" aria-hidden="true" />
                {chargeNetwork}
              </span>
              <span className="meta-chip meta-chip--accent">
                <span className="meta-chip__dot" aria-hidden="true" />
                ViaPay {fee}
              </span>
            </div>
          </div>

          {!apiKey && (
            <p className="tone tone--warning notice" role="status">
              {t.missingKey}
            </p>
          )}

          {walletLocked && (
            <div className="wallet-gate-banner" role="status">
              <div>
                <p className="wallet-gate-banner__title">{t.walletGateTitle}</p>
                <p className="wallet-gate-banner__body">{t.walletGateBanner}</p>
              </div>
            </div>
          )}

          <div className="dash-view" key={section}>
            {section === "resumen" && !walletLocked && (
              <OverviewPanel
                payments={payments}
                hasWallet={hasWallet}
                onNeedWallet={() => go(WALLET_REQUIRED_SECTION)}
                onGoCobros={tryGoCobros}
                onGoHistory={() => go("historial")}
              />
            )}

            {section === "cobros" && !walletLocked && (
              <div className="workspace workspace--composer">
                <CreatePaymentLink
                  apiKey={apiKey}
                  feeBps={feeBps}
                  hasWallet={hasWallet}
                  merchantWallet={merchantWallet}
                  merchantUsdcReady={merchantUsdcReady}
                  network={chargeNetwork}
                  onNeedWallet={() => go(WALLET_REQUIRED_SECTION)}
                  onNeedUsdcTrustline={() => setTrustlineGateOpen(true)}
                  onPaymentCreated={(p) => setPayments((prev) => [p, ...prev])}
                />
                <aside className="cobros-guide" aria-label={t.cobrosGuideTitle}>
                  <h2 className="cobros-guide__title">{t.cobrosGuideTitle}</h2>
                  <ol className="cobros-guide__list">
                    <li>{t.cobrosGuide1}</li>
                    <li>{t.cobrosGuide2}</li>
                    <li>{t.cobrosGuide3}</li>
                  </ol>
                  <div className="grid gap-6 mt-6">
                    <WhatsAppAssistantCard apiKey={apiKey} />
                  </div>
                </aside>
              </div>
            )}

            {section === "contactos" && !walletLocked && (
              <section className="panel panel--contacts">
                <div className="panel__head">
                  <h2 className="panel-title">{t.contactsTitle}</h2>
                  <p>{t.contactsSectionDesc}</p>
                </div>
                <div className="panel__body">
                  <ContactsSection apiKey={apiKey} featured />
                </div>
              </section>
            )}

            {section === "historial" && !walletLocked && (
              <div className="workspace workspace--history">
                <PaymentHistory payments={received} network={network} />
              </div>
            )}

            {section === "estadisticas" && !walletLocked && (
              <PaymentStatsDetail payments={payments} />
            )}

            {section === "swap" && !walletLocked && (
              <div className="workspace workspace--composer">
                <SwapPanel apiKey={apiKey} network={network} />
              </div>
            )}

            {section === "integracion" &&
              (apiKey ? (
                <IntegrationPanel
                  apiKey={apiKey}
                  merchantWallet={merchantWallet}
                  network={network}
                  onWalletSaved={(address) => {
                    void afterWalletSaved(address);
                  }}
                  onTrustlineActivated={() => {
                    setMerchantUsdcReady(true);
                    void refreshMerchantUsdc();
                  }}
                />
              ) : (
                <div className="section-empty" role="status">
                  <p className="section-empty__title">
                    {t.integrationEmptyTitle}
                  </p>
                  <p className="section-empty__body">{t.missingKey}</p>
                </div>
              ))}

            {section === "notificaciones" && !walletLocked && (
              <section className="panel panel--notices">
                <div className="panel__head">
                  <h2 className="panel-title">{t.noticesTitle}</h2>
                  <p>{t.noticesDesc}</p>
                </div>
                <div className="panel__body grid gap-6">
                  <div className="grid gap-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-medium text-[var(--text)]">
                        {t.activityTitle}
                      </h3>
                      <Button
                        type="button"
                        size="sm"
                        variant="ghost"
                        onClick={() => void refreshActivity()}
                      >
                        {t.webhooksRefresh}
                      </Button>
                    </div>
                    <p className="text-sm text-[var(--text-2)]">
                      {t.activityBody}
                    </p>
                    <ActivityFeed
                      items={activityItems}
                      empty={t.activityEmpty}
                      onOpenPayment={(id) => {
                        window.open(
                          `/recibo?id=${encodeURIComponent(id)}`,
                          "_blank",
                        );
                      }}
                    />
                  </div>
                  <WebhooksSection apiKey={apiKey} />
                  <details className="notices-api">
                    <summary className="notices-api__summary">
                      {t.noticesPollTitle}
                    </summary>
                    <div className="grid gap-3 pt-2">
                      <p className="text-sm text-[var(--text-2)]">
                        {t.noticesPoll}
                      </p>
                      <code className="perf text-xs block break-all">
                        GET /v1/payment_intents/:id
                      </code>
                      <p className="text-sm text-[var(--text-2)]">
                        {t.noticesPollList}
                      </p>
                      <code className="perf text-xs block break-all">
                        GET /v1/payment_intents
                      </code>
                    </div>
                  </details>
                </div>
              </section>
            )}
          </div>

          <footer className="dash-foot">
            <p>{t.footerNetwork(network, fee)}</p>
            <nav className="dash-foot__legal" aria-label="Legal">
              <a href="/privacy">{t.footerPrivacy}</a>
              <a href="/terms">{t.footerTerms}</a>
              <a href="/data-deletion">{t.footerDataDeletion}</a>
            </nav>
          </footer>
        </main>
      </div>

      {walletLocked && apiKey && (
        <WalletGateModal
          apiKey={apiKey}
          onWalletSaved={(address) => {
            void afterWalletSaved(address);
          }}
        />
      )}

      {!walletLocked && trustlineGateOpen && apiKey && merchantWallet && (
        <TrustlineGateModal
          apiKey={apiKey}
          network={network}
          merchantWallet={merchantWallet}
          onActivated={() => {
            setMerchantUsdcReady(true);
            setTrustlineGateOpen(false);
            void refreshMerchantUsdc();
          }}
          onConfirmWithout={() => {
            setTrustlineGateOpen(false);
          }}
        />
      )}
    </div>
  );
}
