"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useStellarWallet } from "@/lib/checkout/wallet";
import { useLocale } from "@/lib/i18n";

type CreditAsset = {
  code: "USDC";
  issuer: string;
  label: string;
};

const DEFAULT_ASSETS: CreditAsset[] = [
  {
    code: "USDC",
    issuer: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
    label: "USDC (Circle testnet)",
  },
];

/**
 * Non-dismissible until the merchant activates a trustline or confirms
 * they understand (Cobros falls back to XLM). Same Freighter pattern as swap.
 */
export function TrustlineGateModal({
  apiKey,
  network,
  merchantWallet,
  onActivated,
  onConfirmWithout,
}: {
  apiKey: string;
  network: string;
  merchantWallet: string;
  onActivated: () => void;
  onConfirmWithout: () => void;
}) {
  const { t } = useLocale();
  const kitNetwork = network === "mainnet" ? "mainnet" : "testnet";
  const wallet = useStellarWallet(kitNetwork);
  const [assets, setAssets] = useState<CreditAsset[]>(DEFAULT_ASSETS);
  const [assetCode, setAssetCode] = useState<"USDC">("USDC");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const onActivatedRef = useRef(onActivated);
  onActivatedRef.current = onActivated;

  useEffect(() => {
    const blockEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("keydown", blockEscape, true);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", blockEscape, true);
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
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
        if (!res.ok || cancelled) return;
        if (Array.isArray(body.assets) && body.assets.length > 0) {
          setAssets(body.assets as CreditAsset[]);
        }
        if (body.alreadyTrusted) {
          onActivatedRef.current();
        }
      } catch {
        // Keep defaults; activate path will surface errors.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiKey]);

  async function activate() {
    setBusy(true);
    setError(null);
    try {
      let address = wallet.address;
      if (!address) {
        address = await wallet.connect();
      }
      if (address !== merchantWallet) {
        throw new Error(t.trustlineWalletMismatch);
      }

      const prep = await fetch(`${API}/v1/wallets/trustline/prepare`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ asset: assetCode }),
      });
      const prepared = await prep.json();
      if (!prep.ok) throw new Error(prepared.error ?? t.trustlinePrepareFail);
      if (prepared.alreadyTrusted) {
        onActivated();
        return;
      }
      if (!prepared.xdr) throw new Error(t.trustlinePrepareFail);

      const signed = await wallet.sign(
        prepared.xdr as string,
        prepared.network_passphrase as string,
      );
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
      onActivated();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  const selected = assets.find((a) => a.code === assetCode) ?? assets[0];

  return (
    <div
      className="wallet-gate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="trustline-gate-title"
      data-trustline-gate="required"
    >
      <div className="wallet-gate-modal__backdrop" aria-hidden="true" />
      <div className="wallet-gate-modal__card">
        <ShieldAlert className="wallet-gate-modal__icon" aria-hidden />
        <h2 id="trustline-gate-title" className="wallet-gate-modal__title">
          {t.trustlineGateTitle}
        </h2>
        <p className="wallet-gate-modal__body">{t.trustlineGateBody}</p>
        <p className="wallet-gate-modal__hint perf text-xs break-all">
          {t.trustlineGateWallet}: {merchantWallet}
        </p>

        <div className="wallet-gate-modal__form">
          <Label htmlFor="trustline-asset">{t.trustlineAssetLabel}</Label>
          <select
            id="trustline-asset"
            className="asset-select w-full"
            value={assetCode}
            onChange={(e) => setAssetCode(e.target.value as "USDC")}
            disabled={busy}
          >
            {assets.map((a) => (
              <option key={`${a.code}:${a.issuer}`} value={a.code}>
                {a.label}
              </option>
            ))}
          </select>
          {selected && (
            <p className="wallet-gate-modal__hint perf text-xs break-all">
              {t.trustlineIssuer}: {selected.issuer}
            </p>
          )}

          {error && (
            <p className="tone tone--warning text-sm" role="alert">
              {error}
            </p>
          )}

          <Button
            type="button"
            size="lg"
            className="w-full"
            disabled={busy}
            onClick={() => activate()}
          >
            {busy ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />{" "}
                {t.trustlineActivating}
              </>
            ) : (
              t.trustlineActivateCta
            )}
          </Button>

          <Button
            type="button"
            size="lg"
            variant="outline"
            className="w-full"
            disabled={busy}
            onClick={onConfirmWithout}
          >
            {t.trustlineConfirmXlm}
          </Button>
        </div>
      </div>
    </div>
  );
}
