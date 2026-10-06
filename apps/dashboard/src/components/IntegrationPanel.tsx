"use client";

import { useMemo, useState } from "react";
import { Check, Copy, ExternalLink } from "lucide-react";
import { isValidStellarPubkey } from "@viapay/shared";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";
import { FiatCurrencySelect } from "@/components/FiatCurrencySelect";
import { TrustlinesSection } from "@/components/TrustlinesSection";

function maskKey(key: string): string {
  if (key.length <= 16) return `${key.slice(0, 8)}…`;
  return `${key.slice(0, 12)}…${key.slice(-4)}`;
}

function CopySnippet({
  label,
  value,
  copyLabel,
  copiedLabel,
}: {
  label: string;
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label>{label}</Label>
        <Button type="button" size="sm" variant="outline" onClick={copy}>
          {copied ? (
            <>
              <Check className="size-3.5" aria-hidden />
              {copiedLabel}
            </>
          ) : (
            <>
              <Copy className="size-3.5" aria-hidden />
              {copyLabel}
            </>
          )}
        </Button>
      </div>
      <pre className="integration-snippet perf overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-3 text-xs leading-relaxed whitespace-pre-wrap break-all">
        {value}
      </pre>
    </div>
  );
}

export function IntegrationPanel({
  apiKey,
  merchantWallet,
  network = "testnet",
  onWalletSaved,
  onTrustlineActivated,
}: {
  apiKey: string | null;
  merchantWallet: string | null;
  network?: string;
  onWalletSaved?: (address: string) => void;
  onTrustlineActivated?: () => void;
}) {
  const { t } = useLocale();
  const [wallet, setWallet] = useState(merchantWallet ?? "");
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentWallet, setCurrentWallet] = useState(merchantWallet);

  const curlSnippet = useMemo(
    () => `curl -s -X POST ${API}/v1/payment_intents \\
  -H "Authorization: Bearer $VIAPAY_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "amount": "10.0000000",
    "asset": "XLM",
    "external_user_id": "user_42",
    "success_url": "https://tu-app.example/gracias"
  }'`,
    [],
  );

  const sdkSnippet = useMemo(
    () => `import { ViaPay } from "@viapay/sdk";

const via = new ViaPay({
  apiKey: process.env.VIAPAY_API_KEY!,
  baseUrl: "${API}",
});

const link = await via.createPaymentLink({
  amount: "10",
  asset: "XLM",
  externalUserId: "user_42",
  successUrl: "https://tu-app.example/gracias",
});
// Redirigí → link.url`,
    [],
  );

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
      const savedAddress = (body.address as string) ?? address;
      setCurrentWallet(savedAddress);
      setSaved(true);
      onWalletSaved?.(savedAddress);
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
      <div className="panel__body grid gap-6">
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

        <FiatCurrencySelect id="integration-fiat" />

        <TrustlinesSection
          apiKey={apiKey}
          network={network}
          merchantWallet={currentWallet}
          onActivated={onTrustlineActivated}
        />

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
          <p className="text-xs text-[var(--text-2)]">{t.integrationKeyExplain}</p>
        </div>

        <div className="grid gap-2">
          <h3 className="text-sm font-medium text-[var(--text)]">
            {t.integrationUsersTitle}
          </h3>
          <p className="text-sm text-[var(--text-2)]">{t.integrationUsersBody}</p>
        </div>

        <div className="grid gap-4">
          <h3 className="text-sm font-medium text-[var(--text)]">
            {t.integrationSnippetTitle}
          </h3>
          <CopySnippet
            label={t.integrationSnippetCurl}
            value={curlSnippet}
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
          <CopySnippet
            label={t.integrationSnippetSdk}
            value={sdkSnippet}
            copyLabel={t.copy}
            copiedLabel={t.copied}
          />
        </div>

        <p className="text-sm text-[var(--text-2)]">
          {t.integrationPollHint}{" "}
          <a className="underline underline-offset-2" href="/docs">
            {t.integrationDocs}
          </a>
          .
        </p>
      </div>
    </section>
  );
}
