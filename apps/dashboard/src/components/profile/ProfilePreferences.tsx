"use client";

import { useEffect, useState } from "react";
import {
  LOCALES,
  LOCALE_NAME,
  THEME_KEY,
  applyTheme,
  resolveTheme,
  type Locale,
  type Theme,
} from "@viapay/prefs";
import { FiatCurrencySelect } from "@/components/FiatCurrencySelect";
import { Label } from "@/components/ui/label";
import { useLocale } from "@/lib/i18n";

export function ProfilePreferences() {
  const { t, locale, setLocale } = useLocale();
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const pinned = document.documentElement.getAttribute("data-theme");
    if (pinned === "dark" || pinned === "light") {
      setTheme(pinned);
      return;
    }
    setTheme(resolveTheme(localStorage.getItem(THEME_KEY)));
  }, []);

  function pickTheme(next: Theme) {
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
    setTheme(next);
  }

  return (
    <section className="profile-card" id="profile-prefs">
      <header className="profile-card__head">
        <h3 className="profile-card__title">{t.profilePrefsTitle}</h3>
        <p className="profile-card__desc">{t.profilePrefsDesc}</p>
      </header>
      <div className="profile-card__body profile-form">
        <div className="grid gap-2">
          <Label htmlFor="profile-locale">{t.profileLocaleLabel}</Label>
          <select
            id="profile-locale"
            className="fiat-select"
            value={locale}
            onChange={(e) => setLocale(e.target.value as Locale)}
          >
            {LOCALES.map((code) => (
              <option key={code} value={code}>
                {LOCALE_NAME[code]}
              </option>
            ))}
          </select>
        </div>

        <div className="grid gap-2">
          <span className="text-sm font-medium text-[var(--text)]">
            {t.profileThemeLabel}
          </span>
          <div className="profile-seg" role="group" aria-label={t.profileThemeLabel}>
            <button
              type="button"
              className={`profile-seg__btn${theme === "light" ? " is-active" : ""}`}
              onClick={() => pickTheme("light")}
            >
              {t.profileThemeLight}
            </button>
            <button
              type="button"
              className={`profile-seg__btn${theme === "dark" ? " is-active" : ""}`}
              onClick={() => pickTheme("dark")}
            >
              {t.profileThemeDark}
            </button>
          </div>
        </div>

        <FiatCurrencySelect
          id="profile-fiat"
          label={t.profileFiatLabel}
          hint={t.profileFiatHint}
        />
      </div>
    </section>
  );
}
