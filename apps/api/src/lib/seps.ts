/**
 * Live SEP surface for /v1/health — probes anchors + SEP-55 attestation.
 * Cached briefly so health stays fast.
 */
import { stellarNetwork, usdcIssuer } from "@/lib/chain";

export type SepEntry = {
  status: string;
  note?: string;
  url?: string;
  home_domain?: string;
  usdc_issuer?: string;
  attestation?: string | null;
  probed_at?: string;
};

const WASM_HASH =
  "2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383";
const ANCHOR_HOME =
  process.env.ANCHOR_HOME_DOMAIN ?? "testanchor.stellar.org";
const WEB_AUTH_DEFAULT = `https://${ANCHOR_HOME}/auth`;
const SEP24_DEFAULT = `https://${ANCHOR_HOME}/sep24`;
const TOML_URL = "https://viapay.vercel.app/.well-known/stellar.toml";
const SEP55_ACTIONS =
  "https://github.com/wrever/viapay/actions/workflows/payment-router-verified-build.yml";
const ATTEST_URL = `https://api.github.com/repos/wrever/viapay/attestations/sha256:${WASM_HASH}`;

type Cache = { at: number; seps: Record<string, SepEntry> };
let cache: Cache | null = null;
const TTL_MS = 5 * 60_000;

async function probeOk(url: string, init?: RequestInit): Promise<boolean> {
  try {
    const res = await fetch(url, {
      ...init,
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    return res.ok;
  } catch {
    return false;
  }
}

async function probeSep10(): Promise<boolean> {
  const account =
    process.env.VIAPAY_TREASURY_ADDRESS ??
    "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5";
  const url = new URL(WEB_AUTH_DEFAULT);
  url.searchParams.set("account", account);
  try {
    const res = await fetch(url.toString(), {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return false;
    const body = (await res.json()) as { transaction?: string };
    return typeof body.transaction === "string" && body.transaction.length > 0;
  } catch {
    return false;
  }
}

async function probeSep55Attestation(): Promise<string | null> {
  try {
    const res = await fetch(ATTEST_URL, {
      headers: {
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!res.ok) return null;
    const body = (await res.json()) as { attestations?: unknown[] };
    if (Array.isArray(body.attestations) && body.attestations.length > 0) {
      return ATTEST_URL;
    }
    return null;
  } catch {
    return null;
  }
}

export async function buildSepsMatrix(opts: {
  onchainRouter: boolean;
}): Promise<Record<string, SepEntry>> {
  if (cache && Date.now() - cache.at < TTL_MS) {
    return cache.seps;
  }

  const network = stellarNetwork();
  const now = new Date().toISOString();

  const [tomlOk, sep10Ok, sep24Ok, attestation] = await Promise.all([
    probeOk(TOML_URL),
    probeSep10(),
    probeOk(`${SEP24_DEFAULT}/info`),
    probeSep55Attestation(),
  ]);

  const seps: Record<string, SepEntry> = {
    "SEP-1": {
      status: tomlOk ? "live" : "degraded",
      note: tomlOk
        ? "viapay.vercel.app/.well-known/stellar.toml"
        : "stellar.toml unreachable",
      url: TOML_URL,
      probed_at: now,
    },
    "SEP-7": {
      status: opts.onchainRouter ? "wallet_path" : "live",
      note: opts.onchainRouter
        ? "Router settlement: Freighter / wallets kit (classic SEP-7 QR off)."
        : "Classic multi-op SEP-7 when router unset.",
      probed_at: now,
    },
    "SEP-10": {
      status: sep10Ok ? "live" : "degraded",
      note: sep10Ok
        ? `WEB_AUTH live via ${ANCHOR_HOME}; panel proxies challenge/token (cash-out demo).`
        : `WEB_AUTH probe failed (${ANCHOR_HOME}).`,
      url: WEB_AUTH_DEFAULT,
      home_domain: ANCHOR_HOME,
      probed_at: now,
    },
    "SEP-24": {
      status: sep24Ok ? "live" : "degraded",
      note: sep24Ok
        ? "Interactive withdraw live against SDF Test Anchor; fiat payout is simulated."
        : `SEP-24 /info probe failed (${ANCHOR_HOME}).`,
      url: SEP24_DEFAULT,
      home_domain: ANCHOR_HOME,
      probed_at: now,
    },
    "SEP-11": {
      status: "skip",
      note: "No KYC product surface (anchor SEP-12 optional via SDF Test Anchor).",
      probed_at: now,
    },
    "SEP-41": {
      status: "live",
      note: "USDC + native SAC through payment-router pay() (testnet + mainnet).",
      usdc_issuer: usdcIssuer(network) ?? undefined,
      probed_at: now,
    },
    "SEP-55": {
      status: attestation ? "attested" : "ci",
      note: attestation
        ? "GitHub build provenance attestation present for payment-router wasm. Lab Verified Build UI = optional ops."
        : "CI builds + attests wasm; attestation not yet listed (run workflow). Lab registration = ops.",
      url: SEP55_ACTIONS,
      attestation,
      probed_at: now,
    },
  };

  cache = { at: Date.now(), seps };
  return seps;
}

/** Defaults for panel / probes (SDF Test Anchor). */
export const sepDefaults = {
  web_auth: WEB_AUTH_DEFAULT,
  sep24: SEP24_DEFAULT,
  home_domain: ANCHOR_HOME,
  wasm_hash: WASM_HASH,
};
