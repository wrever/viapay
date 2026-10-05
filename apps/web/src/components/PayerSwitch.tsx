"use client";

import { useId, useState } from "react";
import { Logo } from "@/components/Logo";

const INTENT_ID = "pi_8c41d6b2a7e3";

type Payer = "persona" | "agente";

export function PayerSwitch({ loginHref }: { loginHref: string }) {
  const [payer, setPayer] = useState<Payer>("persona");
  const base = useId();

  return (
    <div className="switch">
      <div className="switch__bar">
        <p className="switch__intent">
          Mismo cobro en los dos casos: <b>{INTENT_ID}</b> · 100,00 USDC
        </p>
        <div className="switch__tabs" role="tablist" aria-label="Quién paga">
          {(["persona", "agente"] as const).map((value) => (
            <button
              key={value}
              type="button"
              role="tab"
              id={`${base}-tab-${value}`}
              aria-selected={payer === value}
              aria-controls={`${base}-panel-${value}`}
              className="switch__tab"
              onClick={() => setPayer(value)}
            >
              {value === "persona" ? "Una persona" : "Un agente"}
            </button>
          ))}
        </div>
      </div>

      {payer === "persona" ? (
        <div
          className="switch__panel"
          role="tabpanel"
          id={`${base}-panel-persona`}
          aria-labelledby={`${base}-tab-persona`}
          key="persona"
        >
          <div className="switch__panel-grid">
            <div className="switch__copy">
              <h3>Abre el link y firma</h3>
              <p>
                El checkout pide un XDR con las tres patas ya armadas y lo manda
                a firmar a Freighter, Lobstr, xBull o la wallet embebida. Si
                falta la trustline de USDC, va en la misma firma.
              </p>
              <p>
                También funciona desde el teléfono: el QR es un SEP-7{" "}
                <code>tx</code> con <code>replace=sourceAccount</code>, no un
                pago simple que se llevaría el 100% a una sola cuenta.
              </p>
              <a href={loginHref}>Crear un cobro de prueba</a>
            </div>

            <div className="mini">
              <p className="mini__top">
                <Logo variant="horizontal" width={96} />
              </p>
              <p className="mini__amount">100,00 USDC</p>
              <p className="mini__desc">Mesa 12 · Almuerzo del viernes</p>
              <div className="mini__rows">
                <div className="leg">
                  <p className="leg__who">Recibe el comercio</p>
                  <span className="leg__amount">96,00 USDC</span>
                </div>
                <div className="leg">
                  <p className="leg__who">Fee ViaPay 1%</p>
                  <span className="leg__amount">1,00 USDC</span>
                </div>
                <div className="leg">
                  <p className="leg__who">Revendedor 3%</p>
                  <span className="leg__amount">3,00 USDC</span>
                </div>
              </div>
              <button className="mini__cta" type="button" tabIndex={-1} aria-hidden="true">
                Firmar y pagar
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div
          className="switch__panel"
          role="tabpanel"
          id={`${base}-panel-agente`}
          aria-labelledby={`${base}-tab-agente`}
          key="agente"
        >
          <div className="switch__panel-grid">
            <div className="switch__copy">
              <h3>Pide el recurso y recibe un 402</h3>
              <p>
                El mismo cobro vive detrás de{" "}
                <code>/v1/x402/{INTENT_ID}</code>. Sin pagar, responde{" "}
                <code>402 Payment Required</code> con el monto, el asset, cuánto
                va a cada una de las tres patas y cómo liquidar. Pagado,
                responde 200 con el payment intent y el hash.
              </p>
              <p>
                El reto sigue la forma de x402 v2 (<code>scheme: exact</code>,{" "}
                <code>network: stellar:testnet</code>) y añade la vía de ViaPay:
                pedir el XDR, firmarlo, devolverlo en <code>X-PAYMENT</code>.
              </p>
              <a href="https://developers.stellar.org/docs/build/agentic-payments/x402">
                x402 en los docs de Stellar
              </a>
            </div>

            {/* Pinned dark in both schemes: a transcript should read as one. */}
            <pre className="terminal" data-theme="dark">
              <code>
                <i>$</i> node examples/agent-pay.mjs
                {"\n"}
                <i>→</i> GET /v1/x402/{INTENT_ID}
                {"\n"}
                <b>← 402</b> Payment Required (x402Version 2)
                {"\n"}
                {"  "}scheme <u>exact</u> · network <u>stellar:testnet</u>
                {"\n"}
                {"  "}atomic <u>1000000000</u>
                {"\n"}
                {"  "}merchant{"        "}
                <u>96 (96%)</u>
                {"\n"}
                {"  "}viapay_treasury <u>1 (1%)</u>
                {"\n"}
                {"  "}reseller{"        "}
                <u>3 (3%)</u>
                {"\n"}
                <i>→</i> POST prepare · firma local · X-PAYMENT
                {"\n"}
                <b>← 200</b> status <u>succeeded</u>
                {"\n"}
                {"  "}tx 9046dc9b…caa3b0d
              </code>
            </pre>
          </div>
        </div>
      )}
    </div>
  );
}
