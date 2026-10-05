/** Public origin of the dashboard (never localhost in production). */
export function publicOrigin(req?: Request): string {
  const fromEnv = process.env.NEXT_PUBLIC_VIAPAY_DASHBOARD_URL?.replace(/\/$/, "");
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
    if (!isLocalhost(origin) || process.env.NODE_ENV !== "production") {
      return origin;
    }
  }

  if (fromEnv) return fromEnv;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
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

/** Local demo login only off Vercel / non-production. */
export function allowLocalLogin() {
  if (process.env.VERCEL) return false;
  if (process.env.NODE_ENV === "production") return false;
  return process.env.VIAPAY_ALLOW_LOCAL_LOGIN === "1";
}
