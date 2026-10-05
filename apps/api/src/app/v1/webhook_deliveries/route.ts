import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { deliverDue, listWebhookDeliveries } from "@/lib/webhooks";

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    await deliverDue().catch(() => undefined);
    return jsonOk({ data: listWebhookDeliveries(auth.accountId) });
  } catch (e) {
    return jsonError(e);
  }
}
