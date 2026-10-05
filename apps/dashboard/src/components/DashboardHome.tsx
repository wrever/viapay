"use client";

import Link from "next/link";
import { formatBps } from "@viapay/shared";
import { CreatePaymentLink } from "@/components/CreatePaymentLink";
import { Logo } from "@/components/Logo";
import { ReceiveNotice, type Readiness } from "@/components/ReceiveNotice";
import { WebhookPanel } from "@/components/WebhookPanel";
import { Button } from "@/components/ui/button";
import { SiteControls, useLocale } from "@/lib/i18n";

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

export function DashboardHome({
  sessionName,
  apiKey,
  payments,
  readiness,
  webhooks,
  feeBps,
}: {
  sessionName: string;
  apiKey: string | null;
  payments: Payment[];
  readiness: Readiness | null;
  webhooks: { id: string; url: string; status: string }[];
  feeBps: number;
}) {
  const { t } = useLocale();
  const fee = formatBps(feeBps);

  return (
    <div className="mx-auto min-h-[100dvh] w-full max-w-6xl px-4 py-6 md:px-6 md:py-8">
      <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <Link href="/app" className="brand-lockup" aria-label={t.homeAria}>
          <Logo variant="horizontal" width={120} alt="" />
        </Link>
        <div className="flex items-center gap-3">
          <SiteControls />
          <span className="text-sm text-[var(--text-2)]">{sessionName}</span>
          <Button variant="outline" size="sm" asChild>
            <Link href="/auth/signout">{t.signOut}</Link>
          </Button>
        </div>
      </header>

      <section className="masthead mb-6 p-6 md:p-8" data-theme="dark">
        <Logo variant="icon" width={272} className="masthead__mark" alt="" />
        <div className="relative max-w-2xl">
          <h1 className="panel-title text-3xl md:text-[2.6rem]">
            {t.mastheadTitle}
          </h1>
          <p className="mt-3 max-w-xl text-[var(--text-2)]">
            {t.mastheadBody(fee)}
          </p>
          <ol className="relative mt-5 grid gap-2 md:grid-cols-3">
            <li className="step">
              <b>{t.stepCreateTitle}</b>
              {t.stepCreateBody}
            </li>
            <li className="step">
              <b>{t.stepShareTitle}</b>
              {t.stepShareBody}
            </li>
            <li className="step">
              <b>{t.stepPaidTitle}</b>
              {t.stepPaidBody}
            </li>
          </ol>
        </div>
      </section>

      <ReceiveNotice readiness={readiness} />

      {!apiKey && (
        <p className="tone tone--warning mb-6 px-4 py-3 text-sm">
          {t.missingKey}
        </p>
      )}

      <CreatePaymentLink apiKey={apiKey} initial={payments} feeBps={feeBps} />

      <div className="mt-6">
        <WebhookPanel apiKey={apiKey} initial={webhooks} />
      </div>

      <footer className="mt-10 border-t border-[var(--border)] pt-5 text-xs text-[var(--text-2)]">
        <p>
          {t.footerNetwork(readiness?.network ?? "testnet", fee)}
          <code className="perf">
            {readiness?.treasury_wallet
              ? `${readiness.treasury_wallet.slice(0, 6)}…${readiness.treasury_wallet.slice(-4)}`
              : t.footerUnconfigured}
          </code>
        </p>
      </footer>
    </div>
  );
}
