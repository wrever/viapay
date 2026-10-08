import { resolveViaFeeBps } from "@viapay/shared";
import { jsonOk } from "@/lib/http";
import { getTreasuryAddress } from "@/lib/auth";
import {
  paymentRouterContractId,
  stellarNetwork,
  usdcIssuer,
} from "@/lib/chain";
import { metaWhatsAppDiagnostics } from "@/lib/whatsapp/meta";
import { emailDiagnostics } from "@/lib/email/resend";

/** Public readiness + Stellar SEP surface for demos / agents. */
export async function GET() {
  const network = stellarNetwork();
  const router = paymentRouterContractId();
  const mode =
    process.env.STELLAR_MODE === "simulated" ? "simulated" : "onchain";
  const onchainRouter = mode === "onchain" && Boolean(router);

  return jsonOk({
    ok: true,
    product: "ViaPay",
    env: process.env.NODE_ENV ?? "local",
    fee_bps: resolveViaFeeBps(process.env.FEE_BPS),
    treasury: getTreasuryAddress(),
    network,
    mode,
    payment_router: router,
    usdc_issuer: usdcIssuer(),
    stellar_toml: "https://viapay.vercel.app/.well-known/stellar.toml",
    seps: {
      "SEP-1": {
        status: "live",
        url: "https://viapay.vercel.app/.well-known/stellar.toml",
      },
      "SEP-7": {
        status: onchainRouter ? "classic_disabled_use_wallet" : "live",
        note: onchainRouter
          ? "Checkout settles via payment-router; use Freighter, not classic SEP-7 QR."
          : "Classic multi-op SEP-7 when router unset.",
      },
      "SEP-10": {
        status: "demo",
        note: "SDF Test Anchor WEB_AUTH via panel cash-out.",
      },
      "SEP-24": {
        status: "demo",
        note: "SDF Test Anchor interactive withdraw; fiat simulated.",
        home_domain:
          process.env.ANCHOR_HOME_DOMAIN ?? "testanchor.stellar.org",
      },
      "SEP-11": { status: "skip", note: "No KYC product this week." },
      "SEP-41": {
        status: "live",
        note: "USDC + native SAC through payment-router pay().",
        usdc_issuer: usdcIssuer(),
      },
      "SEP-55": {
        status: "ci",
        note: "GitHub Actions builds + attests payment-router wasm (Verified Build registration pending).",
      },
    },
    whatsapp: metaWhatsAppDiagnostics(),
    email: emailDiagnostics(),
  });
}
