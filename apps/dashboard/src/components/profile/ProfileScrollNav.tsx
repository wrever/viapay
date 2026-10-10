"use client";

import { useLocale } from "@/lib/i18n";
import { PROFILE_ANCHORS } from "./profile-anchors";
import { scrollToProfileAnchor } from "./scrollToProfileAnchor";

const ANCHOR_KEYS = [
  "identity",
  "prefs",
  "notify",
  "security",
  "password",
] as const;

const ANCHORS = PROFILE_ANCHORS.map((id, i) => ({
  id,
  key: ANCHOR_KEYS[i]!,
}));

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
            <a
              className="profile-scroll-nav__link"
              href={`#${id}`}
              onClick={(e) => {
                e.preventDefault();
                scrollToProfileAnchor(id);
              }}
            >
              {labels[key]}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
