import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Recibo ViaPay",
  description: "Recibo on-chain — proof-or-nothing. Las capturas no son prueba.",
};

type Proof = {
  body?: {
    status?: string;
    amount?: string;
    asset?: string;
    net_amount?: string;
    fee_amount?: string;
    reseller_amount?: string;
    stellar_tx_hash?: string | null;
    network?: string;
    short_code?: string | null;
    exact_pay?: { fiat_amount?: string; fiat_currency?: string } | null;
    breakdown?: Array<{ role: string; amount: string; address: string }>;
  };
  parity_ok?: boolean | null;
  parity_url?: string;
  verify_url?: string | null;
  receipt_url?: string;
  note?: string;
};

async function loadProof(id: string): Promise<Proof | { error: string }> {
  const api = (
    process.env.NEXT_PUBLIC_VIAPAY_API_URL || "https://viapay-api.vercel.app"
  ).replace(/\/$/, "");
  try {
    const res = await fetch(`${api}/v1/settle-proof/${id}`, {
      cache: "no-store",
    });
    const data = (await res.json()) as Proof & { error?: string };
    if (!res.ok) {
      return { error: data.error || `HTTP ${res.status}` };
    }
    return data;
  } catch (e) {
    return { error: e instanceof Error ? e.message : "fetch failed" };
  }
}

export default async function ReceiptPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const proof = await loadProof(id);

  if ("error" in proof) {
    return (
      <main className="mx-auto max-w-lg px-6 py-16">
        <p className="text-sm uppercase tracking-wide opacity-60">ViaPay</p>
        <h1 className="mt-2 text-3xl font-semibold">Recibo no disponible</h1>
        <p className="mt-4 opacity-80">
          proof-or-nothing: solo cobros confirmados on-chain tienen recibo. Una
          captura o “te transferí” no alcanza.
        </p>
        <p className="mt-2 font-mono text-sm opacity-60">{proof.error}</p>
        <p className="mt-6 font-mono text-xs break-all opacity-50">{id}</p>
      </main>
    );
  }

  const b = proof.body!;
  const net = b.network === "mainnet" ? "public" : "testnet";
  const explorer = b.stellar_tx_hash
    ? `https://stellar.expert/explorer/${net}/tx/${b.stellar_tx_hash}`
    : null;
  const site = (
    process.env.NEXT_PUBLIC_VIAPAY_CHECKOUT_URL || "https://viapay.vercel.app"
  ).replace(/\/$/, "");
  const verifyPage =
    b.stellar_tx_hash &&
    `${site}/verify?network=${b.network === "mainnet" ? "mainnet" : "testnet"}&tx_hash=${b.stellar_tx_hash}`;

  return (
    <main className="mx-auto max-w-lg px-6 py-16">
      <p className="text-sm uppercase tracking-wide opacity-60">ViaPay · recibo</p>
      <h1 className="mt-2 text-4xl font-semibold tracking-tight">Pagado</h1>
      <p className="mt-2 text-sm opacity-70">
        Confirmado on-chain. Las capturas no son prueba (proof-or-nothing).
        Cualquiera puede re-verificar el tx sin confiar en una captura.
      </p>

      <p className="mt-8 text-3xl font-medium">
        {b.amount}{" "}
        <span className="text-lg opacity-70">{b.asset}</span>
      </p>
      {b.exact_pay?.fiat_amount && (
        <p className="mt-1 text-sm opacity-70">
          Cotizado {b.exact_pay.fiat_amount} {b.exact_pay.fiat_currency} → crypto
          trabado
        </p>
      )}
      {b.short_code && (
        <p className="mt-2 font-mono text-sm opacity-80">{b.short_code}</p>
      )}

      <section className="mt-10">
        <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
          split-glass
        </h2>
        <ul className="mt-3 space-y-2 text-sm">
          <li>
            Comercio <span className="font-mono">{b.net_amount}</span>
          </li>
          <li>
            Fee ViaPay <span className="font-mono">{b.fee_amount}</span>
          </li>
          {b.reseller_amount && b.reseller_amount !== "0.0000000" && (
            <li>
              Reseller <span className="font-mono">{b.reseller_amount}</span>
            </li>
          )}
        </ul>
      </section>

      <section className="mt-8 space-y-2 text-sm">
        <p>
          rail-parity:{" "}
          <strong>{proof.parity_ok ? "ok" : "ver link"}</strong>
        </p>
        {proof.parity_url && (
          <p>
            <a className="underline" href={proof.parity_url}>
              Ver parity
            </a>
          </p>
        )}
        <p>
          <a className="underline" href={`${site}/recibo?id=${encodeURIComponent(id)}`}>
            Recibo que no miente (4 comparaciones)
          </a>
        </p>
        {verifyPage && (
          <p>
            <a className="underline" href={verifyPage}>
              Verificar tx (/verify · sin API key)
            </a>
          </p>
        )}
        {proof.verify_url && (
          <p>
            <a className="underline" href={proof.verify_url}>
              API decode: /v1/verify
            </a>
          </p>
        )}
        {explorer && (
          <p>
            <a className="underline" href={explorer} target="_blank" rel="noreferrer">
              stellar.expert (independiente)
            </a>
          </p>
        )}
      </section>

      {verifyPage && b.stellar_tx_hash && (
        <section className="mt-10 rounded-lg border border-black/10 p-4 text-sm">
          <h2 className="text-sm font-medium uppercase tracking-wide opacity-60">
            Bloque autocontenido
          </h2>
          <pre className="mt-3 overflow-x-auto whitespace-pre-wrap break-all font-mono text-[11px] opacity-80">{`intent: ${id}
tx: ${b.stellar_tx_hash}
network: ${b.network ?? "testnet"}
amount: ${b.amount} ${b.asset}
net: ${b.net_amount} · fee: ${b.fee_amount}
verify: ${verifyPage}
explorer: ${explorer ?? ""}`}</pre>
          <p className="mt-2 text-xs opacity-60">
            Copiá este bloque o abrí /verify con el tx_hash. La captura sola no
            prueba nada.
          </p>
        </section>
      )}

      <p className="mt-12 text-xs opacity-50">{proof.note}</p>
    </main>
  );
}
