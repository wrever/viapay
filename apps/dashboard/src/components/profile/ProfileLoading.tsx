"use client";

import { useLocale } from "@/lib/i18n";

export function ProfileLoading({ cards = 2 }: { cards?: number }) {
  const { t } = useLocale();
  return (
    <div className="profile-skeleton" role="status" aria-busy="true">
      <span className="sr-only">{t.profileLoading}</span>
      <div className="profile-skeleton__bar" />
      <div className="profile-skeleton__bar profile-skeleton__bar--short" />
      {Array.from({ length: cards }, (_, i) => (
        <div key={i} className="profile-skeleton__card" />
      ))}
    </div>
  );
}
