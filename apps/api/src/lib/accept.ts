/**
 * Detect a top-level browser navigation vs an API/agent client.
 * Prefer Sec-Fetch-* (Chromium/Firefox/Safari send these on real navigations).
 * curl / fetch agents typically omit them and get the machine response.
 */
export function prefersBrowserNavigation(req: Request): boolean {
  const url = new URL(req.url);
  if (url.searchParams.get("format") === "json") return false;
  if (url.searchParams.get("human") === "1") return true;

  const dest = req.headers.get("sec-fetch-dest");
  if (dest === "document") return true;
  if (req.headers.get("sec-fetch-mode") === "navigate") return true;

  const accept = (req.headers.get("accept") ?? "").toLowerCase();
  const wantsJson =
    accept.includes("application/json") ||
    accept.includes("application/vnd.viapay.x402");
  const wantsHtml = accept.includes("text/html");
  if (wantsHtml && !wantsJson) return true;
  return false;
}
