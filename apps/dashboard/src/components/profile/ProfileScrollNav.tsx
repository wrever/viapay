"use client";

import { useLocale } from "@/lib/i18n";

const ANCHORS = [
  { id: "profile-identity", key: "identity" as const },
  { id: "profile-prefs", key: "prefs" as const },
  { id: "profile-notify", key: "notify" as const },
  { id: "profile-security", key: "security" as const },
  { id: "profile-password", key: "password" as const },
] as const;

export function ProfileScrollNav() {
  const { t } = useLocale();
  const labels: Record<(typeof ANCHORS)[number]["key"], string> = {
    identity: t.profileIdentityTitle,
    prefs: t.profilePrefsTitle,
    notify: t.profileNotifyTitle,
    security: t.profileSecurityTitle,
    password: t.profilePasswordTitle,
  };

  return (
    <nav className="profile-scroll-nav" aria-label={t.profileTitle}>
      <ul className="profile-scroll-nav__list">
        {ANCHORS.map(({ id, key }) => (
          <li key={id}>
            <a className="profile-scroll-nav__link" href={`#${id}`}>
              {labels[key]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
