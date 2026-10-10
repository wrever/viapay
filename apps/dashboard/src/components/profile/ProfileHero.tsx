"use client";

import { profileInitials } from "@/lib/profile-initials";
import { useLocale } from "@/lib/i18n";
import { ProfileStatusBadge } from "./ProfileStatusBadge";
import { ProfileWalletChip } from "./ProfileWalletChip";

export function ProfileHero({
  name,
  email,
  businessName,
  status,
  wallet,
  onGoWallet,
}: {
  name: string;
  email: string;
  businessName?: string | null;
  status?: string | null;
  wallet?: string | null;
  onGoWallet?: () => void;
}) {
  const { t } = useLocale();
  const mark = profileInitials(name, email);

  return (
    <div className="profile-hero" data-testid="profile-hero">
      <span className="profile-hero__avatar" aria-hidden>
        {mark}
      </span>
      <div className="profile-hero__copy">
        <div className="profile-hero__title-row">
          <h2 className="profile-hero__name">{name}</h2>
          {status ? <ProfileStatusBadge status={status} /> : null}
        </div>
        {businessName ? (
          <p className="profile-hero__biz">{businessName}</p>
        ) : null}
        <p className="profile-hero__email">{email}</p>
        {onGoWallet ? (
          <div className="profile-hero__wallet">
            <ProfileWalletChip
              wallet={wallet ?? null}
              onGoWallet={onGoWallet}
            />
          </div>
        ) : null}
        <p className="profile-hero__hint">{t.profileHeroHint}</p>
      </div>
    </div>
  );
}
