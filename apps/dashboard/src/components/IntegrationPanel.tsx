"use client";

import { useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { isValidStellarPubkey } from "@viapay/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

function maskKey(key: string): string {
  if (key.length <= 16) return `${key.slice(0, 8)}…`;
  return `${key.slice(0, 12)}…${key.slice(-4)}`;
}

export function IntegrationPanel({
  apiKey,
  merchantWallet,
}: {
  apiKey: string | null;
  merchantWallet: string | null;
}) {
  const { t } = useLocale();
  const [wallet, setWallet] = useState(merchantWallet ?? "");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWallet, setCurrentWallet] = useState(merchantWallet);

  if (!apiKey) return null;

  async function copyKey() {
    await navigator.clipboard.writeText(apiKey!);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  async function saveWallet(e: React.FormEvent) {
    e.preventDefault();
    const address = wallet.trim();
    if (!isValidStellarPubkey(address)) {
      setError(t.errResellerWallet);
      return;
    }
    setBusy(true);
    setError(null);
    setSaved(false);
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
      setCurrentWallet(body.address ?? address);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="panel panel--integration">
      <div className="panel__head">
        <h2 className="panel-title">{t.integrationTitle}</h2>
        <p>{t.integrationDesc}</p>
      </div>
      <div className="panel__body grid gap-5">
        <div className="grid gap-2">
          <Label>{t.integrationKeyLabel}</Label>
          <div className="flex flex-wrap items-center gap-2">
            <code className="perf text-sm">{maskKey(apiKey)}</code>
            <Button type="button" size="sm" variant="outline" onClick={copyKey}>
              {copied ? (
                <>
                  <Check className="size-3.5" aria-hidden />
                  {t.copied}
                </>
              ) : (
                <>
                  <Copy className="size-3.5" aria-hidden />
                  {t.copy}
                </>
              )}
            </Button>
            <Button type="button" size="sm" variant="ghost" asChild>
              <a href="/docs">
                {t.integrationDocs}
                <ExternalLink className="size-3.5" aria-hidden />
              </a>
            </Button>
          </div>
          <p className="text-xs text-[var(--text-2)]">{t.integrationKeyHint}</p>
        </div>

        <form className="grid gap-2" onSubmit={saveWallet}>
          <Label htmlFor="merchant-wallet">{t.integrationWalletLabel}</Label>
          <Input
            id="merchant-wallet"
            value={wallet}
            onChange={(e) => setWallet(e.target.value)}
            placeholder="G…"
            spellCheck={false}
            className="perf"
          />
          <p className="text-xs text-[var(--text-2)]">{t.integrationWalletHint}</p>
          {!currentWallet && (
            <p className="tone tone--warning text-sm" role="status">
              {t.integrationNoWallet}
            </p>
          )}
          {error && (
            <p className="tone tone--warning text-sm" role="alert">
              {error}
            </p>
          )}
          {saved && (
            <p className="text-sm text-[var(--primary)]" role="status">
              {t.integrationWalletSaved}
            </p>
          )}
          <div>
            <Button type="submit" size="sm" disabled={busy}>
              {busy ? t.creating : t.integrationWalletSave}
            </Button>
          </div>
        </form>
      </div>
    </section>
  );
}
