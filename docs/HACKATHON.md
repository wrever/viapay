# ViaPay — paquete para jurado

**Settlement rail:** un `payment_intent` lo paga una persona (checkout) o un agente (HTTP 402), con reparto hasta tres patas en Soroban `payment-router` (`pay` + `Paid`).

**Auditar sin confiar en nosotros:** [`VERIFY.md`](./VERIFY.md) (curls + expect). UI: https://viapay.vercel.app/evidence · CLI: `pnpm verify`.

Demos de producto día a día: **testnet**. Evidencia on-chain **mainnet** viva (fila #7). Lo no conectado está marcado.

---

## El problema

Un comercio que vende en cripto termina con tres problemas que no son suyos:

1. **Custodia.** La mayoría de las pasarelas reciben el dinero y después lo reenvían. Eso es ser un intermediario financiero, con el riesgo y la licencia que eso implica.
2. **Repartir con quien trajo la venta.** Marketplaces, afiliados y revendedores cobran su parte. Hoy eso se hace con una segunda transferencia, días después, confiando en que el comercio pague.
3. **Clientes que no son personas.** Un agente IA no puede abrir un checkout, conectar una wallet y apretar un botón. Mantener una segunda integración para eso duplica el trabajo.

## La solución

Un único objeto `payment_intent` con dos puertas:

- **Checkout hosted** (`https://viapay.vercel.app/pay/…`) para humanos: wallet (Freighter, Lobstr, xBull, …) o QR SEP-7.
- **`GET /v1/x402/:id`** para agentes: responde `402 Payment Required` con los requisitos de pago, el agente firma y liquida con el header `X-PAYMENT`.

Las dos puertas llaman al mismo `prepare` / `submit`, así que el reparto y la verificación son idénticos. ViaPay nunca tiene las llaves del pagador ni recibe el dinero del comercio: construye la transacción, la verifica y la empuja a Horizon.

### El reparto

| Pata | Cuánto | Quién lo decide |
|---|---|---|
| ViaPay | **1% fijo** (100 bps) | el entorno del servidor (`FEE_BPS`). El body de la request **no** puede tocarlo |
| Revendedor | opcional, 0–99% (`reseller_fee_bps` + `reseller_address`) | el comercio, al crear el cobro |
| Comercio | el resto | se calcula, nunca se envía |

$100 con un revendedor al 3%: **$1** a tesorería, **$3** al revendedor, **$96** al comercio. Una transacción, tres operaciones de pago, nadie custodia nada en el medio.

La matemática está en `calcFeeSplit` (`packages/shared`): unidades atómicas en bigint, las dos comisiones redondean hacia abajo y el comercio absorbe el residuo, así que las patas siempre suman el total exacto. `assertFeeBps` rechaza que las comisiones lleguen al 100%.

## Cómo usa Stellar

- **Path canónico: Soroban `payment-router`.** `pay(token, payer, merchant, treasury, reseller?, net, fee, reseller_fee, intent_id)` sobre SAC SEP-41. Hasta tres patas + evento `Paid`. Testnet `CDI6XC5Q…` · mainnet `CA4FJAYS…` (mismo wasm `2ef55539…`). `prepare` arma la invoke; `assertRouterPayXdr` valida contrato + patas + `intent_id` antes del RPC.
- **Verificación server-side.** Con router, un XDR que no sea esa invoke se rechaza. Path clásico multi-op (`assertSplitXdr`) solo si `STELLAR_MODE=simulated` sin contract id.
- **SEP-7.** Con router onchain el QR clásico se desactiva (Freighter = path canónico). Sin router, SEP-7 `web+stellar:tx` con `replace=sourceAccount` (nunca `web+stellar:pay`, que rompería el split).
- **Trustlines SEP-41/SAC.** USDC exige trustline en comercio, tesorería y revendedor; el dashboard avisa antes de cobrar.
- **Reconciliación.** Cobros router quedan `succeeded` vía `submit`. Horizon por memo (últimas 40 txs) sigue siendo fallback del path clásico.

## x402, sin facilitator

`GET /v1/x402/:id?client_secret=…` sin pagar devuelve 402 con forma de x402 v2:

```json
{
  "x402Version": 2,
  "error": "payment_required",
  "accepts": [{
    "scheme": "exact",
    "network": "stellar:testnet",
    "maxAmountRequired": "1000000000",
    "payTo": "GAXLJHCM…",
    "asset": "XLM",
    "extra": {
      "settlement": "viapay-split-envelope",
      "payouts": [
        { "role": "merchant", "amount": "96.0000000", "bps": 9600 },
        { "role": "viapay_treasury", "amount": "1.0000000", "bps": 100 },
        { "role": "reseller", "amount": "3.0000000", "bps": 300 }
      ]
    }
  }],
  "viapay": { "settle": { "prepare": "…", "submit": "…" } }
}
```

El agente pide el XDR a `prepare`, lo firma local y hace `POST /v1/x402/:id` con `X-PAYMENT` (base64 JSON). La respuesta 200 lleva `X-PAYMENT-RESPONSE` con el hash.

**Decisión consciente:** no hay facilitator. El agente firma el mismo envelope Soroban (`pay`) que el humano en checkout. El esquema `exact` sigue honesto: `accepts[0].maxAmountRequired` es el total que se mueve; el split vive en `extra.payouts` y en el contrato.

## Demo de 90 segundos

```bash
pnpm install && pnpm db:seed && pnpm dev
```

1. **(0:00)** Landing en https://viapay.vercel.app (o `:3000` local). Una frase: un cobro, lo paga una persona o su agente.
2. **(0:20)** Panel `/app` → Cobros. Monto + revendedor → crear → copiar **un** link. Chip “Soroban router”.
3. **(0:40)** Abrir el link `/pay/…`. Freighter → firmar. Recibo de patas + link stellar.expert (invoke `pay` + evento `Paid`).
4. **(1:00)** Historial: **Pagado** + hash. Opcional: Integración → matriz SEPs + contrato mainnet evidencia.
5. **(1:15)** El mismo cobro, pero para un agente:

   ```bash
   VIAPAY_API_KEY=sk_test_… AGENT_SECRET_KEY=S… RESELLER_FEE_BPS=300 \
     node examples/agent-pay.mjs
   ```

   Imprime el 402 con el desglose, firma el mismo `pay` del router, liquida con `X-PAYMENT`. Cero intervención humana.

## Evidencia on-chain

**Mainnet (2026-10-09)** — deploy + pay con evento `Paid`:

| | |
|---|---|
| contract | `CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U` |
| deploy | [`058c3502…`](https://stellar.expert/explorer/public/tx/058c3502c840ae6d70edd4f8a00ffa301ab9537fa0b8a1f879a05b8f22b6f1b6) |
| pay | [`b28aafbd…`](https://stellar.expert/explorer/public/tx/b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e) · 0.099 + 0.001 XLM |
| wasm | `2ef55539…` (= testnet) |

**Testnet** — split clásico histórico (agente x402, 100 XLM, 96/1/3) + deploy router:

tx clásico `9046dc9b3d107f1eb069c86b8d34252c667cd07f2ef13c7ac04ea1303caa3b0d` (path actual = **router**)

| Operación | Monto | Destino | Rol |
|---|---|---|---|
| payment | `96.0000000` | `GAXLJHCMV6ZATLOI4SWBONOCS27KSBY55DGFNLWEM35NCU256OPBJMRS` | comercio |
| payment | `1.0000000` | `GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5` | tesorería ViaPay (1%) |
| payment | `3.0000000` | `GCKAC7MNMVWK5HISZDCY7QJQ6ICSPQJ6PSX3NJCSLJBQLC5QXJNCYLNP` | revendedor (3%) |

**Contrato Soroban `payment-router` (testnet):**

| | |
|---|---|
| contract id | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` |
| tx del deploy | `7f0d1f0a4e9090e86f17eecb438544e8e178d632fc0ac5c91fdfc712b4c7f159` |
| hash del wasm | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |
| toolchain | soroban-sdk 27 · Stellar CLI 23.2.1 · `wasm32v1-none` |

```bash
stellar contract info interface \
  --id CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT \
  --network testnet
```

## Lo que no está hecho

Dicho sin maquillaje, porque un jurado lo va a preguntar:

- **SEP-55 Lab registration** pendiente (CI + attest ya en GitHub Actions).
- **No hay facilitator x402.** ViaPay liquida por su cuenta.
- **Anchor SEP-24** = demo SDF Test Anchor (fiat simulado). Escrow Trustless Work / Pollar: código listo, sin credenciales productivas.
- **Demo día a día en testnet**; mainnet vivo para evidencia (cobros panel mainnet cuando `PAYMENT_ROUTER_CONTRACT_ID_MAINNET` está en la API). Sin KYC, sin audit.
- **Reconcile Horizon por memo** es escaneo (40 txs), no índice — solo path clásico; router usa submit.

## Dónde mirar el código

| Qué | Dónde |
|---|---|
| Matemática del reparto | `packages/shared/src/index.ts` |
| Patas, XDR, SEP-7, verificación | `packages/stellar/src/index.ts` |
| Challenge y header x402 | `apps/api/src/lib/x402.ts` · `apps/api/src/app/v1/x402/[id]/route.ts` |
| Orquestación del cobro | `apps/api/src/lib/chain.ts` · `apps/api/src/lib/payments.ts` |
| Contrato | `contracts/payment-router/src/lib.rs` |
| Demo de agente | `examples/agent-pay.mjs` |
| Alta con revendedor + preview | `apps/dashboard/src/components/CreatePaymentLink.tsx` |
| Desglose en el checkout | `apps/checkout/src/components/PayPanel.tsx` |

Estado completo y honesto del proyecto: [`docs/MEMORY.md`](MEMORY.md).
