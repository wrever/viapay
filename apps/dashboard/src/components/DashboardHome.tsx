"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { formatBps } from "@viapay/shared";
import { Bell, History, PlusCircle, Wallet } from "lucide-react";
import { CreatePaymentLink } from "@/components/CreatePaymentLink";
import { Logo } from "@/components/Logo";
import { IntegrationPanel } from "@/components/IntegrationPanel";
import { PaymentHistory } from "@/components/PaymentHistory";
import { PaymentStatsStrip } from "@/components/PaymentStatsStrip";
import { ReceiveNotice, type Readiness } from "@/components/ReceiveNotice";
import { WebhookPanel } from "@/components/WebhookPanel";
import { Button } from "@/components/ui/button";
import type { DashboardPayment } from "@/lib/payment-types";
import { SiteControls, useLocale } from "@/lib/i18n";

const SECTIONS = ["cobros", "historial", "integracion", "avisos"] as const;
type DashSection = (typeof SECTIONS)[number];

function parseSection(raw: string | null | undefined): DashSection {
  const value = (raw ?? "").replace(/^#/, "").toLowerCase();
  return (SECTIONS as readonly string[]).includes(value)
    ? (value as DashSection)
    : "cobros";
}

export function DashboardHome({
  sessionName,
  apiKey,
  payments: initialPayments,
  readiness,
  webhooks,
  feeBps,
}: {
  sessionName: string;
  apiKey: string | null;
  payments: DashboardPayment[];
  readiness: Readiness | null;
  webhooks: { id: string; url: string; status: string }[];
  feeBps: number;
}) {
  const { t } = useLocale();
  const fee = formatBps(feeBps);
  const network = readiness?.network ?? "testnet";
  const firstName = sessionName.split(/\s+/)[0] || sessionName;
  const [payments, setPayments] = useState(initialPayments);
  const [section, setSection] = useState<DashSection>("cobros");

  useEffect(() => {
    setSection(parseSection(window.location.hash));
    const onHash = () => setSection(parseSection(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  const go = useCallback((next: DashSection) => {
    setSection(next);
    const hash = `#${next}`;
    if (window.location.hash !== hash) {
      window.history.replaceState(null, "", hash);
    }
  }, []);

  const showStats = section === "cobros" || section === "historial";
  const showReceive = section === "cobros" || section === "integracion";

  const navItems: {
    id: DashSection;
    label: string;
    icon: typeof PlusCircle;
  }[] = [
    { id: "cobros", label: t.navCobros, icon: PlusCircle },
    { id: "historial", label: t.navHistorial, icon: History },
    { id: "integracion", label: t.navIntegracion, icon: Wallet },
    { id: "avisos", label: t.navAvisos, icon: Bell },
  ];

  return (
    <div className="dash">
      <header className="dash-bar">
        <div className="dash-bar__inner">
          <Link href="/app" className="brand-lockup" aria-label={t.homeAria}>
            <Logo variant="horizontal" width={112} alt="" />
          </Link>
          <div className="dash-bar__user">
            <SiteControls />
            <span className="dash-bar__name" title={sessionName}>
              {sessionName}
            </span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/auth/signout">{t.signOut}</Link>
            </Button>
          </div>
        </div>
      </header>

      <div className="dash-shell">
        <nav className="dash-nav" aria-label={t.navAria}>
          <ul className="dash-nav__list">
            {navItems.map(({ id, label, icon: Icon }) => {
              const active = section === id;
              return (
                <li key={id}>
                  <button
                    type="button"
                    className={`dash-nav__item${active ? " is-active" : ""}`}
                    aria-current={active ? "page" : undefined}
                    onClick={() => go(id)}
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
                {network}
              </span>
              <span className="meta-chip meta-chip--accent">
                <span className="meta-chip__dot" aria-hidden="true" />
                ViaPay {fee}
              </span>
            </div>
          </div>

          {showReceive && <ReceiveNotice readiness={readiness} />}

          {!apiKey && (
            <p className="tone tone--warning notice" role="status">
              {t.missingKey}
            </p>
          )}

          {showStats && <PaymentStatsStrip payments={payments} />}

          <div className="dash-view" key={section}>
            {section === "cobros" && (
              <div className="workspace workspace--composer">
                <CreatePaymentLink
                  apiKey={apiKey}
                  feeBps={feeBps}
                  onPaymentCreated={(p) => setPayments((prev) => [p, ...prev])}
                />
              </div>
            )}

            {section === "historial" && (
              <PaymentHistory payments={payments} network={network} />
            )}

            {section === "integracion" && (
              <IntegrationPanel
                apiKey={apiKey}
                merchantWallet={readiness?.merchant_wallet ?? null}
              />
            )}

            {section === "avisos" && (
              <WebhookPanel apiKey={apiKey} initial={webhooks} />
            )}
          </div>

          <footer className="dash-foot">
            <p>
              {t.footerNetwork(network, fee)}
              <code className="perf">
                {readiness?.treasury_wallet
                  ? `${readiness.treasury_wallet.slice(0, 6)}…${readiness.treasury_wallet.slice(-4)}`
                  : t.footerUnconfigured}
              </code>
            </p>
          </footer>
        </main>
      </div>
    </div>
  );
}
