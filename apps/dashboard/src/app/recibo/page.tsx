"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { API } from "@/lib/config";

type Surface = {
  amount?: string;
  asset?: string;
  network?: string;
  net_amount?: string;
  fee_amount?: string;
  merchant_wallet?: string;
  tx_hash?: string | null;
  status?: string;
};

type Parity = {
  ok?: boolean;
  payment_intent?: string;
  status?: string;
  mismatches?: string[];
  surfaces?: {
    intent?: Surface;
    x402?: Surface;
    paid?: Surface | null;
  };
  links?: { verify?: string | null; receipt?: string };
  error?: string;
};

type Proof = {
  body?: Surface & {
    stellar_tx_hash?: string | null;
    payment_intent?: string;
    status?: string;
  };
  parity_ok?: boolean | null;
  error?: string;
};

function shortG(g?: string | null) {
  if (!g || g.length < 12) return g ?? "—";
  return `${g.slice(0, 4)}…${g.slice(-4)}`;
}

function CheckRow({
  label,
  ok,
  detail,
}: {
  label: string;
  ok: boolean | null;
  detail: string;
}) {
  const mark = ok === null ? "·" : ok ? "✔" : "✘";
  const color =
    ok === null ? "opacity-50" : ok ? "text-emerald-800" : "text-red-700";
  return (
    <div className={`rounded-lg border border-black/10 px-4 py-3 ${color}`}>
      <p className="text-sm font-medium">
        {mark} {label}
      </p>
      <p className="mt-1 font-mono text-[11px] opacity-80">{detail}</p>
    </div>
  );
}

