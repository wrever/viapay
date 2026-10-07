import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";

/**
 * Proxy SEP-24 interactive withdraw start.
 * Returns the anchor URL the merchant opens; fiat payout may be simulated.
 */
export async function POST(req: Request) {
  try {
    const body = z
      .object({
        sep24: z.string().url(),
        token: z.string().min(1),
        account: z.string().min(1),
        asset_code: z.string().min(1),
        asset_issuer: z.string().nullable().optional(),
      })
      .parse(await req.json());

    const base = body.sep24.replace(/\/$/, "");
    const form = new URLSearchParams();
    form.set("asset_code", body.asset_code);
    if (body.asset_issuer) form.set("asset_issuer", body.asset_issuer);
    form.set("account", body.account);

    const res = await fetch(`${base}/transactions/withdraw/interactive`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${body.token}`,
        "Content-Type": "application/x-www-form-urlencoded",
        Accept: "application/json",
      },
      body: form,
      signal: AbortSignal.timeout(15000),
    });
    const payload = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok || typeof payload.url !== "string") {
      throw Object.assign(
        new Error(
          typeof payload.error === "string"
            ? payload.error
            : `SEP-24 interactive ${res.status}`,
        ),
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }
    return jsonOk({
      url: payload.url,
      id: typeof payload.id === "string" ? payload.id : undefined,
      type: typeof payload.type === "string" ? payload.type : undefined,
    });
  } catch (e) {
    return jsonError(e);
  }
}
