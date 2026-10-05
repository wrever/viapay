"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBps } from "@viapay/shared";
import { Bell, History, PlusCircle, Wallet } from "lucide-react";
import { CreatePaymentLink } from "@/components/CreatePaymentLink";
import { Logo } from "@/components/Logo";
import { IntegrationPanel } from "@/components/IntegrationPanel";
import { PaymentHistory } from "@/components/PaymentHistory";
import { PaymentStatsStrip } from "@/components/PaymentStatsStrip";
import { Button } from "@/components/ui/button";
import type { DashboardPayment } from "@/lib/payment-types";
import type { Readiness } from "@/lib/readiness";
import { SiteControls, useLocale } from "@/lib/i18n";

const SECTIONS = ["cobros", "historial", "integracion", "notificaciones"] as const;
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
  feeBps,
}: {
  sessionName: string;
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

  const received = useMemo(
    () => payments.filter((p) => p.status === "succeeded"),
    [payments],
  );

  const navItems: {
    id: DashSection;
    label: string;
    icon: typeof PlusCircle;
  }[] = [
    { id: "cobros", label: t.navCobros, icon: PlusCircle },
    { id: "historial", label: t.navHistorial, icon: History },
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

          {!apiKey && (
            <p className="tone tone--warning notice" role="status">
              {t.missingKey}
            </p>
          )}

          <div className="dash-view" key={section}>
            {section === "cobros" && (
              <div className="workspace workspace--composer">
                <CreatePaymentLink
                  apiKey={apiKey}
                  feeBps={feeBps}
                  onPaymentCreated={(p) => setPayments((prev) => [p, ...prev])}
                />
                <aside className="cobros-guide" aria-label={t.cobrosGuideTitle}>
                  <h2 className="cobros-guide__title">{t.cobrosGuideTitle}</h2>
                  <ol className="cobros-guide__list">
                    <li>{t.cobrosGuide1}</li>
                    <li>{t.cobrosGuide2}</li>
                    <li>{t.cobrosGuide3}</li>
                  </ol>
                </aside>
              </div>
            )}

            {section === "historial" && (
              <div className="workspace workspace--history">
                <PaymentStatsStrip payments={payments} />
                <PaymentHistory payments={received} network={network} />
              </div>
            )}

            {section === "integracion" && (
              <IntegrationPanel
                apiKey={apiKey}
                merchantWallet={readiness?.merchant_wallet ?? null}
              />
            )}

            {section === "notificaciones" && (
              <section className="panel panel--notices">
                <div className="panel__head">
                  <h2 className="panel-title">{t.noticesTitle}</h2>
                  <p>{t.noticesDesc}</p>
                </div>
                <div className="panel__body grid gap-3">
                  <p className="text-sm text-[var(--text-2)]">{t.noticesPoll}</p>
                  <code className="perf text-xs block break-all">
                    GET /v1/payment_intents/:id
                  </code>
                  <p className="text-sm text-[var(--text-2)]">{t.noticesPollList}</p>
                  <code className="perf text-xs block break-all">
                    GET /v1/payment_intents
                  </code>
                  <p className="text-sm text-[var(--text-2)]">{t.noticesNoWebhook}</p>
                </div>
              </section>
            )}
          </div>

          <footer className="dash-foot">
            <p>{t.footerNetwork(network, fee)}</p>
          </footer>
        </main>
      </div>
    </div>
  );
}
