"use client";

import { useMemo, useState } from "react";
import { Copy, ExternalLink } from "lucide-react";
import { formatBps } from "@viapay/shared";
import { LOCALE_TAG } from "@viapay/prefs";
import { Button } from "@/components/ui/button";
import { PaymentStatusBadge } from "@/components/PaymentStatusBadge";
import type { DashboardPayment } from "@/lib/payment-types";
import { useLocale } from "@/lib/i18n";

const PAGE = 20;

function explorerTxUrl(network: string, hash: string): string {
  const net = network === "public" || network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${net}/tx/${hash}`;
}

function formatWhen(iso: string, localeTag: string): string {
  try {
    return new Date(iso).toLocaleString(localeTag, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function PaymentHistory({
  payments,
  network = "testnet",
}: {
  payments: DashboardPayment[];
  network?: string;
}) {
  const { t, locale } = useLocale();
  const localeTag = LOCALE_TAG[locale];
  const [visible, setVisible] = useState(PAGE);

  const sorted = useMemo(
    () =>
      [...payments].sort(
        (a, b) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      ),
    [payments],
  );

  const shown = sorted.slice(0, visible);
  const hasMore = visible < sorted.length;

  async function copy(url: string) {
    await navigator.clipboard.writeText(url);
  }

  return (
    <section className="panel panel--history">
      <div className="panel__head">
        <h2 className="panel-title">{t.historyTitle}</h2>
        <p>{t.historyDesc}</p>
      </div>
      <div className="panel__body panel__body--flush">
        {sorted.length === 0 ? (
          <div className="ledger-empty ledger-empty--inset">
            <p>{t.historyEmpty}</p>
          </div>
        ) : (
          <>
            <div className="history-scroll">
              <table className="history-table">
                <thead>
                  <tr>
                    <th scope="col">{t.historyColWhen}</th>
                    <th scope="col">{t.historyColConcept}</th>
                    <th scope="col" className="history-table__num">
                      {t.historyColAmount}
                    </th>
                    <th scope="col" className="history-table__num">
                      {t.historyColNet}
                    </th>
                    <th scope="col">{t.historyColStatus}</th>
                    <th scope="col">
                      <span className="sr-only">{t.historyColActions}</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((p) => (
                    <tr key={p.id}>
                      <td className="history-table__when perf">
                        {formatWhen(p.created_at, localeTag)}
                      </td>
                      <td className="history-table__concept">
                        <span className="history-table__primary">
                          {p.description?.trim() || t.historyNoMemo}
                        </span>
                        <span className="history-table__sub perf">{p.id}</span>
                        {p.reseller_address && (
                          <span className="history-table__sub">
                            {t.resellerLine(
                              formatBps(p.reseller_fee_bps ?? 0),
                              p.reseller_amount ?? "",
                              p.asset,
                              p.reseller_address.slice(0, 6),
                            )}
                          </span>
                        )}
                        {p.stellar_tx_hash && (
                          <a
                            className="history-table__tx perf"
                            href={explorerTxUrl(network, p.stellar_tx_hash)}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {p.stellar_tx_hash.slice(0, 8)}…
                            <ExternalLink className="history-table__tx-icon" aria-hidden />
                          </a>
                        )}
                      </td>
                      <td className="history-table__num perf">
                        {Number(p.amount).toLocaleString(localeTag, {
                          maximumFractionDigits: 7,
                        })}{" "}
                        {p.asset}
                      </td>
                      <td className="history-table__num perf">
                        {Number(p.net_amount).toLocaleString(localeTag, {
                          maximumFractionDigits: 7,
                        })}{" "}
                        {p.asset}
                      </td>
                      <td>
                        <PaymentStatusBadge status={p.status} />
                      </td>
                      <td className="history-table__actions">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => copy(p.checkout_url)}
                          title={t.copy}
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                        <Button type="button" size="sm" variant="ghost" asChild>
                          <a
                            href={p.checkout_url}
                            target="_blank"
                            rel="noreferrer"
                            title={t.open}
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </a>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {hasMore && (
              <div className="history-more">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setVisible((n) => n + PAGE)}
                >
                  {t.historyShowMore(sorted.length - visible)}
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </section>
  );
}
