import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { deliverDue, listWebhookDeliveries } from "@/lib/webhooks";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    await deliverDue().catch(() => undefined);
    return jsonOk({ data: await listWebhookDeliveries(auth.accountId) });
  } catch (e) {
    return jsonError(e);
  }
}
