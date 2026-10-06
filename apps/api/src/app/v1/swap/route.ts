import { jsonError, jsonOk } from "@/lib/http";
import { swapStatusPayload } from "@/lib/soroswap";

/** Public status for the optional Soroswap swap section (no key leaked). */
export async function GET() {
  try {
    return jsonOk(swapStatusPayload(), {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
