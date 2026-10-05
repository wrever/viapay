export type Theme = "light" | "dark";

/** Same key in web, checkout and dashboard so the choice travels across apps on one origin. */
export const THEME_KEY = "viapay-theme";

/** Inline boot: apply stored theme, else OS preference. Runs before paint. */
export const THEME_BOOT = `(function(){try{var k=${JSON.stringify(THEME_KEY)};var t=localStorage.getItem(k);var d=t==="dark"||t==="light"?t:(window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light");document.documentElement.setAttribute("data-theme",d);}catch(e){}})();`;

export function resolveTheme(stored: string | null): Theme {
  if (stored === "light" || stored === "dark") return stored;
  if (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }
  return "light";
}

export function applyTheme(theme: Theme) {
  document.documentElement.setAttribute("data-theme", theme);
}
