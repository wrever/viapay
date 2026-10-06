import { networkConfig } from "@viapay/stellar";
import { stellarNetwork } from "./chain";

const SOROSWAP_API_BASE =
  process.env.SOROSWAP_API_URL?.replace(/\/$/, "") ||
  "https://api.soroswap.finance";

/** Native XLM + USDC SAC addresses used by Soroswap (testnet from /api/tokens). */
export const SOROSWAP_TOKENS = {
  testnet: {
    XLM: {
      contract: "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC",
      decimals: 7,
    },
    USDC: {
      contract: "CB3TLW74NBIOT3BUWOZ3TUM6RFDF6A4GVIRUQRQZABG5KPOUL4JJOV2F",
      decimals: 7,
    },
  },
  mainnet: {
    XLM: {
      contract: "CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA",
      decimals: 7,
    },
    USDC: {
      contract: "CB64D3G7SM2RTH6JSGG34DDTFTQ5CFDKVDZJZSODMCX4NJ2HV2KN7OHT",
      decimals: 7,
    },
  },
} as const;

export type SwapAsset = "XLM" | "USDC";
export type SwapNetwork = "testnet" | "mainnet";

export function soroswapConfigured(): boolean {
  return Boolean(process.env.SOROSWAP_API_KEY?.trim());
}

export function resolveSwapNetwork(): SwapNetwork {
  const n = stellarNetwork();
  return n === "mainnet" ? "mainnet" : "testnet";
}

export function tokenFor(asset: SwapAsset, network: SwapNetwork) {
  return SOROSWAP_TOKENS[network][asset];
}

/** Convert a human decimal string to atomic units (string integer). */
export function toAtomicAmount(human: string, decimals: number): string {
  const cleaned = human.trim().replace(",", ".");
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    throw Object.assign(new Error("Monto inválido"), { status: 400 });
  }
  const [whole, frac = ""] = cleaned.split(".");
  if (frac.length > decimals) {
    throw Object.assign(
      new Error(`Máximo ${decimals} decimales`),
      { status: 400 },
    );
  }
  const padded = frac.padEnd(decimals, "0");
  const raw = `${whole}${padded}`.replace(/^0+(?=\d)/, "");
  if (raw === "" || BigInt(raw) <= 0n) {
    throw Object.assign(new Error("Monto debe ser mayor a 0"), { status: 400 });
  }
  return raw;
}

export function fromAtomicAmount(atomic: string | number, decimals: number): string {
  const s = String(atomic).replace(/[^\d]/g, "") || "0";
  const neg = false;
  const padded = s.padStart(decimals + 1, "0");
  const whole = padded.slice(0, -decimals) || "0";
  const frac = padded.slice(-decimals).replace(/0+$/, "");
  const out = frac ? `${whole}.${frac}` : whole;
  return neg ? `-${out}` : out;
}

function apiKey(): string {
  const key = process.env.SOROSWAP_API_KEY?.trim();
  if (!key) {
    throw Object.assign(
      new Error(
        "Falta SOROSWAP_API_KEY. Configurala en el proyecto Vercel viapay-api (y en .env local).",
      ),
      { status: 503 },
    );
  }
  return key;
}

async function soroswapFetch(
  path: string,
  init: { method?: string; body?: unknown; network: SwapNetwork },
): Promise<unknown> {
  const key = apiKey();
  const url = new URL(`${SOROSWAP_API_BASE}${path}`);
  url.searchParams.set("network", init.network);
  const res = await fetch(url.toString(), {
    method: init.method ?? "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
    signal: AbortSignal.timeout(45_000),
  });
  const text = await res.text();
  let data: unknown = null;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = { raw: text };
  }
  if (!res.ok) {
    let msg = `Soroswap HTTP ${res.status}`;
    if (data && typeof data === "object") {
      const rec = data as Record<string, unknown>;
      if (typeof rec.message === "string" && rec.message) msg = rec.message;
      else if (typeof rec.error === "string" && rec.error) msg = rec.error;
    }
    const status =
      res.status === 403
        ? 502
        : res.status >= 400 && res.status < 600
          ? res.status
          : 502;
    throw Object.assign(new Error(msg), { status });
  }
  return data;
}

export type SoroswapQuote = {
  assetIn: string;
  assetOut: string;
  amountIn: string | number;
  amountOut: string | number;
  otherAmountThreshold?: string | number;
  tradeType: string;
  priceImpactPct?: string;
  platform?: string;
  rawTrade?: unknown;
  routePlan?: unknown;
  [key: string]: unknown;
};

