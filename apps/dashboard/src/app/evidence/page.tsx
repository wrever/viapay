import type { Metadata } from "next";
import type { ReactNode } from "react";
import Link from "next/link";
import { MarketingShell } from "@/components/marketing/MarketingShell";
import { panelLoginHref } from "@/lib/marketing/urls";
import { API } from "@/lib/config";
import "../marketing.css";

export const metadata: Metadata = {
  title: "Evidence · ViaPay",
  description:
    "On-chain evidence for ViaPay payment-router: mainnet third-party pay + Paid, public verify, judge kit.",
};

const MAINNET_CONTRACT =
  "CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U";
const TESTNET_CONTRACT =
  "CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT";
const DEPLOY =
  "058c3502c840ae6d70edd4f8a00ffa301ab9537fa0b8a1f879a05b8f22b6f1b6";
/** Primary evidence: merchant ≠ treasury */
const PAY_THIRD =
  "83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f";
const PAY_SELF =
  "b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e";
const WASM =
  "2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383";
const TESTNET_DEPLOY =
  "7f0d1f0a4e9090e86f17eecb438544e8e178d632fc0ac5c91fdfc712b4c7f159";
const TREASURY = "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5";
const MERCHANT_THIRD =
  "GCXXPBS3OZ2ELAY4BOHNEWHGEPYNRZHPFCPICVVMNCYXPH3XPEBEMLFI";
const LEDGER_THIRD = 64864011;
const PARITY_ID = "pi_56fad4bc479de4f5e043065e";
const UNPAID_ID = "pi_df1327cbdea35264be5d24a9";

function Row({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <div className="grid gap-1 border-b border-[var(--border)] py-3 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-[var(--text-2)]">{label}</dt>
      <dd className="text-sm text-[var(--text)] break-all">{children}</dd>
    </div>
  );
}

