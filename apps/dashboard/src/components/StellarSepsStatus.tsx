"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

type SepEntry = { status: string; note?: string; url?: string };

type HealthSeps = Record<string, SepEntry>;

/** Live SEP matrix from GET /v1/health — for Integración / jurado. */
export function StellarSepsStatus() {
  const { t } = useLocale();
  const [seps, setSeps] = useState<HealthSeps | null>(null);
  const [router, setRouter] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/v1/health`, { cache: "no-store" });
        const body = (await res.json()) as {
          seps?: HealthSeps;
          payment_router?: string | null;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "health");
        if (!cancelled) {
          setSeps(body.seps ?? null);
          setRouter(body.payment_router ?? null);
        }
      } catch {
        if (!cancelled) setError(t.sepsLoadFail);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t.sepsLoadFail]);

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium text-[var(--text)]">{t.sepsTitle}</h3>
      <p className="text-sm text-[var(--text-2)]">{t.sepsBody}</p>
      {error && (
        <p className="tone tone--warning text-sm" role="alert">
          {error}
        </p>
      )}
      {router && (
        <p className="text-xs text-[var(--text-2)]">
          <span className="text-[var(--text)] font-medium">payment-router:</span>{" "}
          <code className="perf break-all">{router}</code>
        </p>
      )}
      {seps && (
        <ul className="text-xs grid gap-1.5">
          {Object.entries(seps).map(([id, entry]) => (
            <li key={id} className="flex flex-wrap gap-x-2 gap-y-0.5">
              <span className="font-semibold text-[var(--text)]">{id}</span>
              <span
                className={
                  entry.status === "live"
                    ? "text-[var(--success)]"
                    : entry.status === "demo" || entry.status === "ci"
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-2)]"
                }
              >
                {entry.status}
              </span>
              {entry.note && (
                <span className="text-[var(--text-2)] w-full sm:w-auto">
                  {entry.note}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
      <a
        className="text-xs underline underline-offset-2 text-[var(--primary)] w-fit"
        href="https://viapay.vercel.app/.well-known/stellar.toml"
        target="_blank"
        rel="noreferrer"
      >
        SEP-1 stellar.toml
      </a>
    </div>
  );
}
