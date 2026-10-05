import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { deleteWebhookEndpoint } from "@/lib/webhooks";

export async function DELETE(
  req: Request,
  ctx: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await requireAuth(req);
    const { id } = await ctx.params;
    await deleteWebhookEndpoint(auth.accountId, id);
    return jsonOk({ deleted: true });
  } catch (e) {
    return jsonError(e);
  }
}
