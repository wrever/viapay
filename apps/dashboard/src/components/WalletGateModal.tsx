"use client";

import { useEffect, useState } from "react";
import { isValidStellarPubkey } from "@viapay/shared";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

/**
 * Hard gate: visible whenever the merchant has no destination wallet.
 * Not dismissible (no Escape / backdrop / X / localStorage). Closes only after
 * a successful POST /v1/wallets.
 */
export function WalletGateModal({
  apiKey,
  onWalletSaved,
}: {
  apiKey: string;
  onWalletSaved: (address: string) => void;
}) {
  const { t } = useLocale();
  const [wallet, setWallet] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  async function saveWallet(e: React.FormEvent) {
    e.preventDefault();
    const address = wallet.trim();
    if (!isValidStellarPubkey(address)) {
      setError(t.errResellerWallet);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/v1/wallets`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ address }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.integrationWalletFail);
      onWalletSaved((body.address as string) ?? address);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      className="wallet-gate-modal"
      role="dialog"
      aria-modal="true"
      aria-labelledby="wallet-gate-title"
      data-wallet-gate="required"
    >
      <div className="wallet-gate-modal__backdrop" aria-hidden="true" />
      <div className="wallet-gate-modal__card">
        <Wallet className="wallet-gate-modal__icon" aria-hidden />
        <h2 id="wallet-gate-title" className="wallet-gate-modal__title">
          {t.walletGateTitle}
        </h2>
        <p className="wallet-gate-modal__body">{t.walletGateBody}</p>
        <form className="wallet-gate-modal__form" onSubmit={saveWallet}>
          <Label htmlFor="wallet-gate-address">{t.integrationWalletLabel}</Label>
          <Input
            id="wallet-gate-address"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="G…"
            spellCheck={false}
            autoFocus
            className="perf"
            autoComplete="off"
          />
          <p className="wallet-gate-modal__hint">{t.integrationWalletHint}</p>
          {error && (
            <p className="tone tone--warning text-sm" role="alert">
              {error}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" disabled={busy}>
            {busy ? t.creating : t.integrationWalletSave}
          </Button>
        </form>
      </div>
    </div>
  );
}