function ReciboInner() {
  const params = useSearchParams();
  const demo = params.get("demo") === "altered";
  const initialId =
    params.get("id") ||
    params.get("pi") ||
    (demo ? "pi_56fad4bc479de4f5e043065e" : "");

  const [id, setId] = useState(initialId);
  const [busy, setBusy] = useState(false);
  const [parity, setParity] = useState<Parity | null>(null);
  const [proof, setProof] = useState<Proof | null>(null);
  const [err, setErr] = useState<string | null>(null);
  /** Local tamper for demo: inflate amount on the "recibo" surface only. */
  const [tamper, setTamper] = useState(demo);

  const run = useCallback(async () => {
    const pi = id.trim();
    if (!pi.startsWith("pi_")) {
      setErr("Pegá un payment_intent (pi_…)");
      return;
    }
    setBusy(true);
    setErr(null);
    setParity(null);
    setProof(null);
    const ctrl = new AbortController();
    const timer = window.setTimeout(() => ctrl.abort(), 20000);
    try {
      const [pRes, sRes] = await Promise.all([
        fetch(`${API}/v1/parity/${pi}`, {
          cache: "no-store",
          signal: ctrl.signal,
        }),
        fetch(`${API}/v1/settle-proof/${pi}`, {
          cache: "no-store",
          signal: ctrl.signal,
        }),
      ]);
      const pBody = (await pRes.json()) as Parity;
      const sBody = (await sRes.json()) as Proof & { error?: string };
      if (!pRes.ok) {
        setErr(pBody.error || `parity HTTP ${pRes.status}`);
        return;
      }
      setParity(pBody);
      if (sRes.ok) setProof(sBody);
      else setProof({ error: sBody.error || `settle-proof ${sRes.status}` });
    } catch (e) {
      const msg =
        e instanceof Error && e.name === "AbortError"
          ? "Timeout al comparar (20s). Reintentá."
          : e instanceof Error
            ? e.message
            : "fetch failed";
      setErr(msg);
    } finally {
      window.clearTimeout(timer);
      setBusy(false);
    }
  }, [id]);

  useEffect(() => {
    if (initialId.startsWith("pi_")) void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const checks = useMemo(() => {
    if (!parity?.surfaces) return null;
    const intent = parity.surfaces.intent;
    const x402 = parity.surfaces.x402;
    const paid = parity.surfaces.paid;
    const receipt = proof?.body;

    const intentOk = Boolean(intent?.amount && intent?.merchant_wallet);
    const x402Ok =
      intentOk &&
      x402?.amount === intent?.amount &&
      x402?.merchant_wallet === intent?.merchant_wallet &&
      x402?.net_amount === intent?.net_amount;

    const paidOk = paid
      ? paid.merchant_wallet === intent?.merchant_wallet &&
        paid.net_amount === intent?.net_amount &&
        (!intent?.amount ||
          paid.amount === intent.amount ||
          /* abonos: paid surface may show last leg; parity.ok is source */
          parity.ok === true)
      : parity.status === "succeeded"
        ? false
        : null;

    let receiptAmount = receipt?.amount;
    let receiptMerchant = receipt?.merchant_wallet;
    if (tamper && receiptAmount) {
      // Demo: pretend someone edited the screenshot / HTML
      const n = Number(receiptAmount);
      receiptAmount = Number.isFinite(n)
        ? (n * 10).toFixed(7)
        : "999.0000000";
      receiptMerchant = receiptMerchant
        ? `GFAKE${receiptMerchant.slice(5)}`
        : "GFAKE…";
    }

    const receiptOk =
      !receipt || proof?.error
        ? parity.status === "succeeded"
          ? false
          : null
        : receiptAmount === intent?.amount &&
          receiptMerchant === intent?.merchant_wallet &&
          (receipt.stellar_tx_hash || receipt.tx_hash) ===
            (intent?.tx_hash || paid?.tx_hash);

    const allOk =
      intentOk &&
      x402Ok &&
      (paidOk === true || (paidOk === null && parity.status !== "succeeded")) &&
      (receiptOk === true ||
        (receiptOk === null && parity.status !== "succeeded")) &&
      !tamper &&
      parity.ok === true;

    return {
      intentOk,
      x402Ok,
      paidOk,
      receiptOk: tamper ? false : receiptOk,
      allOk: tamper ? false : allOk,
      intent,
      x402,
      paid,
      receiptAmount,
      receiptMerchant,
      receiptTx: receipt?.stellar_tx_hash || receipt?.tx_hash,
    };
  }, [parity, proof, tamper]);

  const verifyHref =
    checks?.paid?.tx_hash || checks?.intent?.tx_hash
      ? `/verify?network=${
          checks.intent?.network === "mainnet" ? "mainnet" : "testnet"
        }&tx_hash=${checks.paid?.tx_hash || checks.intent?.tx_hash}`
      : null;

  return (
    <main className="mx-auto max-w-lg px-6 py-14">
      <p className="text-sm uppercase tracking-wide opacity-60">
        ViaPay · recibo que no miente
      </p>
      <h1 className="mt-2 text-3xl font-semibold tracking-tight">
        Cobros que no se pueden falsificar
      </h1>
      <p className="mt-3 text-sm opacity-70">
        Cuatro superficies, una verdad: lo que cobró el comercio (intent), lo
        que pidió el 402, lo que pasó on-chain y lo que muestra el recibo.
        Cualquier alteración se ve como ✘. No es magia: el estado se deriva de
        la cadena.
      </p>

      <form
        className="mt-8 grid gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          void run();
        }}
      >
        <label className="grid gap-1 text-sm">
          <span className="opacity-70">payment_intent</span>
          <input
            className="rounded border border-black/15 bg-white px-3 py-2 font-mono text-xs"
            value={id}
            onChange={(e) => setId(e.target.value)}
            placeholder="pi_…"
            spellCheck={false}
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={tamper}
            onChange={(e) => setTamper(e.target.checked)}
          />
          Modo demo: alterar monto/destino del “recibo” (como una captura falsa)
        </label>
        <button
          type="submit"
          disabled={busy}
          className="rounded bg-black px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50"
        >
          {busy ? "Comparando…" : "Verificar las 4"}
        </button>
      </form>

      {err && (
        <p className="mt-6 text-sm text-red-700" role="alert">
          ✘ {err}
        </p>
      )}

      {checks && parity && (
        <section className="mt-8 space-y-3">
          <p className="text-lg font-medium">
            {checks.allOk
              ? "✔ Las cuatro coinciden"
              : tamper
                ? "✘ Recibo alterado — la verificación falla (eso es el punto)"
                : parity.ok
                  ? "✔ rail-parity ok (revisá superficies)"
                  : "✘ Hay mismatches"}
          </p>

          <CheckRow
            label="1 · Intent (comercio)"
            ok={checks.intentOk}
            detail={`${checks.intent?.amount} ${checks.intent?.asset} → ${shortG(checks.intent?.merchant_wallet)} · fee ${checks.intent?.fee_amount}`}
          />
          <CheckRow
            label="2 · x402 (agente / challenge)"
            ok={checks.x402Ok}
            detail={`${checks.x402?.amount} ${checks.x402?.asset} → ${shortG(checks.x402?.merchant_wallet)}`}
          />
          <CheckRow
            label="3 · On-chain Paid"
            ok={checks.paidOk}
            detail={
              checks.paid
                ? `net ${checks.paid.net_amount} · ${shortG(checks.paid.merchant_wallet)} · tx ${(checks.paid.tx_hash || "").slice(0, 12)}…`
                : parity.status === "succeeded"
                  ? "faltaba Paid"
                  : "aún no pagado (null = esperado)"
            }
          />
          <CheckRow
            label="4 · Recibo"
            ok={checks.receiptOk}
            detail={
              proof?.error
                ? proof.error
                : `${checks.receiptAmount ?? "—"} → ${shortG(checks.receiptMerchant)} · tx ${(checks.receiptTx || "").slice(0, 12)}…${tamper ? " · ALTERADO" : ""}`
            }
          />

          {parity.mismatches && parity.mismatches.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-xs text-red-700">
              {parity.mismatches.map((m) => (
                <li key={m}>{m}</li>
              ))}
            </ul>
          )}

          <div className="mt-4 flex flex-wrap gap-3 text-sm">
            {parity.links?.receipt && (
              <a className="underline" href={parity.links.receipt}>
                Abrir /r
              </a>
            )}
            {verifyHref && (
              <a className="underline" href={verifyHref}>
                Decode tx (/verify)
              </a>
            )}
            <a
              className="underline"
              href={`/recibo?id=${encodeURIComponent(id)}&demo=altered`}
            >
              Demo captura falsa
            </a>
          </div>
        </section>
      )}

      <aside className="mt-12 rounded-lg border border-black/10 p-4 text-sm opacity-80">
        <p className="font-medium">Contraste (guion demo)</p>
        <p className="mt-2">
          Izquierda: captura de transferencia editada en 10s. Derecha: este
          recibo — si tocás monto o destino, alguna casilla pasa a ✘.
        </p>
        <p className="mt-2 text-xs opacity-60">
          Límite honesto: un estafador puede mandar un link de <em>otro</em>{" "}
          comercio; por eso existe el enlace firmado en /pay. /recibo depende de
          la API para armar la comparación; la cadena sigue en stellar.expert.
        </p>
      </aside>

      <p className="mt-8 text-xs opacity-50">
        Demo pagado testnet:{" "}
        <a
          className="underline"
          href="/recibo?id=pi_56fad4bc479de4f5e043065e"
        >
          pi_56fad4bc…
        </a>
      </p>
    </main>
  );
}

export default function ReciboPage() {
  return (
    <Suspense
      fallback={
        <main className="mx-auto max-w-lg px-6 py-14 text-sm opacity-60">
          Cargando recibo…
        </main>
      }
    >
      <ReciboInner />
    </Suspense>
  );
}
