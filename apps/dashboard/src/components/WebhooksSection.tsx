"use client";

import { useCallback, useEffect, useState } from "react";
import { Copy, Loader2, RefreshCw, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

type WebhookEndpoint = {
  id: string;
  url: string;
  status: string;
  created_at: string;
};

type WebhookDelivery = {
  id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  type: string;
  url: string;
};

export function WebhooksSection({ apiKey }: { apiKey: string | null }) {
  const { t } = useLocale();
  const [endpoints, setEndpoints] = useState<WebhookEndpoint[]>([]);
  const [deliveries, setDeliveries] = useState<WebhookDelivery[]>([]);
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [freshSecret, setFreshSecret] = useState<{
    id: string;
    secret: string;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    if (!apiKey) return;
    try {
      const [epRes, delRes] = await Promise.all([
        fetch(`${API}/v1/webhook_endpoints`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
        fetch(`${API}/v1/webhook_deliveries`, {
          headers: { Authorization: `Bearer ${apiKey}` },
        }),
      ]);
      const epBody = (await epRes.json()) as {
        data?: WebhookEndpoint[];
        error?: string;
      };
      const delBody = (await delRes.json()) as {
        data?: WebhookDelivery[];
        error?: string;
      };
      if (!epRes.ok) throw new Error(epBody.error ?? t.webhooksLoadFail);
      if (!delRes.ok) throw new Error(delBody.error ?? t.webhooksLoadFail);
      setEndpoints(epBody.data ?? []);
      setDeliveries(delBody.data ?? []);
      setError(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.webhooksLoadFail);
    }
  }, [apiKey, t.webhooksLoadFail]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    setCopied(false);
    try {
      const res = await fetch(`${API}/v1/webhook_endpoints`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url: url.trim() }),
      });
      const body = (await res.json()) as WebhookEndpoint & {
        secret?: string;
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? t.webhooksSaveFail);
      setUrl("");
      if (body.secret) {
        setFreshSecret({ id: body.id, secret: body.secret });
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.webhooksSaveFail);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!apiKey) return;
    setBusy(true);
    try {
      await fetch(`${API}/v1/webhook_endpoints/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      if (freshSecret?.id === id) setFreshSecret(null);
      await load();
    } finally {
      setBusy(false);
    }
  }

  async function copySecret() {
    if (!freshSecret) return;
    try {
      await navigator.clipboard.writeText(freshSecret.secret);
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="grid gap-1">
        <h3 className="text-sm font-medium text-[var(--text)]">
          {t.webhooksTitle}
        </h3>
        <p className="text-sm text-[var(--text-2)]">{t.webhooksBody}</p>
      </div>

      <form
        className="grid gap-2 sm:grid-cols-[1fr_auto] sm:items-end"
        onSubmit={(e) => void onAdd(e)}
      >
        <div className="grid gap-1">
          <Label htmlFor="wh-url">{t.webhooksUrlLabel}</Label>
          <Input
            id="wh-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
            placeholder="https://tu-sitio.com/webhooks/viapay"
            autoComplete="off"
          />
        </div>
        <Button type="submit" size="sm" disabled={busy || !apiKey}>
          {busy ? (
            <Loader2 className="size-3.5 animate-spin" aria-hidden />
          ) : (
            t.webhooksAdd
          )}
        </Button>
      </form>

      {freshSecret && (
        <div className="grid gap-2 rounded-md border border-[var(--border)] bg-[var(--tint)] p-3">
          <p className="text-sm text-[var(--text)]">{t.webhooksSecretOnce}</p>
          <code className="perf text-xs block break-all">
            {freshSecret.secret}
          </code>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => void copySecret()}
            >
              <Copy className="size-3.5" aria-hidden />
              {copied ? t.webhooksSecretCopied : t.webhooksCopySecret}
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => setFreshSecret(null)}
            >
              {t.webhooksDismissSecret}
            </Button>
          </div>
        </div>
      )}

      {error && (
        <p className="tone tone--warning text-sm" role="alert">
          {error}
        </p>
      )}

      {endpoints.length === 0 ? (
        <p className="text-sm text-[var(--text-2)]">{t.webhooksEmpty}</p>
      ) : (
        <ul className="text-sm grid gap-2">
          {endpoints.map((ep) => (
            <li
              key={ep.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span className="min-w-0">
                <span className="text-[var(--text)] font-medium break-all">
                  {ep.url}
                </span>{" "}
                <span className="text-[var(--text-2)] text-xs">
                  {ep.status}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onDelete(ep.id)}
                aria-label={t.webhooksDelete}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}

      <div className="grid gap-2">
        <div className="flex items-center justify-between gap-2">
          <h3 className="text-sm font-medium text-[var(--text)]">
            {t.webhooksDeliveriesTitle}
          </h3>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            disabled={busy || !apiKey}
            onClick={() => void load()}
            aria-label={t.webhooksRefresh}
          >
            <RefreshCw className="size-3.5" aria-hidden />
          </Button>
        </div>
        {deliveries.length === 0 ? (
          <p className="text-sm text-[var(--text-2)]">
            {t.webhooksDeliveriesEmpty}
          </p>
        ) : (
          <ul className="text-xs grid gap-2">
            {deliveries.map((d) => (
              <li
                key={d.id}
                className="grid gap-0.5 border-b border-[var(--border)] pb-2 last:border-0"
              >
                <span className="text-[var(--text)]">
                  {d.type || "—"} · {d.status} · {t.webhooksAttempts(d.attempts)}
                </span>
                <span className="text-[var(--text-2)] break-all">{d.url}</span>
                {d.last_error && (
                  <span className="text-[var(--warning)]">{d.last_error}</span>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
