"use client";

import type { ActivityItem } from "@/lib/activity";
import { useLocale } from "@/lib/i18n";

function relativeTime(iso: string, locale: string): string {
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return "";
  const diffSec = Math.round((ms - Date.now()) / 1000);
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(diffSec, "second");
  const min = Math.round(diffSec / 60);
  if (Math.abs(min) < 60) return rtf.format(min, "minute");
  const hr = Math.round(diffSec / 3600);
  if (Math.abs(hr) < 48) return rtf.format(hr, "hour");
  const day = Math.round(diffSec / 86400);
  return rtf.format(day, "day");
}

function kindClass(kind: ActivityItem["kind"]): string {
  if (kind === "paid" || kind === "webhook_ok") return "activity-item--ok";
  if (kind === "partial" || kind === "pending") return "activity-item--warn";
  if (kind === "webhook_fail" || kind === "canceled") return "activity-item--bad";
  return "";
}

export function ActivityFeed({
  items,
  empty,
  compact = false,
  onOpenPayment,
}: {
  items: ActivityItem[];
  empty: string;
  compact?: boolean;
  onOpenPayment?: (paymentId: string) => void;
}) {
  const { locale } = useLocale();
  const localeTag =
    locale === "en" ? "en" : locale === "pt" ? "pt-BR" : "es-CL";

  if (items.length === 0) {
    return (
      <p className="activity-feed__empty text-sm text-[var(--text-2)]" role="status">
        {empty}
      </p>
    );
  }

  return (
    <ul
      className={`activity-feed${compact ? " activity-feed--compact" : ""}`}
      role="list"
    >
      {items.map((item) => {
        const clickable = Boolean(item.paymentId && onOpenPayment);
        const body = (
          <>
            <span className="activity-item__title">{item.title}</span>
            {item.detail && (
              <span className="activity-item__detail">{item.detail}</span>
            )}
            <span className="activity-item__time">
              {relativeTime(item.at, localeTag)}
            </span>
          </>
        );
        return (
          <li key={item.id} className={`activity-item ${kindClass(item.kind)}`}>
            {clickable ? (
              <button
                type="button"
                className="activity-item__inner"
                onClick={() => onOpenPayment?.(item.paymentId!)}
              >
                {body}
              </button>
            ) : (
              <div className="activity-item__inner">{body}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
