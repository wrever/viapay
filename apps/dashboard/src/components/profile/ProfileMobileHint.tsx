"use client";

import { useLocale } from "@/lib/i18n";

/** Compact tip under the hero on narrow viewports. */
export function ProfileMobileHint() {
  const { t } = useLocale();
  return (
    <p className="profile-mobile-hint">{t.profileShortcutsDesc}</p>
  );
}
