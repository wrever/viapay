"use client";

import { useLocale } from "@/lib/i18n";

export function ProfileEmptyKey() {
  const { t } = useLocale();
  return (
    <div className="profile-empty-key" role="status" data-testid="profile-empty-key">
      <p className="tone tone--warning">{t.missingKey}</p>
      <p className="profile-field-hint">{t.profileDesc}</p>
    </div>
  );
}
