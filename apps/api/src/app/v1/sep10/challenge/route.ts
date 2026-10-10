import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";

/** Proxy SEP-10 challenge fetch (avoids browser CORS against the anchor). */
export async function POST(req: Request) {
  try {
    const body = z
      .object({
        web_auth: z.string().url().optional(),
        account: z.string().min(1),
      })
      .parse(await req.json());

    const webAuth =
      body.web_auth ??
      process.env.ANCHOR_WEB_AUTH ??
      "https://testanchor.stellar.org/auth";
    const url = new URL(webAuth);
    url.searchParams.set("account", body.account);
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(12000),
    });
    const payload = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok) {
      throw Object.assign(
        new Error(
          typeof payload.error === "string"
            ? payload.error
            : `SEP-10 challenge ${res.status}`,
        ),
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }
    return jsonOk(payload);
  } catch (e) {
    return jsonError(e);
  }
}
