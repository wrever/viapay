import { z } from "zod";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { createWebhookEndpoint, listWebhookEndpoints } from "@/lib/webhooks";

const createSchema = z.object({
  url: z.string().url(),
});

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    return jsonOk({ data: listWebhookEndpoints(auth.accountId) });
  } catch (e) {
    return jsonError(e);
  }
}

export async function POST(req: Request) {
  try {
    const auth = requireAuth(req);
    const body = createSchema.parse(await req.json());
    const created = createWebhookEndpoint(auth.accountId, body.url);
    return jsonOk(created, { status: 201 });
  } catch (e) {
    return jsonError(e);
  }
}
