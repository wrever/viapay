"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatBps } from "@viapay/shared";
import {
  BarChart3,
  Bell,
  History,
  LayoutDashboard,
  PlusCircle,
  Wallet,
} from "lucide-react";
import { CreatePaymentLink } from "@/components/CreatePaymentLink";
import { Logo } from "@/components/Logo";
import { IntegrationPanel } from "@/components/IntegrationPanel";
import { OverviewPanel } from "@/components/OverviewPanel";
import { PaymentHistory } from "@/components/PaymentHistory";
import { PaymentStatsDetail } from "@/components/PaymentStatsDetail";
import { Button } from "@/components/ui/button";
import type { DashboardPayment } from "@/lib/payment-types";
import type { Readiness } from "@/lib/readiness";
import { SiteControls, useLocale } from "@/lib/i18n";

const SECTIONS = [
  "resumen",
  "cobros",
  "historial",
  "estadisticas",
  "integracion",
  "notificaciones",
] as const;
type DashSection = (typeof SECTIONS)[number];
const DEFAULT_SECTION: DashSection = "resumen";

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
  if (`${window.location.pathname}${window.location.search}${window.location.hash}` !== nextUrl) {
    window.history.replaceState(null, "", nextUrl);
  }
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
  const [section, setSection] = useState<DashSection>(DEFAULT_SECTION);

  useEffect(() => {
    const initial = readSectionFromLocation();
    setSection(initial);
    writeSectionToLocation(initial);

    const sync = () => setSection(readSectionFromLocation());
    window.addEventListener("hashchange", sync);
    window.addEventListener("popstate", sync);
    return () => {
      window.removeEventListener("hashchange", sync);
      window.removeEventListener("popstate", sync);
    };
  }, []);

  const go = useCallback((next: DashSection) => {
    setSection(next);
    writeSectionToLocation(next);
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
    { id: "resumen", label: t.navResumen, icon: LayoutDashboard },
    { id: "cobros", label: t.navCobros, icon: PlusCircle },
    { id: "historial", label: t.navHistorial, icon: History },
    { id: "estadisticas", label: t.navEstadisticas, icon: BarChart3 },
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
            {section === "resumen" && (
              <OverviewPanel
                payments={payments}
                onGoCobros={() => go("cobros")}
              />
            )}

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
                <PaymentHistory payments={received} network={network} />
              </div>
            )}

            {section === "estadisticas" && (
              <PaymentStatsDetail payments={payments} />
            )}

            {section === "integracion" && (
              apiKey ? (
                <IntegrationPanel
                  apiKey={apiKey}
                  merchantWallet={readiness?.merchant_wallet ?? null}
                />
              ) : (
                <div className="section-empty" role="status">
                  <p className="section-empty__title">{t.integrationEmptyTitle}</p>
                  <p className="section-empty__body">{t.missingKey}</p>
                </div>
              )
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
