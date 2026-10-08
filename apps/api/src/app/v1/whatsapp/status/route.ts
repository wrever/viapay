import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { getLinkForAccount } from "@/lib/whatsapp/store";
import {
  metaAppLive,
  metaPhoneNumberId,
  metaWhatsAppConfigured,
} from "@/lib/whatsapp/meta";
import { getApiPublicUrl } from "@/lib/payments";

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const link = await getLinkForAccount(auth.accountId);
    return jsonOk({
      provider: "meta_cloud_api",
      configured: metaWhatsAppConfigured(),
      app_live: metaAppLive(),
      phone_number_id: metaWhatsAppConfigured() ? metaPhoneNumberId() : null,
      linked_phone: link?.phone_e164 ?? null,
      linked_at: link?.linked_at ?? null,
      webhook_url: `${getApiPublicUrl()}/v1/whatsapp/webhook`,
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
