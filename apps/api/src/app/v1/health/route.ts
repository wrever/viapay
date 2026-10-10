import { resolveViaFeeBps } from "@viapay/shared";
import { jsonOk } from "@/lib/http";
import { getTreasuryAddress } from "@/lib/auth";
import {
  networkSettlementReady,
  paymentRouterContractId,
  stellarNetwork,
  usdcIssuer,
} from "@/lib/chain";
import { metaWhatsAppDiagnostics } from "@/lib/whatsapp/meta";
import { emailDiagnostics } from "@/lib/email/resend";
import { buildSepsMatrix, sepDefaults } from "@/lib/seps";

/** Public readiness + Stellar SEP surface for demos / agents. */
export async function GET() {
  const network = stellarNetwork();
  const router = paymentRouterContractId(network);
  const mode =
    process.env.STELLAR_MODE === "simulated" ? "simulated" : "onchain";
  const onchainRouter = mode === "onchain" && Boolean(router);
  const seps = await buildSepsMatrix({ onchainRouter });

  return jsonOk({
    ok: true,
    product: "ViaPay",
    env: process.env.NODE_ENV ?? "local",
    fee_bps: resolveViaFeeBps(process.env.FEE_BPS),
    treasury: getTreasuryAddress(),
    network,
    mode,
    payment_router: router,
    usdc_issuer: usdcIssuer(network),
    /** Per-network settlement: cobros pick a network; prepare/submit use that router/issuer. */
    networks: {
      testnet: {
        ready: networkSettlementReady("testnet"),
        payment_router: paymentRouterContractId("testnet"),
        usdc_issuer: usdcIssuer("testnet"),
      },
      mainnet: {
        ready: networkSettlementReady("mainnet"),
        payment_router: paymentRouterContractId("mainnet"),
        usdc_issuer: usdcIssuer("mainnet"),
      },
    },
    stellar_toml: "https://viapay.vercel.app/.well-known/stellar.toml",
    /** On-chain evidence for judges even if PAYMENT_ROUTER_CONTRACT_ID_MAINNET is unset in this env. */
    evidence: {
      payment_router_testnet:
        "CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT",
      payment_router_mainnet:
        "CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U",
      wasm_hash:
        "2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383",
      mainnet_deploy_tx:
        "058c3502c840ae6d70edd4f8a00ffa301ab9537fa0b8a1f879a05b8f22b6f1b6",
      mainnet_pay_tx:
        "83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f",
      mainnet_pay_ledger: 64864011,
      mainnet_pay_note:
        "Paid · 0.099+0.001 XLM · merchant GCXX… ≠ treasury GDIN7H… (third-party)",
      mainnet_explorer:
        "https://stellar.expert/explorer/public/tx/83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f",
      mainnet_pay_self_tx:
        "b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e",
      mainnet_pay_self_note:
        "Earlier self-pay existence proof (merchant=treasury)",
      verify_url:
        "https://viapay-api.vercel.app/v1/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f",
      evidence_page: "https://viapay.vercel.app/evidence",
      judge_kit: "pnpm verify -- --kit",
      rails_url: "https://viapay-api.vercel.app/v1/rails",
      settle_proof_paid:
        "https://viapay-api.vercel.app/v1/settle-proof/pi_56fad4bc479de4f5e043065e",
      settle_proof_unpaid:
        "https://viapay-api.vercel.app/v1/settle-proof/pi_df1327cbdea35264be5d24a9",
      parity_demo:
        "https://viapay-api.vercel.app/v1/parity/pi_56fad4bc479de4f5e043065e",
      abonos_mainnet: {
        intent_id_sha256:
          "f21f2785dfa5d4c5d0fba195e81f07f030b24b5d45f79b73d2fb6be8e12b240c",
        pays: [
          "09f59b225a37de6702755b2947e23aed9722c7be987b477dcea9b2246f37cde9",
          "d44f151e8f476f02180c7231c45ebe4dbd1564bf3f91be0fc54d2c939eb6c996",
        ],
        note: "Two Paid events, same intent_id — installments without wasm change",
      },
    },
    rails: "https://viapay-api.vercel.app/v1/rails",
    verify: "https://viapay-api.vercel.app/v1/verify",
    parity: "https://viapay-api.vercel.app/v1/parity/{payment_intent_id}",
    settle_proof:
      "https://viapay-api.vercel.app/v1/settle-proof/{payment_intent_id}",
    proof_or_nothing: true,
    schemes: [
      "exact",
      "exact_pay",
      "exact_split",
      "rail_parity",
      "proof_or_nothing",
      "abonos",
      "installment_plans",
    ],
    link_sig_v2: true,
    plans: {
      installments: true,
      reminders: "/v1/cron/plan-reminders",
      note: "Opt-in merchant plan: parent + N child intents + due reminders",
    },
    seps,
    sep_defaults: sepDefaults,
    whatsapp: metaWhatsAppDiagnostics(),
    email: emailDiagnostics(),
    fee_sponsor: {
      configured: Boolean(process.env.VIAPAY_FEE_SPONSOR_SECRET),
      note: "Optional fee-bump so payers without XLM can settle USDC. Set VIAPAY_FEE_SPONSOR_SECRET when funded.",
    },
    notifications: {
      on_payment_succeeded: [
        "webhooks",
        "merchant_whatsapp",
        "merchant_email",
        "payer_whatsapp",
        "payer_email",
      ],
      note: "Channels fire best-effort from markCheckoutSucceeded. See GET /v1/rails notifications.",
    },
  });
}
