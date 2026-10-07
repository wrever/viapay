import { z } from "zod";
import { jsonError, jsonOk } from "@/lib/http";

/** Proxy SEP-10 token exchange after the wallet signed the challenge. */
export async function POST(req: Request) {
  try {
    const body = z
      .object({
        web_auth: z.string().url(),
        transaction: z.string().min(1),
      })
      .parse(await req.json());

    const res = await fetch(body.web_auth, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ transaction: body.transaction }),
      signal: AbortSignal.timeout(12000),
    });
    const payload = (await res.json().catch(() => ({}))) as Record<
      string,
      unknown
    >;
    if (!res.ok || typeof payload.token !== "string") {
      throw Object.assign(
        new Error(
          typeof payload.error === "string"
            ? payload.error
            : `SEP-10 token ${res.status}`,
        ),
        { status: res.status >= 400 && res.status < 600 ? res.status : 502 },
      );
    }
    return jsonOk({ token: payload.token });
  } catch (e) {
    return jsonError(e);
  }
}
