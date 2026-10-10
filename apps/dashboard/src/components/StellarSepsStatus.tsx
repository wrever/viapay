"use client";

import { useEffect, useState } from "react";
import { API } from "@/lib/config";
import { useLocale } from "@/lib/i18n";

type SepEntry = { status: string; note?: string; url?: string };

type HealthSeps = Record<string, SepEntry>;

type NetReady = {
  ready?: boolean;
  payment_router?: string | null;
  usdc_issuer?: string;
};

type HealthEvidence = {
  payment_router_mainnet?: string;
  mainnet_pay_tx?: string;
  wasm_hash?: string;
};

const SEP55_ACTIONS =
  "https://github.com/wrever/viapay/actions/workflows/payment-router-verified-build.yml";

/** Known mainnet deploy — shown when API env still lacks PAYMENT_ROUTER_CONTRACT_ID_MAINNET. */
const EVIDENCE_MAINNET_ROUTER =
  "CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U";
const EVIDENCE_MAINNET_PAY =
  "83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f";

function expertContract(network: "testnet" | "mainnet", id: string) {
  const explorer = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${explorer}/contract/${id}`;
}

function expertTx(network: "testnet" | "mainnet", hash: string) {
  const explorer = network === "mainnet" ? "public" : "testnet";
  return `https://stellar.expert/explorer/${explorer}/tx/${hash}`;
}

/** Live SEP matrix from GET /v1/health — for Integración / jurado. */
export function StellarSepsStatus() {
  const { t } = useLocale();
  const [seps, setSeps] = useState<HealthSeps | null>(null);
  const [router, setRouter] = useState<string | null>(null);
  const [networks, setNetworks] = useState<{
    testnet?: NetReady;
    mainnet?: NetReady;
  } | null>(null);
  const [evidence, setEvidence] = useState<HealthEvidence | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${API}/v1/health`, { cache: "no-store" });
        const body = (await res.json()) as {
          seps?: HealthSeps;
          payment_router?: string | null;
          networks?: { testnet?: NetReady; mainnet?: NetReady };
          evidence?: HealthEvidence;
          error?: string;
        };
        if (!res.ok) throw new Error(body.error ?? "health");
        if (!cancelled) {
          setSeps(body.seps ?? null);
          setRouter(body.payment_router ?? null);
          setNetworks(body.networks ?? null);
          setEvidence(body.evidence ?? null);
        }
      } catch {
        if (!cancelled) setError(t.sepsLoadFail);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [t.sepsLoadFail]);

  const testnetRouter = networks?.testnet?.payment_router ?? router;
  const mainnetFromApi = networks?.mainnet?.payment_router ?? null;
  const mainnetRouter =
    mainnetFromApi ??
    evidence?.payment_router_mainnet ??
    EVIDENCE_MAINNET_ROUTER;
  const mainnetReady = Boolean(networks?.mainnet?.ready);
  const mainnetIsEvidenceOnly = !mainnetFromApi;
  const mainnetPayTx = evidence?.mainnet_pay_tx ?? EVIDENCE_MAINNET_PAY;

  return (
    <div className="grid gap-2">
      <h3 className="text-sm font-medium text-[var(--text)]">{t.sepsTitle}</h3>
      <p className="text-sm text-[var(--text-2)]">{t.sepsBody}</p>
      {error && (
        <p className="tone tone--warning text-sm" role="alert">
          {error}
        </p>
      )}

      <ul className="text-xs grid gap-1.5">
        <li className="flex flex-wrap gap-x-2 gap-y-0.5 items-baseline">
          <span className="font-semibold text-[var(--text)]">
            {t.sepsNetworkTestnet}
          </span>
          <span
            className={
              networks?.testnet?.ready
                ? "text-[var(--success)]"
                : "text-[var(--text-2)]"
            }
          >
            {networks?.testnet?.ready ? t.sepsReady : t.sepsNotReady}
          </span>
          {testnetRouter && (
            <a
              className="perf break-all underline underline-offset-2 text-[var(--primary)]"
              href={expertContract("testnet", testnetRouter)}
              target="_blank"
              rel="noreferrer"
            >
              {testnetRouter}
            </a>
          )}
        </li>
        <li className="flex flex-wrap gap-x-2 gap-y-0.5 items-baseline">
          <span className="font-semibold text-[var(--text)]">
            {t.sepsNetworkMainnet}
          </span>
          <span
            className={
              mainnetReady ? "text-[var(--success)]" : "text-[var(--primary)]"
            }
          >
            {mainnetReady
              ? t.sepsReady
              : mainnetIsEvidenceOnly
                ? t.sepsMainnetEvidence
                : t.sepsNotReady}
          </span>
          <a
            className="perf break-all underline underline-offset-2 text-[var(--primary)]"
            href={expertContract("mainnet", mainnetRouter)}
            target="_blank"
            rel="noreferrer"
          >
            {mainnetRouter}
          </a>
          {mainnetIsEvidenceOnly && (
            <a
              className="underline underline-offset-2 text-[var(--primary)]"
              href={expertTx("mainnet", mainnetPayTx)}
              target="_blank"
              rel="noreferrer"
            >
              {t.sepsMainnetPayTx}
            </a>
          )}
        </li>
      </ul>

      {seps && (
        <ul className="text-xs grid gap-1.5 mt-1">
          {Object.entries(seps).map(([id, entry]) => (
            <li key={id} className="flex flex-wrap gap-x-2 gap-y-0.5">
              <span className="font-semibold text-[var(--text)]">{id}</span>
              <span
                className={
                  entry.status === "live"
                    ? "text-[var(--success)]"
                    : entry.status === "demo" || entry.status === "ci"
                      ? "text-[var(--primary)]"
                      : "text-[var(--text-2)]"
                }
              >
                {entry.status}
              </span>
              {entry.url ? (
                <a
                  className="underline underline-offset-2 text-[var(--primary)]"
                  href={entry.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {entry.note ?? entry.url}
                </a>
              ) : (
                entry.note && (
                  <span className="text-[var(--text-2)] w-full sm:w-auto">
                    {entry.note}
                  </span>
                )
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-wrap gap-3 mt-1">
        <a
          className="text-xs underline underline-offset-2 text-[var(--primary)] w-fit"
          href="https://viapay.vercel.app/.well-known/stellar.toml"
          target="_blank"
          rel="noreferrer"
        >
          SEP-1 stellar.toml
        </a>
        <a
          className="text-xs underline underline-offset-2 text-[var(--primary)] w-fit"
          href={`${API}/v1/rails`}
          target="_blank"
          rel="noreferrer"
        >
          Rails discovery
        </a>
        <a
          className="text-xs underline underline-offset-2 text-[var(--primary)] w-fit"
          href={`${API}/v1/verify?network=mainnet&tx_hash=${EVIDENCE_MAINNET_PAY}`}
          target="_blank"
          rel="noreferrer"
        >
          Verify mainnet pay
        </a>
        <a
          className="text-xs underline underline-offset-2 text-[var(--primary)] w-fit"
          href={SEP55_ACTIONS}
          target="_blank"
          rel="noreferrer"
        >
          SEP-55 CI
        </a>
      </div>
    </div>
  );
}
