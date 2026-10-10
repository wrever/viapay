"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { AccountProfile } from "@/lib/account-types";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";
import { ProfileAccountMeta } from "./ProfileAccountMeta";
import { ProfileDangerZone } from "./ProfileDangerZone";
import { ProfileHero } from "./ProfileHero";
import { ProfileIdentity } from "./ProfileIdentity";
import { ProfileLoading } from "./ProfileLoading";
import { ProfileNotifications } from "./ProfileNotifications";
import { ProfilePassword } from "./ProfilePassword";
import { ProfilePreferences } from "./ProfilePreferences";
import { ProfileScrollNav } from "./ProfileScrollNav";
import { ProfileSecurity } from "./ProfileSecurity";
import { ProfileShortcuts } from "./ProfileShortcuts";

export function ProfilePanel({
  apiKey,
  sessionName,
  sessionEmail,
  onGoWallet,
  onGoNotices,
  onNameChange,
}: {
  apiKey: string | null;
  sessionName: string;
  sessionEmail: string;
  onGoWallet: () => void;
  onGoNotices: () => void;
  onNameChange?: (name: string) => void;
}) {
  const { t } = useLocale();
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [loading, setLoading] = useState(Boolean(apiKey));
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!apiKey) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/v1/me`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const data = (await res.json()) as {
        account?: AccountProfile;
        error?: string;
      };
      if (!res.ok || !data.account) {
        throw new Error(data.error || t.profileLoadError);
      }
      setProfile(data.account);
    } catch (err) {
      setError(err instanceof Error ? err.message : t.profileLoadError);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  }, [apiKey, t.profileLoadError]);

  useEffect(() => {
    void load();
  }, [load]);

  const name = profile?.name ?? sessionName;
  const email = profile?.email ?? sessionEmail;

  function handleUpdated(next: AccountProfile) {
    setProfile(next);
    onNameChange?.(next.name);
  }

  return (
    <section className="panel panel--profile" id="perfil">
      <div className="panel__head">
        <h2 className="panel-title">{t.profileTitle}</h2>
        <p>{t.profileDesc}</p>
      </div>
      <div className="panel__body profile-layout">
        <ProfileHero
          name={name}
          email={email}
          businessName={profile?.business_name}
        />
        <ProfileScrollNav />

        {loading ? <ProfileLoading /> : null}
        {error ? (
          <div className="profile-error" role="alert">
            <p className="tone tone--error">{error}</p>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => void load()}
            >
              {t.webhooksRefresh}
            </Button>
          </div>
        ) : null}

        {!apiKey ? (
          <p className="tone tone--warning" role="status">
            {t.missingKey}
          </p>
        ) : null}

        <div className="profile-grid">
          {profile && apiKey ? (
            <ProfileIdentity
              apiKey={apiKey}
              profile={profile}
              onUpdated={handleUpdated}
            />
          ) : null}
          <ProfilePreferences />
          {profile && apiKey ? (
            <ProfileNotifications
              apiKey={apiKey}
              profile={profile}
              onUpdated={handleUpdated}
            />
          ) : null}
          <ProfileSecurity />
          <ProfilePassword />
          <ProfileShortcuts
            wallet={profile?.merchant_wallet ?? null}
            onGoWallet={onGoWallet}
            onGoNotices={onGoNotices}
          />
          {profile ? <ProfileAccountMeta profile={profile} /> : null}
          <ProfileDangerZone />
        </div>
      </div>
    </section>
  );
}
