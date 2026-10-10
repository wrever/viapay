"use client";

import type { Theme } from "@viapay/prefs";
import { useLocale } from "@/lib/i18n";

/** Tiny swatches that mirror the active theme choice. */
export function ProfileThemePreview({ theme }: { theme: Theme }) {
  const { t } = useLocale();
  return (
    <div
      className={`profile-theme-preview is-${theme}`}
      aria-hidden
      title={theme === "dark" ? t.profileThemeDark : t.profileThemeLight}
    >
      <span className="profile-theme-preview__bg" />
      <span className="profile-theme-preview__fg" />
      <span className="profile-theme-preview__accent" />
    </div>
  );
}
