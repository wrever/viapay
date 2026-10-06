"use client";

import { useCallback, useEffect, useState } from "react";
import { Check, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/lib/config";
import { useStellarWallet } from "@/lib/checkout/wallet";
import { useLocale } from "@/lib/i18n";

const USDC_ISSUER_TESTNET =
  "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";

type UsdcStatus = "loading" | "active" | "missing" | "unknown";

/**
 * Integration panel: activate credit trustlines on the saved merchant wallet
 * (testnet-first; Freighter via existing /v1/wallets/trustline/*).
 */
export function TrustlinesSection({
  apiKey,
  network,
  merchantWallet,
  onActivated,
}: {
  apiKey: string;
  network: string;
  merchantWallet: string | null;
  onActivated?: () => void;
}) {
  const { t } = useLocale();
  const kitNetwork = network === "mainnet" ? "mainnet" : "testnet";
  const wallet = useStellarWallet(kitNetwork);
  const [usdcStatus, setUsdcStatus] = useState<UsdcStatus>("loading");
  const [usdcIssuer, setUsdcIssuer] = useState(USDC_ISSUER_TESTNET);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refreshUsdc = useCallback(async () => {
    if (!merchantWallet) {
      setUsdcStatus("unknown");
      return;
    }
    setUsdcStatus("loading");
    try {
      const res = await fetch(`${API}/v1/wallets/trustline/prepare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ asset: "USDC" }),
      });
      const body = await res.json();
      if (!res.ok) {
        setUsdcStatus("unknown");
        return;
      }
      if (body.asset?.issuer) setUsdcIssuer(body.asset.issuer as string);
      else if (Array.isArray(body.assets) && body.assets[0]?.issuer) {
        setUsdcIssuer(body.assets[0].issuer as string);
      }
      setUsdcStatus(body.alreadyTrusted ? "active" : "missing");
    } catch {
      setUsdcStatus("unknown");
    }
  }, [apiKey, merchantWallet]);

  useEffect(() => {
    void refreshUsdc();
  }, [refreshUsdc]);

  async function activateUsdc() {
    if (!merchantWallet) return;
    setBusy(true);
    setError(null);
    try {
      let address = wallet.address;
      if (!address) address = await wallet.connect();
      if (address !== merchantWallet) {
        throw new Error(t.trustlineWalletMismatch);
      }

      const prep = await fetch(`${API}/v1/wallets/trustline/prepare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ asset: "USDC" }),
      });
      const prepared = await prep.json();
      if (!prep.ok) throw new Error(prepared.error ?? t.trustlinePrepareFail);
      if (prepared.alreadyTrusted) {
        setUsdcStatus("active");
        onActivated?.();
        return;
      }
      const passphrase =
        (prepared.network_passphrase as string | undefined) ??
        (prepared.networkPassphrase as string | undefined);
      if (!prepared.xdr || !passphrase) {
        throw new Error(t.trustlinePrepareFail);
      }

      const signed = await wallet.sign(prepared.xdr as string, passphrase);
      const res = await fetch(`${API}/v1/wallets/trustline/submit`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ signed_xdr: signed }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.trustlineSubmitFail);
      setUsdcStatus("active");
      onActivated?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  const usdcLabel =
    network === "mainnet" ? "USDC (Circle)" : "USDC (Circle testnet)";

  return (
    <div className="grid gap-3" data-trustlines-section="integration">
      <div>
        <h3 className="text-sm font-medium text-[var(--text)]">
          {t.trustlinesTitle}
        </h3>
        <p className="text-sm text-[var(--text-2)]">{t.trustlinesDesc}</p>
      </div>

      {!merchantWallet && (
        <p className="tone tone--warning text-sm" role="status">
          {t.trustlinesNeedWallet}
        </p>
      )}

      <ul className="grid gap-2" aria-label={t.trustlinesTitle}>
        <li className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)]">XLM</p>
            <p className="text-xs text-[var(--text-2)]">{t.trustlinesXlmNote}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-[var(--primary)]">
            {t.trustlinesNoAction}
          </span>
        </li>

        <li className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)]">{usdcLabel}</p>
            <p className="perf text-xs break-all text-[var(--text-2)]">
              {t.trustlineIssuer}: {usdcIssuer}
            </p>
          </div>
          <div className="shrink-0">
            {usdcStatus === "active" ? (
              <span className="inline-flex items-center gap-1 text-xs font-medium text-[var(--primary)]">
                <Check className="size-3.5" aria-hidden />
                {t.trustlinesActive}
              </span>
            ) : (
              <Button
                type="button"
                size="sm"
                disabled={!merchantWallet || busy || usdcStatus === "loading"}
                onClick={() => void activateUsdc()}
              >
                {busy || usdcStatus === "loading" ? (
                  <>
                    <Loader2 className="size-3.5 animate-spin" aria-hidden />
                    {busy ? t.trustlineActivating : "…"}
                  </>
                ) : (
                  t.trustlinesActivateCta
                )}
              </Button>
            )}
          </div>
        </li>

        <li className="flex flex-wrap items-start justify-between gap-2 rounded-md border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 opacity-70">
          <div className="min-w-0">
            <p className="text-sm font-medium text-[var(--text)]">USDT0</p>
            <p className="text-xs text-[var(--text-2)]">
              {t.trustlinesUsdt0Placeholder}
            </p>
          </div>
          <Button type="button" size="sm" variant="outline" disabled>
            {t.trustlinesSoon}
          </Button>
        </li>
      </ul>

      {error && (
        <p className="tone tone--warning text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
