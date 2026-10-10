"use client";

import { useState, type FormEvent } from "react";
import { KeyRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useLocale } from "@/lib/i18n";

export function ProfilePassword() {
  const { t } = useLocale();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);
  const mismatch = confirm.length > 0 && password !== confirm;

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(false);

    if (password.length < 8) {
      setError(t.profilePasswordTooShort);
      return;
    }
    if (password !== confirm) {
      setError(t.profilePasswordMismatch);
      return;
    }

    const sb = createSupabaseBrowser();
    if (!sb) {
      setError(t.profilePasswordNoAuth);
      return;
    }

    setSaving(true);
    try {
      const { error: updErr } = await sb.auth.updateUser({ password });
      if (updErr) throw updErr;
      setPassword("");
      setConfirm("");
      setOk(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : t.profilePasswordError,
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-card" id="profile-password">
      <header className="profile-card__head">
        <h3 className="profile-card__title">
          <KeyRound className="inline size-4 mr-1.5 align-[-2px]" aria-hidden />
          {t.profilePasswordTitle}
        </h3>
        <p className="profile-card__desc">{t.profilePasswordDesc}</p>
      </header>
      <form className="profile-card__body profile-form" onSubmit={save}>
        <div className="grid gap-2">
          <Label htmlFor="profile-pass">{t.profilePasswordNew}</Label>
          <Input
            id="profile-pass"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
          <p className="profile-field-hint">{t.profilePasswordTooShort}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-pass2">{t.profilePasswordConfirm}</Label>
          <Input
            id="profile-pass2"
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            minLength={8}
            required
            aria-invalid={mismatch || undefined}
          />
          {mismatch ? (
            <p className="tone tone--error" role="status">
              {t.profilePasswordMismatch}
            </p>
          ) : null}
        </div>
        {error ? (
          <p className="tone tone--error" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="tone tone--success" role="status">
            {t.profilePasswordOk}
          </p>
        ) : null}
        <div className="profile-form__actions">
          <Button
            type="submit"
            variant="secondary"
            disabled={saving || mismatch || password.length < 8}
          >
            {saving ? t.profileSaving : t.profilePasswordSave}
          </Button>
        </div>
      </form>
    </section>
  );
}
