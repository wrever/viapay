"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API } from "@/lib/config";

type VerifyBody = {
  verified?: boolean;
  merchant?: string;
  treasury?: string;
  reseller?: string | null;
  amount?: string;
  fee?: string;
  net?: string;
  intent_id?: string;
  intent_id_hex?: string;
  contract_id?: string;
  contract?: string;
  network?: string;
  event?: string;
  error?: string;
  note?: string;
  rail?: string;
};

function shortG(g?: string | null) {
  if (!g || g.length < 12) return g ?? "—";
  return `${g.slice(0, 4)}…${g.slice(-4)}`;
}

function VerifyInner() {
  const params = useSearchParams();
  const initialHash = (params.get("tx_hash") || params.get("tx") || "").trim();
  const initialNet =
    params.get("network") === "testnet" ? "testnet" : "mainnet";

  const [txHash, setTxHash] = useState(initialHash);
  const [network, setNetwork] = useState<"testnet" | "mainnet">(initialNet);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<VerifyBody | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const explorer = useMemo(() => {
    const h = txHash.replace(/^0x/i, "").toLowerCase();
    if (h.length < 64) return null;
    const net = network === "mainnet" ? "public" : "testnet";
    return `https://stellar.expert/explorer/${net}/tx/${h}`;
  }, [txHash, network]);

  const run = useCallback(async () => {
    setBusy(true);
    setErr(null);
    setResult(null);
    const hash = txHash.replace(/^0x/i, "").toLowerCase().trim();
    if (hash.length < 64) {
      setErr("Pegá un tx_hash de 64 hex");
      setBusy(false);
      return;
    }
    try {
      const url = new URL(`${API}/v1/verify`);
      url.searchParams.set("tx_hash", hash);
      url.searchParams.set("network", network);
      const res = await fetch(url.toString(), { cache: "no-store" });
      const body = (await res.json()) as VerifyBody;
      if (!res.ok) {
        setErr(body.error || `HTTP ${res.status}`);
        return;
      }
      setResult(body);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "fetch failed");
    } finally {
      setBusy(false);
    }
  }, [txHash, network]);

  useEffect(() => {
    if (initialHash.length >= 64) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm uppercase tracking-wide opacity-60">
        ViaPay · verificador
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Comprobar pago on-chain
      </h1>
      <p className="mt-3 text-sm opacity-70">
        Decodifica el envelope del <code>payment-router</code> desde la cadena
        (sin API key). La fuente de verdad es Stellar; esta página solo lee y
        muestra. También podés abrir stellar.expert con el mismo hash.
      </p>

      <form
        className="mt-8 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="opacity-70">Red</span>
          <select
            className="rounded border border-black/15 bg-white px-3 py-2"
            value={network}
            onChange={(e) =>
              setNetwork(e.target.value === "testnet" ? "testnet" : "mainnet")
            }
          >
            <option value="mainnet">mainnet</option>
            <option value="testnet">testnet</option>
          </select>
        </label>
        <label className="grid gap-1 text-sm">
          <span className="opacity-70">tx_hash</span>
          <input
            className="rounded border border-black/15 bg-white px-3 py-2 font-mono text-xs"
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
            placeholder="64 hex…"
            spellCheck={false}
          />
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Leyendo cadena…" : "Verificar"}
        </button>
      </form>

      {err && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          ✘ {err}
        </p>
      )}

      {result && (
        <section className="mt-8 rounded-lg border border-black/10 p-4">
          <p className="text-lg font-medium">
            {result.verified
              ? `✔ ${result.event ?? "Paid"} · payment-router`
              : "✘ No coincide con payment-router"}
          </p>
          <ul className="mt-4 space-y-2 font-mono text-xs opacity-90">
            <li>merchant {shortG(result.merchant)}</li>
            <li>treasury {shortG(result.treasury)}</li>
            {result.reseller && <li>reseller {shortG(result.reseller)}</li>}
            {result.amount && <li>amount {result.amount}</li>}
            {result.net && <li>net {result.net}</li>}
            {result.fee && <li>fee {result.fee}</li>}
            {(result.intent_id || result.intent_id_hex) && (
              <li>
                intent_id{" "}
                {(result.intent_id || result.intent_id_hex || "").slice(0, 18)}…
              </li>
            )}
            <li>
              contract{" "}
              {shortG(result.contract_id || result.contract)}
            </li>
          </ul>
          {result.note && (
            <p className="mt-3 text-xs opacity-60">{result.note}</p>
          )}
        </section>
      )}

      {explorer && (
        <p className="mt-6 text-sm">
          <a className="underline" href={explorer} target="_blank" rel="noreferrer">
            Abrir en stellar.expert (RPC / explorer independiente)
          </a>
        </p>
      )}

      <p className="mt-10 text-xs opacity-50">
        Demo mainnet third-party:{" "}
        <a
          className="underline"
          href="/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f"
        >
          83926d93…
        </a>
      </p>
    </main>
  );
}

export default function VerifyPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-6 py-16 text-sm opacity-60">
          Cargando verificador…
        </main>
      }
    >
      <VerifyInner />
    </Suspense>
  );
}