export default function EvidencePage() {
  const verifyThird = `${API}/v1/verify?network=mainnet&tx_hash=${PAY_THIRD}`;
  const verifySelf = `${API}/v1/verify?network=mainnet&tx_hash=${PAY_SELF}`;
  const railsUrl = `${API}/v1/rails`;
  const parityUrl = `${API}/v1/parity/${PARITY_ID}`;
  const settlePaid = `${API}/v1/settle-proof/${PARITY_ID}`;
  const settleUnpaid = `${API}/v1/settle-proof/${UNPAID_ID}`;
  const explorerThird = `https://stellar.expert/explorer/public/tx/${PAY_THIRD}`;
  const login = panelLoginHref();

  return (
    <MarketingShell>
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <p className="text-sm text-[var(--text-2)]">
          <Link href="/" className="underline underline-offset-2">
            ViaPay
          </Link>
          {" · "}
          <Link href="/docs" className="underline underline-offset-2">
            Docs
          </Link>
          {" · "}
          <Link href={login} className="underline underline-offset-2">
            Panel
          </Link>
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-[var(--text)]">
          Evidence
        </h1>
        <p className="mt-3 text-[var(--text-2)] leading-relaxed">
          Public proof that ViaPay settlement runs through Soroban{" "}
          <code className="text-[var(--text)]">payment-router</code> on{" "}
          <span className="text-[var(--text)]">Stellar pubnet (mainnet)</span>
          . Prefer the third-party merchant tx below.
        </p>

        <section className="mt-10 rounded-lg border border-[var(--border)] bg-[var(--surface)] p-5 sm:p-6">
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--text-2)]">
            Mainnet · pubnet · ledger {LEDGER_THIRD}
          </p>
          <h2 className="mt-2 text-xl font-semibold text-[var(--text)]">
            pay() + Paid · merchant ≠ treasury
          </h2>
          <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">
            Payer/treasury{" "}
            <code className="text-xs text-[var(--text)]">
              {TREASURY.slice(0, 8)}…{TREASURY.slice(-6)}
            </code>{" "}
            → merchant{" "}
            <code className="text-xs text-[var(--text)]">
              {MERCHANT_THIRD.slice(0, 8)}…{MERCHANT_THIRD.slice(-6)}
            </code>
            . Split 0.099 + 0.001 XLM · event{" "}
            <code className="text-[var(--text)]">Paid</code>.
          </p>
          <p className="mt-4 break-all font-mono text-sm text-[var(--text)]">
            <a
              className="underline underline-offset-2 text-[var(--primary)]"
              href={explorerThird}
              target="_blank"
              rel="noreferrer"
            >
              {PAY_THIRD}
            </a>
          </p>
          <p className="mt-3 text-sm text-[var(--text-2)]">
            <a
              className="underline underline-offset-2 text-[var(--primary)]"
              href={verifyThird}
              target="_blank"
              rel="noreferrer"
            >
              GET /v1/verify → verified: true · event: Paid
            </a>
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Judge kit (public)
          </h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-[var(--text-2)]">
            <li>
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={parityUrl}
                target="_blank"
                rel="noreferrer"
              >
                /v1/parity/{PARITY_ID}
              </a>{" "}
              → <code className="text-[var(--text)]">ok: true</code>, surfaces
              intent/x402/paid. Fake id → 404 (not a fixed ok).
            </li>
            <li>
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={settlePaid}
                target="_blank"
                rel="noreferrer"
              >
                settle-proof paid
              </a>{" "}
              → 200 + <code className="text-[var(--text)]">stellar_tx_hash</code>{" "}
              · network <code className="text-[var(--text)]">testnet</code>.{" "}
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={settleUnpaid}
                target="_blank"
                rel="noreferrer"
              >
                unpaid
              </a>{" "}
              → 409 <code className="text-[var(--text)]">status: unpaid</code>.
            </li>
            <li>
              Recibo{" "}
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={`https://viapay.vercel.app/r/${PARITY_ID}`}
                target="_blank"
                rel="noreferrer"
              >
                /r/{PARITY_ID}
              </a>{" "}
              · código <code className="text-[var(--text)]">VP-AMMU</code>{" "}
              (testnet).
            </li>
            <li>
              CLI: <code className="text-[var(--text)]">pnpm verify -- --kit</code>
            </li>
          </ol>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Cómo paga un cliente en Chile (honesto)
          </h2>
          <p className="mt-2 text-sm text-[var(--text-2)] leading-relaxed">
            Hoy el pagador necesita una wallet Stellar (p. ej. Freighter) y
            crypto (XLM/USDC). Camino típico: comprar XLM en un exchange o P2P →
            enviar a la wallet → abrir el link de cobro → firmar. No hay on-ramp
            bancario CLP→crypto en este MVP; el comercio sí puede cotizar en
            CLP con <code className="text-[var(--text)]">exact-pay</code> (monto
            crypto trabado al crear el link). SEP-24 cash-out del comercio es
            demo simulado.
          </p>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Mainnet contract
          </h2>
          <dl className="mt-2">
            <Row label="Contract">
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={`https://stellar.expert/explorer/public/contract/${MAINNET_CONTRACT}`}
                target="_blank"
                rel="noreferrer"
              >
                {MAINNET_CONTRACT}
              </a>
            </Row>
            <Row label="Deploy tx">
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={`https://stellar.expert/explorer/public/tx/${DEPLOY}`}
                target="_blank"
                rel="noreferrer"
              >
                {DEPLOY}
              </a>
            </Row>
            <Row label="Pay (3rd party)">
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={explorerThird}
                target="_blank"
                rel="noreferrer"
              >
                {PAY_THIRD}
              </a>
              <span className="block text-[var(--text-2)] mt-1">
                ledger {LEDGER_THIRD} · merchant ≠ treasury · Paid
              </span>
            </Row>
            <Row label="Pay (self)">
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={`https://stellar.expert/explorer/public/tx/${PAY_SELF}`}
                target="_blank"
                rel="noreferrer"
              >
                {PAY_SELF}
              </a>
              <span className="block text-[var(--text-2)] mt-1">
                earlier existence proof · merchant = treasury
              </span>
            </Row>
            <Row label="Wasm hash">
              <code>{WASM}</code>
            </Row>
            <Row label="Public verify">
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={verifyThird}
                target="_blank"
                rel="noreferrer"
              >
                GET /v1/verify (third-party)
              </a>
              {" · "}
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={verifySelf}
                target="_blank"
                rel="noreferrer"
              >
                self-pay
              </a>
            </Row>
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Testnet router
          </h2>
          <dl className="mt-2">
            <Row label="Contract">
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={`https://stellar.expert/explorer/testnet/contract/${TESTNET_CONTRACT}`}
                target="_blank"
                rel="noreferrer"
              >
                {TESTNET_CONTRACT}
              </a>
            </Row>
            <Row label="Deploy">
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={`https://stellar.expert/explorer/testnet/tx/${TESTNET_DEPLOY}`}
                target="_blank"
                rel="noreferrer"
              >
                {TESTNET_DEPLOY}
              </a>
            </Row>
            <Row label="Rails">
              <a
                className="underline underline-offset-2 text-[var(--primary)]"
                href={railsUrl}
                target="_blank"
                rel="noreferrer"
              >
                GET /v1/rails
              </a>
            </Row>
          </dl>
        </section>

        <section className="mt-10">
          <h2 className="text-lg font-semibold text-[var(--text)]">
            Copy this to verify
          </h2>
          <pre className="mt-3 overflow-x-auto rounded-md border border-[var(--border)] bg-[var(--surface)] p-4 text-xs text-[var(--text)]">
{`pnpm verify -- --kit
# parity + settle-proof paid/unpaid + fake 404 + mainnet third-party

curl -sS '${verifyThird}' \\
  | jq '{verified, event, merchant, treasury, net, fee}'
# expect: verified true · Paid · merchant ≠ treasury · 0.099 / 0.001`}
          </pre>
        </section>

        <p className="mt-10 text-sm text-[var(--text-2)] leading-relaxed">
          Honest limits: not externally audited. Day-to-day product demos use
          testnet. Mainnet has two pays (self + third-party merchant). Meta WA
          Live, Resend key, and SEP-55 Lab registration are still ops. Payer
          needs wallet + crypto (see Chile path above). No bank on-ramp in this
          MVP.
        </p>
      </main>
    </MarketingShell>
  );
}
