/** Landing pública (este deploy). */
export function webUrl() {
  return (
    process.env.NEXT_PUBLIC_VIAPAY_WEB_URL ?? "https://viapay.vercel.app"
  ).replace(/\/$/, "");
}

/**
 * URL del panel (apps/dashboard). Null si no está configurado o apunta
 * al mismo host que la landing — ahí /login de la web muestra el aviso.
 */
export function dashboardUrl(): string | null {
  const raw = process.env.NEXT_PUBLIC_VIAPAY_DASHBOARD_URL?.replace(/\/$/, "");
  if (!raw) return null;
  try {
    if (new URL(raw).origin === new URL(webUrl()).origin) return null;
  } catch {
    return null;
  }
  return raw;
}

/** Href del CTA “Entrar al panel”. */
export function panelLoginHref() {
  const dash = dashboardUrl();
  return dash ? `${dash}/login` : "/login";
}
