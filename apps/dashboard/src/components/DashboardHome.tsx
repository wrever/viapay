"use client";

import Link from "next/link";
import { useState } from "react";
import { formatBps } from "@viapay/shared";
import { CreatePaymentLink } from "@/components/CreatePaymentLink";
import { Logo } from "@/components/Logo";
import { PaymentHistory } from "@/components/PaymentHistory";
import { PaymentStatsStrip } from "@/components/PaymentStatsStrip";
import { ReceiveNotice, type Readiness } from "@/components/ReceiveNotice";
import { WebhookPanel } from "@/components/WebhookPanel";
import { Button } from "@/components/ui/button";
import type { DashboardPayment } from "@/lib/payment-types";
import { SiteControls, useLocale } from "@/lib/i18n";

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

        <ReceiveNotice readiness={readiness} />

        {!apiKey && (
          <p className="tone tone--warning notice" role="status">
            {t.missingKey}
          </p>
        )}

        <PaymentStatsStrip payments={payments} />

        <div className="workspace workspace--composer">
          <CreatePaymentLink
            apiKey={apiKey}
            feeBps={feeBps}
            onPaymentCreated={(p) => setPayments((prev) => [p, ...prev])}
          />
        </div>

        <PaymentHistory payments={payments} network={network} />

        <WebhookPanel apiKey={apiKey} initial={webhooks} />

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
  );
}
