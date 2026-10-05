const PROD = "https://viapay.vercel.app";

/** Origen público: un solo host (viapay.vercel.app). Nunca subdomain ni localhost en prod. */
export function publicOrigin(req?: Request): string {
  const fromEnv = (
    process.env.NEXT_PUBLIC_VIAPAY_DASHBOARD_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_WEB_URL ??
    ""
  ).replace(/\/$/, "");

  if (fromEnv && !isLocalhost(fromEnv)) return fromEnv;

  if (req) {
    const host =
      req.headers.get("x-forwarded-host") ??
      req.headers.get("host") ??
      new URL(req.url).host;
    const proto =
      req.headers.get("x-forwarded-proto") ??
      (host.includes("localhost") ? "http" : "https");
    const origin = `${proto}://${host}`.replace(/\/$/, "");
    if (!isLocalhost(origin)) return origin;
    // En Vercel, si el host llegara mal, forzar prod
    if (process.env.VERCEL) return PROD;
    if (process.env.NODE_ENV !== "production") return origin;
  }

  if (process.env.VERCEL) return PROD;
  if (fromEnv) return fromEnv;
  return "http://localhost:3000";
}

function isLocalhost(url: string) {
  try {
    const host = new URL(url).hostname;
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

export function allowLocalLogin() {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.VIAPAY_ALLOW_LOCAL_LOGIN === "1";
}
