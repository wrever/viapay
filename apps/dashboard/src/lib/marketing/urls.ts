/** Single-host product: landing + panel on the same origin. */
export function panelLoginHref() {
  return "/login";
}

export function siteOrigin() {
  return (
    process.env.NEXT_PUBLIC_VIAPAY_WEB_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_DASHBOARD_URL ??
    "https://viapay.vercel.app"
  ).replace(/\/$/, "");
}
