"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountProfile } from "@/lib/account-types";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

export function ProfileIdentity({
  apiKey,
  profile,
  onUpdated,
}: {
  apiKey: string;
  profile: AccountProfile;
  onUpdated: (next: AccountProfile) => void;
}) {
  const { t } = useLocale();
  const [name, setName] = useState(profile.name);
  const [businessName, setBusinessName] = useState(profile.business_name ?? "");
  const [phone, setPhone] = useState(profile.phone_e164 ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const res = await fetch(`${API}/v1/me`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          business_name: businessName.trim() || null,
          phone_e164: phone.trim() || null,
        }),
      });
      const data = (await res.json()) as {
        account?: AccountProfile;
        error?: string;
      };
      if (!res.ok || !data.account) {
        throw new Error(data.error || t.profileSaveError);
      }
      await fetch("/auth/session-name", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: data.account.name }),
      });
      onUpdated(data.account);
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.profileSaveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="profile-card" id="profile-identity">
      <header className="profile-card__head">
        <h3 className="profile-card__title">{t.profileIdentityTitle}</h3>
        <p className="profile-card__desc">{t.profileIdentityDesc}</p>
      </header>
      <form className="profile-card__body profile-form" onSubmit={save}>
        <div className="grid gap-2">
          <Label htmlFor="profile-name">{t.profileNameLabel}</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            maxLength={80}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-biz">{t.profileBusinessLabel}</Label>
          <Input
            id="profile-biz"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            placeholder={t.profileBusinessPlaceholder}
            maxLength={120}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-email">{t.profileEmailLabel}</Label>
          <Input
            id="profile-email"
            value={profile.email}
            readOnly
            disabled
          />
          <p className="profile-field-hint">{t.profileEmailHint}</p>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="profile-phone">{t.profilePhoneLabel}</Label>
          <Input
            id="profile-phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+56912345678"
            inputMode="tel"
            autoComplete="tel"
          />
          <p className="profile-field-hint">{t.profilePhoneHint}</p>
        </div>
        {error ? (
          <p className="tone tone--error" role="alert">
            {error}
          </p>
        ) : null}
        {ok ? (
          <p className="tone tone--success" role="status">
            {t.profileSaveOk}
          </p>
        ) : null}
        <div className="profile-form__actions">
          <Button type="submit" disabled={saving}>
            {saving ? t.profileSaving : t.profileSave}
          </Button>
        </div>
      </form>
    </section>
  );
}
