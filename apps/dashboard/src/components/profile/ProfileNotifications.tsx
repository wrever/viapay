"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AccountProfile } from "@/lib/account-types";
import { patchAccountProfile } from "@/lib/me-client";
import { useLocale } from "@/lib/i18n";
import { ProfileSection } from "./ProfileSection";
import { useClearFlash } from "./useClearFlash";

export function ProfileNotifications({
  apiKey,
  profile,
  onUpdated,
}: {
  apiKey: string;
  profile: AccountProfile;
  onUpdated: (next: AccountProfile) => void;
}) {
  const { t } = useLocale();
  const [emailPaid, setEmailPaid] = useState(profile.notify_email_paid);
  const [waPaid, setWaPaid] = useState(profile.notify_wa_paid);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useClearFlash();
  const dirty =
    emailPaid !== profile.notify_email_paid ||
    waPaid !== profile.notify_wa_paid;

  useEffect(() => {
    setEmailPaid(profile.notify_email_paid);
    setWaPaid(profile.notify_wa_paid);
  }, [profile.id, profile.notify_email_paid, profile.notify_wa_paid]);

  async function save() {
    setSaving(true);
    setError(null);
    setOk(false);
    try {
      const account = await patchAccountProfile(apiKey, {
        notify_email_paid: emailPaid,
        notify_wa_paid: waPaid,
      });
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
      id="profile-notify"
      title={t.profileNotifyTitle}
      desc={t.profileNotifyDesc}
      testId="profile-notify"
    >
      <div className="profile-form">
        <label className="profile-switch">
          <input
            type="checkbox"
            checked={emailPaid}
            onChange={(e) => setEmailPaid(e.target.checked)}
          />
          <span>
            <span className="profile-switch__label">{t.profileNotifyEmail}</span>
            <span className="profile-switch__hint">{t.profileNotifyEmailHint}</span>
          </span>
        </label>
        <label className="profile-switch">
          <input
            type="checkbox"
            checked={waPaid}
            onChange={(e) => setWaPaid(e.target.checked)}
          />
          <span>
            <span className="profile-switch__label">{t.profileNotifyWa}</span>
            <span className="profile-switch__hint">{t.profileNotifyWaHint}</span>
          </span>
        </label>
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
          <Button
            type="button"
            variant="secondary"
            disabled={saving || !dirty}
            onClick={() => void save()}
          >
            {saving ? t.profileSaving : t.profileSave}
          </Button>
        </div>
      </div>
    </ProfileSection>
  );
}
