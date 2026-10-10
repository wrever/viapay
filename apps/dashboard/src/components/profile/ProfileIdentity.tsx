"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { AccountProfile } from "@/lib/account-types";
import { patchAccountProfile } from "@/lib/me-client";
import { useLocale } from "@/lib/i18n";
import { isValidE164, sanitizePhoneInput } from "@/lib/phone-e164";
import { syncSessionDisplayName } from "@/lib/session-name-client";
import { ProfileSection } from "./ProfileSection";
import { useClearFlash } from "./useClearFlash";

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
  const [ok, setOk] = useClearFlash();
  const dirty =
    name.trim() !== profile.name ||
    (businessName.trim() || "") !== (profile.business_name ?? "") ||
    (phone.trim() || "") !== (profile.phone_e164 ?? "");

  useEffect(() => {
    setName(profile.name);
    setBusinessName(profile.business_name ?? "");
    setPhone(profile.phone_e164 ?? "");
  }, [profile.id, profile.name, profile.business_name, profile.phone_e164]);

  async function save(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setOk(false);
    const phoneTrim = phone.trim();
    if (phoneTrim && !isValidE164(phoneTrim)) {
      setError(t.profilePhoneHint);
      setSaving(false);
      return;
    }
    try {
      const account = await patchAccountProfile(apiKey, {
        name: name.trim(),
        business_name: businessName.trim() || null,
        phone_e164: phoneTrim || null,
      });
      await syncSessionDisplayName(account.name);
      onUpdated(account);
      setOk(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.profileSaveError);
    } finally {
      setSaving(false);
    }
  }

  return (
    <ProfileSection
      id="profile-identity"
      title={t.profileIdentityTitle}
      desc={t.profileIdentityDesc}
      testId="profile-identity"
    >
      <form className="profile-form" onSubmit={save}>
        <div className="grid gap-2">
          <Label htmlFor="profile-name">{t.profileNameLabel}</Label>
          <Input
            id="profile-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            autoComplete="name"
            required
            maxLength={80}
            data-testid="profile-name"
          />
          <p className="profile-field-hint profile-field-hint--end">
            {t.profileNameCount(name.trim().length)}
          </p>
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
            onChange={(e) => setPhone(sanitizePhoneInput(e.target.value))}
            placeholder="+56912345678"
            inputMode="tel"
            autoComplete="tel"
          />
          <p className="profile-field-hint">{t.profilePhoneHint}</p>
        </div>
        <div aria-live="polite">
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
        </div>
        <div className="profile-form__actions">
          <Button type="submit" disabled={saving || !dirty}>
            {saving ? t.profileSaving : t.profileSave}
          </Button>
        </div>
      </form>
    </ProfileSection>
  );
}
