"use client";

import { useEffect, useState } from "react";
import { Shield } from "lucide-react";
import { createSupabaseBrowser } from "@/lib/supabase-browser";
import { useLocale } from "@/lib/i18n";
import { ProfileProviderIcons } from "./ProfileProviderIcons";
import { ProfileSection } from "./ProfileSection";

export function ProfileSecurity() {
  const { t } = useLocale();
  const [providers, setProviders] = useState<string[]>([]);
  const [email, setEmail] = useState<string | null>(null);
  const [lastSignIn, setLastSignIn] = useState<string | null>(null);

  useEffect(() => {
    const sb = createSupabaseBrowser();
    if (!sb) return;
    void sb.auth.getUser().then(({ data }) => {
      const user = data.user;
      if (!user) return;
      setEmail(user.email ?? null);
      const ids = (user.identities ?? [])
        .map((i) => i.provider)
        .filter(Boolean) as string[];
      setProviders(ids.length ? ids : ["oauth"]);
      const at = user.last_sign_in_at ?? user.created_at ?? null;
      setLastSignIn(at);
    });
  }, []);

  return (
    <ProfileSection
      id="profile-security"
      title={
        <>
          <Shield className="inline size-4 mr-1.5 align-[-2px]" aria-hidden />
          {t.profileSecurityTitle}
        </>
      }
      desc={t.profileSecurityDesc}
      testId="profile-security"
    >
      <dl className="profile-meta">
        <div>
          <dt>{t.profileSecurityLogin}</dt>
          <dd className="profile-meta__row">
            <ProfileProviderIcons providers={providers} />
            <span>
              {providers.length
                ? providers.map((p) => t.profileProviderLabel(p)).join(" · ")
                : t.profileSecurityUnknown}
            </span>
          </dd>
        </div>
        {email ? (
          <div>
            <dt>{t.profileSecurityAuthEmail}</dt>
            <dd>{email}</dd>
          </div>
        ) : null}
        {lastSignIn ? (
          <div>
            <dt>{t.profileSecurityLastSignIn}</dt>
            <dd>{new Date(lastSignIn).toLocaleString()}</dd>
          </div>
        ) : null}
      </dl>
      <p className="profile-field-hint">{t.profileSecurityOauthNote}</p>
    </ProfileSection>
  );
}
