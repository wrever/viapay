"use client";

import { useState } from "react";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

const SDF_TEST_ANCHOR = "testanchor.stellar.org";

type Discover = {
  toml_url?: string;
  sep24?: string | null;
  sep6?: string | null;
  error?: string;
};

/** SEP-10/24 demo path via SDF Test Anchor. Fiat payout is simulated — declared in copy. */
export function AnchorCashOut({ apiKey }: { apiKey: string | null }) {
  const { t } = useLocale();
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<Discover | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function discover() {
    if (!apiKey) {
      setError(t.anchorNeedKey);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/v1/integrations`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ domain: SDF_TEST_ANCHOR }),
      });
      const body = (await res.json()) as Discover & { error?: string };
      if (!res.ok) throw new Error(body.error ?? t.anchorDiscoverFail);
      setInfo(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.anchorDiscoverFail);
      setInfo(null);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium text-[var(--text)]">{t.anchorTitle}</h3>
      <p className="text-sm text-[var(--text-2)]">{t.anchorBody}</p>
      <p className="text-xs text-[var(--text-2)]">{t.anchorHonest}</p>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" variant="outline" disabled={busy || !apiKey} onClick={discover}>
          {busy ? t.creating : t.anchorDiscover}
        </Button>
        <Button type="button" size="sm" variant="ghost" asChild>
          <a href={`https://${SDF_TEST_ANCHOR}`} target="_blank" rel="noreferrer">
            {t.anchorOpen}
            <ExternalLink className="size-3.5" aria-hidden />
          </a>
        </Button>
      </div>
      {error && (
        <p className="tone tone--warning text-sm" role="alert">
          {error}
        </p>
      )}
      {info && !info.error && (
        <ul className="text-xs text-[var(--text-2)] grid gap-1">
          <li>
            <span className="text-[var(--text)]">SEP-24:</span>{" "}
            {info.sep24 ?? "—"}
          </li>
          <li>
            <span className="text-[var(--text)]">TOML:</span>{" "}
            <a className="underline underline-offset-2" href={info.toml_url} target="_blank" rel="noreferrer">
              {info.toml_url}
            </a>
          </li>
        </ul>
      )}
    </div>
  );
}
