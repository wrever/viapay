import { jsonOk } from "@/lib/http";
import {
  paymentRouterContractId,
  publicApiUrl,
  stellarNetwork,
  usdcIssuer,
} from "@/lib/chain";

/**
 * Machine-readable discovery of ViaPay as settlement infrastructure.
 * Agents and integrators start here — not a marketing page.
 */
export async function GET() {
  const base = publicApiUrl();
  const site =
    process.env.VIAPAY_CHECKOUT_URL?.replace(/\/$/, "") ||
    "https://viapay.vercel.app";
  const defaultNet = stellarNetwork();

  return jsonOk({
    product: "ViaPay",
    role: "settlement_infrastructure",
    primitive: "payment_intent",
    thesis:
      "proof-or-nothing + exact-split + rail-parity: one payment_intent, one URL (human or agent), atomic multi-party settle on Soroban; screenshots are not proof; humano ≡ agente ≡ cadena.",
    spec: "docs/submission/PAYMENT_INTENT_SPEC.md",
    /**
     * Payment schemes (wire / settle semantics) vs product surfaces (UX).
     * Specs live under docs/submission/ — names are product labels, not SEPs.
     */
    schemes: {
      exact: "Crypto amount as quoted (default). x402 wire scheme exact.",
      exact_pay:
        "Fiat quote locked to XLM/USDC at create (off-chain rates). Not Reflector; not atomic FX swap.",
      docs: {
        exact_pay: "docs/submission/EXACT_PAY.md",
        exact_split: "docs/submission/EXACT_SPLIT.md",
        rail_parity: "docs/submission/RAIL_PARITY.md",
        proof_or_nothing: "docs/submission/PROOF_OR_NOTHING.md",
      },
    },
    invariants: {
      proof_or_nothing:
        "Status flips only on Paid / verified settle. No screenshot path.",
      rail_parity:
        "GET /v1/parity/:id compares intent ↔ x402 ↔ on-chain pay() (public).",
      exact_split:
        "payment-router pay() emits Paid with intent_id; up to 3 legs in one tx.",
      one_shot: "prepare/submit reject if already succeeded.",
    },
    product_surfaces: {
      split_glass: "Receipt + notify show net / fee / reseller.",
      wa_assistant:
        "NL cobro (fiat or crypto) → link; estado VP-XXXX; Meta Live required for inbound prod.",
      short_codes: "VP-XXXX → /c/… → /pay or /r",
      receipt: "/r/:id + GET /v1/settle-proof/:id (succeeded only; unpaid → 409)",
    },
    human: {
      panel: `${site}/app`,
      checkout_pattern: `${site}/pay/{payment_intent_id}`,
      short_code_pattern: `${site}/c/VP-XXXX`,
      receipt_pattern: `${site}/r/{payment_intent_id}`,
      docs: `${site}/docs`,
    },
    agent: {
      challenge: "HTTP 402 on the same checkout_url (Accept: application/json)",
      settle: {
        prepare: `POST ${base}/v1/checkout/{id}/prepare`,
        submit: `POST ${base}/v1/checkout/{id}/submit`,
      },
      demo: "examples/agent-pay.mjs",
      mcp: {
        entry: "scripts/mcp-viapay.mjs",
        tools: [
          {
            name: "viapay_rails",
            description: "Fetch ViaPay settlement infrastructure manifest",
          },
          {
            name: "viapay_verify",
            description:
              "Verify a payment-router pay() tx on testnet or mainnet (public)",
          },
          {
            name: "viapay_parity",
            description:
              "Check rail-parity for a payment_intent (intent ≡ x402 ≡ Paid)",
          },
          {
            name: "viapay_health",
            description: "Public health: networks, seps, evidence",
          },
        ],
      },
    },
    onchain: {
      settlement: "payment-router",
      function: "pay",
      event: "Paid",
      sep41: true,
      networks: {
        testnet: {
          payment_router: paymentRouterContractId("testnet"),
          usdc_issuer: usdcIssuer("testnet"),
        },
        mainnet: {
          payment_router: paymentRouterContractId("mainnet"),
          usdc_issuer: usdcIssuer("mainnet"),
        },
      },
      default_network: defaultNet,
    },
    verify: {
      url: `${base}/v1/verify`,
      example: `${base}/v1/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f`,
      note: "Public. Decodes pay() from a confirmed tx — no ViaPay API key required.",
    },
    parity: {
      url_pattern: `${base}/v1/parity/{payment_intent_id}`,
      note: "Public rail-parity. Screenshots are not proof (proof-or-nothing).",
    },
    settle_proof: {
      url_pattern: `${base}/v1/settle-proof/{payment_intent_id}`,
      note: "HMAC share package for succeeded intents; truth remains chain + parity.",
    },
    webhooks: {
      event: "payment_intent.succeeded",
      signature_header: "ViaPay-Signature",
    },
    notifications: {
      on_succeeded: [
        "https_webhooks",
        "merchant_whatsapp_if_linked",
        "merchant_email_if_resend",
        "payer_whatsapp_if_invoice_phone",
        "payer_email_if_invoice_email",
      ],
      note: "Best-effort; settlement never blocked. WA needs Meta Live + 24h window; email needs RESEND_API_KEY. chat-truth: notify only after Paid.",
    },
    consumers: [
      {
        name: "ViaPay Shop",
        path: "apps/shop",
        pattern: "create payment_intent → redirect checkout_url → success_url",
      },
      {
        name: "WhatsApp assistant",
        path: "apps/api/src/lib/whatsapp",
        pattern:
          "NL cobro pesos|crypto [con reseller %] → exact-pay/exact-split → estado VP-XXXX",
      },
      {
        name: "Panel Cobros",
        path: "apps/dashboard/src/components/CreatePaymentLink.tsx",
        pattern: "contact OR quick email/phone → share wa.me / email",
      },
      {
        name: "Agent demo",
        path: "examples/agent-pay.mjs",
        pattern: "402 → prepare → sign → submit",
      },
      {
        name: "Public verify consumer",
        path: "examples/verify-settlement.mjs",
        pattern: "GET /v1/verify → verified legs (no API key)",
      },
    ],
    cli: {
      verify: "pnpm verify",
      parity: "pnpm verify -- --parity <pi_id>",
      note: "Exit 0 on mainnet evidence; falls back to direct RPC if API not deployed",
    },
    evidence_page: `${site}/evidence`,
    stellar_toml: `${site}/.well-known/stellar.toml`,
    health: `${base}/v1/health`,
  });
}

export async function OPTIONS() {
  return new Response(null, { status: 204 });
}
