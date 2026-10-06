import { getCryptoFiatRates } from "@/lib/rates";
import { jsonError, jsonOk } from "@/lib/http";

/** Public crypto→fiat rates (CoinGecko, ~10 min cache). No auth. */
export async function GET() {
  try {
    const payload = await getCryptoFiatRates();
    return jsonOk(payload, {
      headers: {
        "Cache-Control": "public, max-age=60, stale-while-revalidate=300",
      },
    });
  } catch (e) {
    return jsonError(e);
  }
}
