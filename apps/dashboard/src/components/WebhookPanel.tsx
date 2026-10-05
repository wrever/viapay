"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

type Endpoint = { id: string; url: string; status: string };
type Delivery = {
  id: string;
  status: string;
  attempts: number;
  last_error: string | null;
  type: string;
  url: string;
};

export function WebhookPanel({
  apiKey,
  initial,
}: {
  apiKey: string | null;
  initial: Endpoint[];
}) {
  const { t } = useLocale();
  const [url, setUrl] = useState("");
  const [endpoints, setEndpoints] = useState(initial);
  const [secret, setSecret] = useState<string | null>(null);
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function create(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/v1/webhook_endpoints`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? t.webhooksCreateFail);
      setSecret(body.secret);
      setEndpoints((prev) => [
        { id: body.id, url: body.url, status: body.status },
        ...prev,
      ]);
      setUrl("");
    } catch (err) {
      setError(err instanceof Error ? err.message : t.errGeneric);
    } finally {
      setBusy(false);
    }
  }

  async function refreshDeliveries() {
    if (!apiKey) return;
    const res = await fetch(`${API}/v1/webhook_deliveries`, {
      headers: { Authorization: `Bearer ${apiKey}` },
    });
    const body = await res.json();
    if (res.ok) setDeliveries(body.data ?? []);
  }

  return (
    <section className="hooks">
      <div className="hooks__head">
        <div>
          <h2 className="panel-title">{t.webhooksTitle}</h2>
        </div>
      </div>
      <form className="hooks__form" onSubmit={create}>
        <Label className="sr-only" htmlFor="webhook-url">
          URL
        </Label>
        <Input
          id="webhook-url"
          type="url"
          required
          placeholder="https://tu-app.com/webhooks/viapay"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="min-w-64 flex-1"
        />
        <Button type="submit" disabled={busy || !apiKey}>
          {t.webhooksSave}
        </Button>
        <Button type="button" variant="outline" onClick={refreshDeliveries}>
          {t.webhooksDeliveries}
        </Button>
      </form>
      {secret && <p className="hooks__secret perf">{secret}</p>}
      {error && <p className="mt-2 text-sm text-[var(--error)]">{error}</p>}
      {endpoints.length > 0 && (
        <ul className="hooks__list">
          {endpoints.map((endpoint) => (
            <li key={endpoint.id} className="hooks__item">
              {endpoint.url}
            </li>
          ))}
        </ul>
      )}
      {deliveries.length > 0 && (
        <ul className="mt-3 grid gap-1 text-xs text-[var(--text-2)]">
          {deliveries.map((delivery) => (
            <li key={delivery.id}>
              {delivery.status} · {t.webhooksAttempts(delivery.attempts)}
              {delivery.last_error ? ` · ${delivery.last_error}` : ""}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
