"use client";

import type { PayoutShare } from "@viapay/shared";
import {
  expertAccountUrl,
  shortAddress,
} from "@/lib/checkout/breakdown";
import type { Messages } from "@/lib/checkout/messages";

function roleLabel(role: PayoutShare["role"], t: Messages): string {
  switch (role) {
    case "merchant":
      return t.splitMerchant;
    case "viapay_treasury":
      return t.splitViaPay;
    case "reseller":
      return t.splitReseller;
  }
}

function formatAmount(value: string, localeTag: string): string {
  return Number(value).toLocaleString(localeTag, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 7,
  });
}

type Props = {
  legs: PayoutShare[];
  asset: string;
  localeTag: string;
  t: Messages;
  variant: "preview" | "receipt";
  network: "testnet" | "mainnet" | "local" | string;
};

export function SplitLegsList({
  legs,
  asset,
  localeTag,
  t,
  variant,
  network,
}: Props) {
  if (legs.length === 0) return null;

  return (
    <div
      className={
        variant === "receipt" ? "pay-split pay-split--receipt" : "pay-split"
      }
    >
      <p className="pay-split__title">
        {variant === "receipt" ? t.receiptTitle : t.splitTitle}
      </p>
      <p className="pay-split__hint">
        {variant === "receipt" ? t.receiptHint : t.splitHint}
      </p>
      <ul className="pay-split__list">
        {legs.map((leg) => {
          const href = expertAccountUrl(leg.address, network);
          return (
            <li key={`${leg.role}-${leg.address}`} className="pay-split__row">
              <div className="pay-split__meta">
                <span className="pay-split__role">{roleLabel(leg.role, t)}</span>
                <span className="pay-split__share">{leg.share}</span>
                {href ? (
                  <a
                    className="pay-split__addr"
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    title={leg.address}
                  >
                    {shortAddress(leg.address)}
                  </a>
                ) : (
                  <span className="pay-split__addr" title={leg.address}>
                    {shortAddress(leg.address)}
                  </span>
                )}
              </div>
              <p className="pay-split__amount">
                {formatAmount(leg.amount, localeTag)}{" "}
                <span className="pay-split__asset">{asset}</span>
              </p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
