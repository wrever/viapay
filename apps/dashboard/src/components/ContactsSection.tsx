"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

export type Contact = {
  id: string;
  display_name: string;
  phone_e164: string | null;
  email: string | null;
};

export function ContactsSection({ apiKey }: { apiKey: string | null }) {
  const { t } = useLocale();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiKey) return;
    try {
      const res = await fetch(`${API}/v1/contacts`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const body = (await res.json()) as {
        data?: Contact[];
        error?: string;
      };
      if (!res.ok) throw new Error(body.error ?? t.contactsLoadFail);
      setContacts(body.data ?? []);
    } catch (e) {
      setError(e instanceof Error ? e.message : t.contactsLoadFail);
    }
  }, [apiKey, t.contactsLoadFail]);

  useEffect(() => {
    void load();
  }, [load]);

  async function onAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!apiKey) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`${API}/v1/contacts`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          display_name: name.trim(),
          phone_e164: phone.trim() || null,
          email: email.trim() || null,
        }),
      });
      const body = (await res.json()) as Contact & { error?: string };
      if (!res.ok) throw new Error(body.error ?? t.contactsSaveFail);
      setName("");
      setPhone("");
      setEmail("");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : t.contactsSaveFail);
    } finally {
      setBusy(false);
    }
  }

  async function onDelete(id: string) {
    if (!apiKey) return;
    setBusy(true);
    try {
      await fetch(`${API}/v1/contacts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      await load();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-3">
      <h3 className="text-sm font-medium text-[var(--text)]">{t.contactsTitle}</h3>
      <p className="text-sm text-[var(--text-2)]">{t.contactsBody}</p>
      <form className="grid gap-2 sm:grid-cols-4" onSubmit={(e) => void onAdd(e)}>
        <div className="grid gap-1 sm:col-span-1">
          <Label htmlFor="ct-name">{t.contactsName}</Label>
          <Input
            id="ct-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="Juanito"
          />
        </div>
        <div className="grid gap-1 sm:col-span-1">
          <Label htmlFor="ct-phone">{t.contactsPhone}</Label>
          <Input
            id="ct-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+54911…"
          />
        </div>
        <div className="grid gap-1 sm:col-span-1">
          <Label htmlFor="ct-email">{t.contactsEmail}</Label>
          <Input
            id="ct-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="mail@…"
          />
        </div>
        <div className="flex items-end">
          <Button type="submit" size="sm" disabled={busy || !apiKey}>
            {busy ? (
              <Loader2 className="size-3.5 animate-spin" aria-hidden />
            ) : (
              t.contactsAdd
            )}
          </Button>
        </div>
      </form>
      {error && (
        <p className="tone tone--warning text-sm" role="alert">
          {error}
        </p>
      )}
      {contacts.length > 0 && (
        <ul className="text-sm grid gap-1">
          {contacts.map((c) => (
            <li
              key={c.id}
              className="flex flex-wrap items-center justify-between gap-2"
            >
              <span>
                <span className="text-[var(--text)] font-medium">
                  {c.display_name}
                </span>{" "}
                <span className="text-[var(--text-2)] text-xs">
                  {c.phone_e164 ?? c.email}
                </span>
              </span>
              <Button
                type="button"
                size="sm"
                variant="ghost"
                disabled={busy}
                onClick={() => void onDelete(c.id)}
                aria-label={t.contactsDelete}
              >
                <Trash2 className="size-3.5" aria-hidden />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
