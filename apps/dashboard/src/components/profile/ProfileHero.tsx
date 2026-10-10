"use client";

import { profileInitials } from "@/lib/profile-initials";
import { useLocale } from "@/lib/i18n";

export function ProfileHero({
  name,
  email,
  businessName,
}: {
  name: string;
  email: string;
  businessName?: string | null;
}) {
  const { t } = useLocale();
  const mark = profileInitials(name, email);

  return (
    <div className="profile-hero" data-testid="profile-hero">
      <span className="profile-hero__avatar" aria-hidden>
        {mark}
      </span>
      <div className="profile-hero__copy">
        <h2 className="profile-hero__name">{name}</h2>
        {businessName ? (
          <p className="profile-hero__biz">{businessName}</p>
        ) : null}
        <p className="profile-hero__email">{email}</p>
        <p className="profile-hero__hint">{t.profileHeroHint}</p>
      </div>
    </div>
  );
}
