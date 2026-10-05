import { getTreasuryAddress } from "@/lib/auth";
import {
  merchantTrustlineUri,
  receiveStatusFor,
  stellarNetwork,
  usdcIssuer,
} from "@/lib/chain";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { listPayableIntents } from "@/lib/payments";
import { isValidStellarPubkey } from "@viapay/shared";
import { networkConfig } from "@viapay/stellar";

const UNFUNDED = { exists: false, canReceive: false } as const;

/** A reseller only gets paid if its wallet exists and holds the asset's trustline. */
async function resellerStatus(address: string) {
  const [xlm, usdc] = await Promise.all([
    receiveStatusFor(address, "XLM"),
    receiveStatusFor(address, "USDC"),
  ]);
  return { address, xlm, usdc };
}

export async function GET(req: Request) {
  try {
    const auth = requireAuth(req);
    const network = stellarNetwork();
    const cfg = networkConfig(network);
    const merchant = auth.merchantWallet;
    const treasury = getTreasuryAddress();

    // Resellers waiting on a pending cobro, plus the one the dashboard is about
    // to use (`?reseller=G…`) so the warning shows before the link is created.
    const asked = new URL(req.url).searchParams.get("reseller")?.trim();
    const pendingResellers = listPayableIntents(auth.accountId)
      .map((row) => row.reseller_address)
      .filter((address): address is string => Boolean(address));
    const resellerAddresses = [
      ...new Set(
        [...pendingResellers, asked ?? ""].filter(
          (address) => address && isValidStellarPubkey(address),
        ),
      ),
    ];

    const [merchantXlm, merchantUsdc, treasuryXlm, treasuryUsdc, resellers] =
      await Promise.all([
        merchant ? receiveStatusFor(merchant, "XLM") : Promise.resolve(UNFUNDED),
        merchant ? receiveStatusFor(merchant, "USDC") : Promise.resolve(UNFUNDED),
        receiveStatusFor(treasury, "XLM"),
        receiveStatusFor(treasury, "USDC"),
        Promise.all(resellerAddresses.map(resellerStatus)),
      ]);

    return jsonOk({
      network,
      fee_bps: auth.feeBps,
      merchant_wallet: merchant,
      treasury_wallet: treasury,
      usdc_issuer: usdcIssuer(),
      friendbot_url:
        merchant && cfg.friendbotUrl ? `${cfg.friendbotUrl}?addr=${merchant}` : null,
      usdc_faucet_url: "https://faucet.circle.com",
      trustline_sep7: merchant ? merchantTrustlineUri(merchant) : null,
      merchant: { xlm: merchantXlm, usdc: merchantUsdc },
      treasury: { xlm: treasuryXlm, usdc: treasuryUsdc },
      resellers,
    });
  } catch (e) {
    return jsonError(e);
  }
}
