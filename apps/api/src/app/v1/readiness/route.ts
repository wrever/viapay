import { getTreasuryAddress } from "@/lib/auth";
import {
  merchantTrustlineUri,
  parseNetwork,
  receiveStatusFor,
  stellarNetwork,
  usdcIssuer,
} from "@/lib/chain";
import { jsonError, jsonOk, requireAuth } from "@/lib/http";
import { listPayableIntents } from "@/lib/payments";
import { isValidStellarPubkey } from "@viapay/shared";
import { networkConfig, type Network } from "@viapay/stellar";

const UNFUNDED = { exists: false, canReceive: false } as const;

async function resellerStatus(address: string, network: Network) {
  const [xlm, usdc] = await Promise.all([
    receiveStatusFor(address, "XLM", network),
    receiveStatusFor(address, "USDC", network),
  ]);
  return { address, xlm, usdc };
}

export async function GET(req: Request) {
  try {
    const auth = await requireAuth(req);
    const url = new URL(req.url);
    const network = parseNetwork(
      url.searchParams.get("network") ?? stellarNetwork(),
    );
    const cfg = networkConfig(network);
    const merchant = auth.merchantWallet;
    const treasury = getTreasuryAddress();

    const asked = url.searchParams.get("reseller")?.trim();
    const pending = await listPayableIntents(auth.accountId);
    const pendingResellers = pending
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
        merchant
          ? receiveStatusFor(merchant, "XLM", network)
          : Promise.resolve(UNFUNDED),
        merchant
          ? receiveStatusFor(merchant, "USDC", network)
          : Promise.resolve(UNFUNDED),
        receiveStatusFor(treasury, "XLM", network),
        receiveStatusFor(treasury, "USDC", network),
        Promise.all(
          resellerAddresses.map((addr) => resellerStatus(addr, network)),
        ),
      ]);

    return jsonOk({
      network,
      fee_bps: auth.feeBps,
      merchant_wallet: merchant,
      treasury_wallet: treasury,
      usdc_issuer: usdcIssuer(network),
      friendbot_url:
        merchant && cfg.friendbotUrl
          ? `${cfg.friendbotUrl}?addr=${merchant}`
          : null,
      usdc_faucet_url: "https://faucet.circle.com",
      trustline_sep7: merchant
        ? merchantTrustlineUri(merchant, network)
        : null,
      merchant: { xlm: merchantXlm, usdc: merchantUsdc },
      treasury: { xlm: treasuryXlm, usdc: treasuryUsdc },
      resellers,
    });
  } catch (e) {
    return jsonError(e);
  }
}
