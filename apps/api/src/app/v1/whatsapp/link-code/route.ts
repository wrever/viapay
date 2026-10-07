import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { createLinkCode } from "@/lib/whatsapp/store";
import { metaWhatsAppConfigured } from "@/lib/whatsapp/meta";

export async function POST(req: Request) {
  try {
    const auth = await requireAuth(req);
    const { code, expires_at } = await createLinkCode(auth.accountId);
    return jsonOk({
      code,
      expires_at,
      instruction: `Abrí el chat de ViaPay en WhatsApp y escribí: vincular ${code}`,
      configured: metaWhatsAppConfigured(),
      provider: "meta_cloud_api",
    });
  } catch (e) {
    return jsonError(e);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
