"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/i18n";

export type ReceiveStatus = { exists: boolean; canReceive: boolean };

export type ResellerReadiness = {
  address: string;
  xlm: ReceiveStatus;
  usdc: ReceiveStatus;
};

export type Readiness = {
  network: string;
  fee_bps?: number;
  merchant_wallet: string | null;
  treasury_wallet: string;
  usdc_issuer: string;
  friendbot_url: string | null;
  usdc_faucet_url: string;
  trustline_sep7: string | null;
  merchant: { xlm: ReceiveStatus; usdc: ReceiveStatus };
  treasury: { xlm: ReceiveStatus; usdc: ReceiveStatus };
  resellers?: ResellerReadiness[];
};

export function blockedResellers(readiness: Readiness | null): ResellerReadiness[] {
  return (readiness?.resellers ?? []).filter(
    (reseller) => !reseller.xlm.exists || !reseller.usdc.canReceive,
  );
}

export function ReceiveNotice({ readiness }: { readiness: Readiness | null }) {
  const { t } = useLocale();
  const [copied, setCopied] = useState(false);
  if (!readiness) return null;

  const merchantMissing = !readiness.merchant.xlm.exists;
  const merchantNeedsUsdc = !readiness.merchant.usdc.canReceive;
  const treasuryBlocked =
    !readiness.treasury.xlm.exists || !readiness.treasury.usdc.canReceive;
  const resellersBlocked = blockedResellers(readiness);
  if (
    !merchantMissing &&
    !merchantNeedsUsdc &&
    !treasuryBlocked &&
    resellersBlocked.length === 0
  ) {
    return null;
  }

  async function copyTrustline() {
    if (!readiness?.trustline_sep7) return;
    await navigator.clipboard.writeText(readiness.trustline_sep7);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <section className="tone tone--warning notice" role="status">
      <p className="notice__title">{t.receiveTitle(readiness.network)}</p>
      <ul className="notice__list">
        {merchantMissing && (
          <li>
            {t.receiveMerchantMissing}
            {readiness.friendbot_url ? (
              <a className="underline" href={readiness.friendbot_url}>
                Friendbot
              </a>
            ) : (
              "Friendbot"
            )}
            .
          </li>
        )}
        {merchantNeedsUsdc && (
          <li>
            {t.receiveMerchantUsdc}{" "}
            <span className="perf text-xs">{readiness.usdc_issuer}</span>.
          </li>
        )}
        {treasuryBlocked && (
          <li>{t.receiveTreasury(readiness.treasury_wallet.slice(0, 6))}</li>
        )}
        {resellersBlocked.map((reseller) => (
          <li key={reseller.address}>
            {reseller.address.slice(0, 6)}…{reseller.address.slice(-4)}{" "}
            {reseller.xlm.exists
              ? t.receiveResellerUsdc
              : t.receiveResellerMissing}
            {t.receiveResellerTail}
          </li>
        ))}
      </ul>
      <div className="notice__actions">
        {readiness.trustline_sep7 && merchantNeedsUsdc && (
          <Button type="button" size="sm" variant="outline" onClick={copyTrustline}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? t.copied : t.copyTrustline}
          </Button>
        )}
        <a
          className="inline-flex h-9 items-center rounded-[var(--r-sm)] px-3 text-sm font-bold underline underline-offset-2"
          href={readiness.usdc_faucet_url}
          target="_blank"
          rel="noreferrer"
        >
          {t.faucetUsdc}
        </a>
      </div>
    </section>
  );
}
