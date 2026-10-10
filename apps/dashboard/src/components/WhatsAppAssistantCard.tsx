"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

type WaStatus = {
  configured: boolean;
  app_live?: boolean;
  linked_phone: string | null;
  webhook_url?: string;
  from?: string | null;
};

/** Link merchant phone to ViaPay WhatsApp assistant (Meta Cloud API). */
export function WhatsAppAssistantCard({ apiKey }: { apiKey: string | null }) {
  const { t } = useLocale();
  const [status, setStatus] = useState<WaStatus | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [expires, setExpires] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await fetch(`${API}/v1/whatsapp/status`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const body = (await res.json()) as WaStatus & { error?: string };
      if (!res.ok) throw new Error(body.error ?? t.waStatusFail);
      setStatus(body);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.waStatusFail);
    }
  }, [apiKey, t.waStatusFail]);

  useEffect(() => {
    void load();
  }, [load]);

  async function genCode() {
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/v1/whatsapp/link-code`, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const body = (await res.json()) as {
        code?: string;
        expires_at?: string;
        error?: string;
      };
      if (!res.ok || !body.code) {
        throw new Error(body.error ?? t.waCodeFail);
      }
      setCode(body.code);
      setExpires(body.expires_at ?? null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t.waCodeFail);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium text-[var(--text)] flex items-center gap-2">
        <MessageCircle className="size-4" aria-hidden />
        {t.waTitle}
      </h3>
      <p className="text-sm text-[var(--text-2)]">{t.waBody}</p>
      {status && !status.configured && (
        <p className="tone tone--warning text-sm" role="status">
          {t.waNotConfigured}
        </p>
      )}
      {status?.configured && status.app_live !== true && (
        <p className="tone tone--warning text-sm" role="status">
          {t.waPendingLive}
        </p>
      )}
      {status?.linked_phone && (
        <p className="text-xs text-[var(--text-2)]">
          {t.waLinked}: <code className="perf">{status.linked_phone}</code>
        </p>
      )}
      <ol className="text-xs text-[var(--text-2)] grid gap-1 list-decimal pl-4">
        <li>{t.waStep1}</li>
        <li>{t.waStep2}</li>
        <li>{t.waStep3}</li>
        <li>{t.waStep4}</li>
      </ol>
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          disabled={busy || !apiKey}
          onClick={() => void genCode()}
        >
          {busy ? (
            <>
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
              {t.creating}
            </>
          ) : (
            t.waGenCode
          )}
        </Button>
      </div>
      {code && (
        <p className="text-sm">
          {t.waSendCode}{" "}
          <code className="perf text-[var(--primary)]">vincular {code}</code>
          {expires && (
            <span className="text-xs text-[var(--text-2)] block">
              {t.waCodeExpires}: {new Date(expires).toLocaleTimeString()}
            </span>
          )}
        </p>
      )}
      {error && (
        <p className="tone tone--warning text-sm" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
