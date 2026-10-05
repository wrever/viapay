export type Locale = "es" | "en" | "pt";

export const LOCALES: Locale[] = ["es", "en", "pt"];

export const LOCALE_KEY = "viapay-locale";

export const LOCALE_LABEL: Record<Locale, string> = {
  es: "ES",
  en: "EN",
  pt: "PT",
};

export const LOCALE_NAME: Record<Locale, string> = {
  es: "Español",
  en: "English",
  pt: "Português",
};

/** BCP-47 tag for number/date formatting. Spanish first. */
export const LOCALE_TAG: Record<Locale, string> = {
  es: "es-CL",
  en: "en-US",
  pt: "pt-BR",
};

export function isLocale(value: string | null | undefined): value is Locale {
  return value === "es" || value === "en" || value === "pt";
}

/** Prefer stored choice; else browser; else Spanish. */
export function detectLocale(
  stored: string | null,
  navigatorLanguage?: string,
): Locale {
  if (isLocale(stored)) return stored;
  const lang = (navigatorLanguage ?? "").toLowerCase();
  if (lang.startsWith("pt")) return "pt";
  if (lang.startsWith("en")) return "en";
  if (lang.startsWith("es")) return "es";
  return "es";
}
