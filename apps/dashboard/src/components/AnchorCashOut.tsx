"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";
import { useStellarWallet } from "@/lib/checkout/wallet";
import { sep10Login, sep24WithdrawInteractive } from "@/lib/sep10";

const SDF_TEST_ANCHOR = "testanchor.stellar.org";
const USDC_TESTNET_ISSUER =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

type Discover = {
  domain?: string;
  toml_url?: string;
  network_passphrase?: string | null;
  web_auth?: string | null;
  sep24?: string | null;
  sep6?: string | null;
  sep12?: string | null;
  error?: string;
};

/** SEP-10 → SEP-24 demo via SDF Test Anchor. Fiat payout is simulated — declared in copy. */
export function AnchorCashOut({ apiKey }: { apiKey: string | null }) {
  const { t } = useLocale();
  const wallet = useStellarWallet("testnet");
  const [busy, setBusy] = useState(false);
  const [info, setInfo] = useState<Discover | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [tokenHint, setTokenHint] = useState<string | null>(null);
  const [interactiveUrl, setInteractiveUrl] = useState<string | null>(null);

  async function discover() {
    if (!apiKey) {
      setError(t.anchorNeedKey);
      return;
    }
    setBusy(true);
    setError(null);
    setInteractiveUrl(null);
    setTokenHint(null);
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

  async function runSep10Then24() {
    setBusy(true);
    setError(null);
    setInteractiveUrl(null);
    try {
      let disc = info;
      if (!disc?.web_auth || !disc.sep24) {
        if (!apiKey) throw new Error(t.anchorNeedKey);
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
        disc = body;
        setInfo(body);
      }
      if (!disc.web_auth || !disc.sep24) {
        throw new Error(t.anchorMissingEndpoints);
      }

      let address = wallet.address;
      if (!address) address = await wallet.connect();

      const passphrase =
        disc.network_passphrase ??
        "Test SDF Network ; September 2015";

      const { token } = await sep10Login({
        webAuth: disc.web_auth,
        account: address,
        networkPassphrase: passphrase,
        sign: (xdr, np) => wallet.sign(xdr, np, address),
      });
      setTokenHint(`${token.slice(0, 18)}…`);

      const interactive = await sep24WithdrawInteractive({
        sep24Base: disc.sep24,
        token,
        account: address,
        assetCode: "USDC",
        assetIssuer: USDC_TESTNET_ISSUER,
      });
      setInteractiveUrl(interactive.url);
      window.open(interactive.url, "_blank", "noopener,noreferrer");
    } catch (e) {
      setError(e instanceof Error ? e.message : t.anchorSep24Fail);
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
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={busy || !apiKey}
          onClick={() => void discover()}
        >
          {busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t.creating}
            </>
          ) : (
            t.anchorDiscover
          )}
        </Button>
        <Button
          type="button"
          size="sm"
          disabled={busy || !apiKey}
          onClick={() => void runSep10Then24()}
        >
          {busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t.anchorSepRunning}
            </>
          ) : (
            t.anchorSep10Sep24
          )}
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
            <span className="text-[var(--text)]">SEP-10:</span>{" "}
            {info.web_auth ?? "—"}
          </li>
          <li>
            <span className="text-[var(--text)]">SEP-24:</span>{" "}
            {info.sep24 ?? "—"}
          </li>
          <li>
            <span className="text-[var(--text)]">SEP-12:</span>{" "}
            {info.sep12 ?? "—"}
          </li>
          <li>
            <span className="text-[var(--text)]">TOML:</span>{" "}
            <a
              className="underline underline-offset-2"
              href={info.toml_url}
              target="_blank"
              rel="noreferrer"
            >
              {info.toml_url}
            </a>
          </li>
        </ul>
      )}
      {tokenHint && (
        <p className="text-xs text-[var(--text-2)]">
          {t.anchorJwtOk} <code className="perf">{tokenHint}</code>
        </p>
      )}
      {interactiveUrl && (
        <p className="text-xs">
          <a
            className="underline underline-offset-2 text-[var(--primary)]"
            href={interactiveUrl}
            target="_blank"
            rel="noreferrer"
          >
            {t.anchorOpenInteractive}
          </a>
        </p>
      )}
    </div>
  );
}