export async function getSoroswapQuote(input: {
  assetIn: SwapAsset;
  assetOut: SwapAsset;
  amountHuman: string;
  slippageBps?: number;
  network?: SwapNetwork;
}): Promise<{
  quote: SoroswapQuote;
  network: SwapNetwork;
  amount_in: string;
  amount_out: string;
  amount_in_atomic: string;
  amount_out_atomic: string;
  price_impact_pct: string | null;
  platform: string | null;
  asset_in: SwapAsset;
  asset_out: SwapAsset;
}> {
  if (input.assetIn === input.assetOut) {
    throw Object.assign(new Error("asset_in y asset_out deben ser distintos"), {
      status: 400,
    });
  }
  const network = input.network ?? resolveSwapNetwork();
  const tokIn = tokenFor(input.assetIn, network);
  const tokOut = tokenFor(input.assetOut, network);
  const amountAtomic = toAtomicAmount(input.amountHuman, tokIn.decimals);
  const quote = (await soroswapFetch("/quote", {
    network,
    body: {
      assetIn: tokIn.contract,
      assetOut: tokOut.contract,
      amount: amountAtomic,
      tradeType: "EXACT_IN",
      protocols: ["soroswap", "phoenix", "aqua"],
      slippageBps: input.slippageBps ?? 50,
      maxHops: 2,
    },
  })) as SoroswapQuote;

  const amountInAtomic = String(quote.amountIn ?? amountAtomic);
  const amountOutAtomic = String(quote.amountOut ?? "0");

  return {
    quote,
    network,
    asset_in: input.assetIn,
    asset_out: input.assetOut,
    amount_in_atomic: amountInAtomic,
    amount_out_atomic: amountOutAtomic,
    amount_in: fromAtomicAmount(amountInAtomic, tokIn.decimals),
    amount_out: fromAtomicAmount(amountOutAtomic, tokOut.decimals),
    price_impact_pct:
      typeof quote.priceImpactPct === "string" ? quote.priceImpactPct : null,
    platform: typeof quote.platform === "string" ? quote.platform : null,
  };
}

export async function buildSoroswapTx(input: {
  quote: SoroswapQuote;
  from: string;
  to?: string;
  network?: SwapNetwork;
}): Promise<{ xdr: string; network: SwapNetwork; network_passphrase: string }> {
  const network = input.network ?? resolveSwapNetwork();
  const data = (await soroswapFetch("/quote/build", {
    network,
    body: {
      quote: input.quote,
      from: input.from,
      to: input.to ?? input.from,
    },
  })) as { xdr?: string; action?: string; message?: string };

  if (!data.xdr) {
    throw Object.assign(
      new Error(data.message || "Soroswap no devolvió XDR"),
      { status: 502 },
    );
  }
  if (data.action && data.action !== "SIGN_TRANSACTION") {
    throw Object.assign(
      new Error(
        data.message ||
          `Acción requerida antes del swap: ${data.action}. Abrí Soroswap o creá la trustline.`,
      ),
      { status: 409 },
    );
  }

  return {
    xdr: data.xdr,
    network,
    network_passphrase: networkConfig(network).networkPassphrase,
  };
}

export async function sendSoroswapTx(input: {
  xdr: string;
  network?: SwapNetwork;
}): Promise<{ hash: string; status: string | null; network: SwapNetwork }> {
  const network = input.network ?? resolveSwapNetwork();
  const data = (await soroswapFetch("/send", {
    network,
    body: { xdr: input.xdr },
  })) as { hash?: string; txHash?: string; status?: string };

  const hash = data.hash ?? data.txHash;
  if (!hash) {
    throw Object.assign(new Error("Soroswap no devolvió hash de tx"), {
      status: 502,
    });
  }
  return {
    hash,
    status: typeof data.status === "string" ? data.status : null,
    network,
  };
}

export function swapStatusPayload() {
  const network = resolveSwapNetwork();
  const configured = soroswapConfigured();
  return {
    configured,
    network,
    tokens: {
      XLM: tokenFor("XLM", network),
      USDC: tokenFor("USDC", network),
    },
    app_url: "https://app.soroswap.finance",
    docs_url: "https://docs.soroswap.finance/api/quickstart",
    env_hint: configured
      ? null
      : "Definí SOROSWAP_API_KEY en el proyecto Vercel viapay-api (y .env local).",
  };
}
