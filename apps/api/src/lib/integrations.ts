import { generatePrefixedId } from "@viapay/shared";
import { getTreasuryAddress } from "./auth";
import { stellarNetwork, usdcIssuer } from "./chain";

export type IntegrationStatus = {
  id: "anchor" | "escrow" | "pollar" | "soroban" | "supabase";
  ready: boolean;
  detail: string;
};

export function integrationStatus(): IntegrationStatus[] {
  const network = stellarNetwork();
  return [
    {
      id: "soroban",
      ready: Boolean(process.env.PAYMENT_ROUTER_CONTRACT_ID),
      detail: process.env.PAYMENT_ROUTER_CONTRACT_ID
        ? `payment-router ${process.env.PAYMENT_ROUTER_CONTRACT_ID} (SEP-41 SAC; onchain exige este contrato)`
        : "Falta PAYMENT_ROUTER_CONTRACT_ID — onchain no liquida sin payment-router.",
    },
    {
      id: "supabase",
      ready: Boolean(
        (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL) &&
          (process.env.SUPABASE_SERVICE_ROLE_KEY ||
            process.env.SUPABASE_SECRET_KEY ||
            process.env.SUPABASE_PUBLISHABLE_KEY),
      ),
      detail:
        process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY
          ? "API + OAuth sobre Postgres (service role)."
          : "OAuth Google/GitHub en el dashboard cuando SUPABASE_URL está definido. Service role activa el path Postgres de la API.",
    },
    {
      id: "anchor",
      ready: true,
      detail: process.env.ANCHOR_HOME_DOMAIN
        ? `stellar.toml en ${process.env.ANCHOR_HOME_DOMAIN}`
        : "SEP-10/24 demo: SDF Test Anchor (testanchor.stellar.org) vía panel + proxies /v1/sep10|/v1/sep24. Fiat simulado.",
    },
    {
      id: "escrow",
      ready: Boolean(process.env.TRUSTLESSWORK_API_KEY),
      detail: process.env.TRUSTLESSWORK_API_KEY
        ? `Trustless Work ${trustlessBaseUrl()}`
        : "Hitos B2B: define TRUSTLESSWORK_API_KEY. Testnet usa beta.api.trustlesswork.com.",
    },
    {
      id: "pollar",
      ready: Boolean(process.env.POLLAR_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY),
      detail:
        "Wallet embebida para quien no tiene Freighter. Activa con NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY en el checkout.",
    },
  ];
}

export function trustlessBaseUrl(): string {
  if (process.env.TRUSTLESSWORK_API_URL) return process.env.TRUSTLESSWORK_API_URL.replace(/\/$/, "");
  return stellarNetwork() === "mainnet"
    ? "https://api.trustlesswork.com"
    : "https://beta.api.trustlesswork.com";
}

function tomlString(text: string, key: string): string | null {
  const re = new RegExp(`^\\s*${key}\\s*=\\s*"([^"]+)"`, "m");
  return text.match(re)?.[1] ?? null;
}

export async function discoverAnchor(domain: string) {
  const host = domain.replace(/^https?:\/\//, "").replace(/\/$/, "");
  const tomlUrl = `https://${host}/.well-known/stellar.toml`;
  const res = await fetch(tomlUrl, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) {
    throw Object.assign(new Error(`No se pudo leer ${tomlUrl}`), { status: 502 });
  }
  const text = await res.text();
  return {
    domain: host,
    toml_url: tomlUrl,
    network_passphrase: tomlString(text, "NETWORK_PASSPHRASE"),
    web_auth: tomlString(text, "WEB_AUTH_ENDPOINT"),
    sep24: tomlString(text, "TRANSFER_SERVER_SEP0024"),
    sep6: tomlString(text, "TRANSFER_SERVER"),
    sep12: tomlString(text, "KYC_SERVER"),
    signing_key: tomlString(text, "SIGNING_KEY"),
  };
}

export async function deployEscrow(input: {
  signer: string;
  title: string;
  description: string;
  serviceProvider: string;
  amount: number;
}) {
  const key = process.env.TRUSTLESSWORK_API_KEY;
  if (!key) {
    throw Object.assign(
      new Error("Falta TRUSTLESSWORK_API_KEY. No se despliega un escrow falso."),
      { status: 400 },
    );
  }
  const treasury = getTreasuryAddress();
  const body = {
    signer: input.signer,
    engagementId: generatePrefixedId("escrow"),
    title: input.title,
    description: input.description,
    roles: {
      approver: input.signer,
      serviceProvider: input.serviceProvider,
      platformAddress: treasury,
      releaseSigner: treasury,
      disputeResolver: treasury,
      receiver: input.serviceProvider,
    },
    amount: input.amount,
    platformFee: 1.5,
    milestones: [{ description: input.description || input.title }],
    trustline: {
      symbol: "USDC",
      address: usdcIssuer(),
    },
    flags: {
      disputed: false,
      released: false,
      resolved: false,
      approved: false,
    },
  };
  const path = trustlessBaseUrl().includes("beta.api.trustlesswork.com")
    ? "/escrow/single-release/v2/deploy"
    : "/deployer/single-release";
  const res = await fetch(`${trustlessBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
    },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(15000),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw Object.assign(
      new Error(
        typeof payload === "object" && payload && "message" in payload
          ? String((payload as { message: unknown }).message)
          : `Trustless Work respondió ${res.status}`,
      ),
      { status: res.status === 401 ? 401 : 502 },
    );
  }
  return payload;
}
