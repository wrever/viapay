"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  LOCALE_KEY,
  LOCALE_LABEL,
  LOCALE_NAME,
  LOCALES,
  detectLocale,
  type Locale,
} from "./locale";
import {
  THEME_KEY,
  applyTheme,
  resolveTheme,
  type Theme,
} from "./theme";

export type ControlMessages = {
  theme: { toLight: string; toDark: string };
  locale: { switch: string };
};

type LocaleContextValue<M> = {
  locale: Locale;
  t: M;
  label: string;
  cycleLocale: () => void;
  setLocale: (locale: Locale) => void;
};

export function createI18n<M extends ControlMessages>(
  messages: Record<Locale, M>,
) {
  const LocaleContext = createContext<LocaleContextValue<M> | null>(null);

  function LocaleProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>("es");

    useEffect(() => {
      const next = detectLocale(
        localStorage.getItem(LOCALE_KEY),
        navigator.language,
      );
      setLocaleState(next);
      document.documentElement.lang = next;
    }, []);

    const setLocale = useCallback((next: Locale) => {
      setLocaleState(next);
      localStorage.setItem(LOCALE_KEY, next);
      document.documentElement.lang = next;
    }, []);

    const cycleLocale = useCallback(() => {
      setLocaleState((current: Locale) => {
        const i = LOCALES.indexOf(current);
        const next = LOCALES[(i + 1) % LOCALES.length]!;
        localStorage.setItem(LOCALE_KEY, next);
        document.documentElement.lang = next;
        return next;
      });
    }, []);

    const value = useMemo<LocaleContextValue<M>>(
      () => ({
        locale,
        t: messages[locale],
        label: LOCALE_LABEL[locale],
        cycleLocale,
        setLocale,
      }),
      [locale, cycleLocale, setLocale],
    );

    return (
      <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>
    );
  }

  function useLocale() {
    const ctx = useContext(LocaleContext);
    if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
    return ctx;
  }

  function ThemeToggle() {
    const { t } = useLocale();
    const [theme, setTheme] = useState<Theme>("light");

    useEffect(() => {
      const pinned = document.documentElement.getAttribute("data-theme");
      if (pinned === "dark" || pinned === "light") {
        setTheme(pinned);
        return;
      }
      setTheme(resolveTheme(localStorage.getItem(THEME_KEY)));
    }, []);

    useEffect(() => {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const onChange = () => {
        if (localStorage.getItem(THEME_KEY)) return;
        const next = mq.matches ? "dark" : "light";
        applyTheme(next);
        setTheme(next);
      };
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    }, []);

    function toggle() {
      const next: Theme = theme === "dark" ? "light" : "dark";
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
      setTheme(next);
    }

    return (
      <button
        type="button"
        className="ctrl"
        onClick={toggle}
        aria-label={theme === "dark" ? t.theme.toLight : t.theme.toDark}
        title={theme === "dark" ? t.theme.toLight : t.theme.toDark}
      >
        {theme === "dark" ? <SunIcon /> : <MoonIcon />}
      </button>
    );
  }

  function LocaleToggle() {
    const { locale, label, setLocale, t } = useLocale();
    const [open, setOpen] = useState(false);
    const rootRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
      if (!open) return;
      function onDoc(e: MouseEvent) {
        if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
      }
      function onKey(e: KeyboardEvent) {
        if (e.key === "Escape") setOpen(false);
      }
      document.addEventListener("mousedown", onDoc);
      document.addEventListener("keydown", onKey);
      return () => {
        document.removeEventListener("mousedown", onDoc);
        document.removeEventListener("keydown", onKey);
      };
    }, [open]);

    return (
      <div className="ctrl-menu" ref={rootRef}>
        <button
          type="button"
          className="ctrl ctrl--lang"
          aria-label={t.locale.switch}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={t.locale.switch}
          onClick={() => setOpen((v) => !v)}
        >
          {label}
          <span className="ctrl-menu__caret" aria-hidden="true">
            ▾
          </span>
        </button>
        {open && (
          <ul className="ctrl-menu__list" role="listbox" aria-label={t.locale.switch}>
            {LOCALES.map((code) => (
              <li key={code} role="option" aria-selected={locale === code}>
                <button
                  type="button"
                  className={
                    locale === code
                      ? "ctrl-menu__option ctrl-menu__option--active"
                      : "ctrl-menu__option"
                  }
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                >
                  <span className="ctrl-menu__code">{LOCALE_LABEL[code]}</span>
                  {LOCALE_NAME[code]}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  function SiteControls({ className = "prefs-tools" }: { className?: string }) {
    return (
      <div className={className}>
        <LocaleToggle />
        <ThemeToggle />
      </div>
    );
  }

  return { LocaleProvider, useLocale, SiteControls, ThemeToggle, LocaleToggle };
}

function SunIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="4" fill="currentColor" />
      <g stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
        <path d="M12 2v2.5M12 19.5V22M2 12h2.5M19.5 12H22M4.9 4.9l1.8 1.8M17.3 17.3l1.8 1.8M4.9 19.1l1.8-1.8M17.3 6.7l1.8-1.8" />
      </g>
    </svg>
  );
}

function MoonIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M16.4 2.2a9.8 9.8 0 1 0 5.4 17.2A8.2 8.2 0 0 1 16.4 2.2Z"
      />
    </svg>
  );
}
