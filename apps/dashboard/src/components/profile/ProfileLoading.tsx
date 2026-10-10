"use client";

import { useLocale } from "@/lib/i18n";

export function ProfileLoading() {
  const { t } = useLocale();
  return (
    <div className="profile-skeleton" role="status" aria-busy="true">
      <span className="sr-only">{t.profileLoading}</span>
      <div className="profile-skeleton__bar" />
      <div className="profile-skeleton__bar profile-skeleton__bar--short" />
      <div className="profile-skeleton__card" />
      <div className="profile-skeleton__card" />
    </div>
  );
}
