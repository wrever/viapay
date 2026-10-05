# ViaPay — paquete para jurado

**Un cobro en Stellar que puede pagar una persona en un checkout o un agente IA por HTTP 402, con el reparto a tres patas dentro de la misma transacción.**

Todo lo de abajo corre en testnet y se puede verificar en Horizon. Lo que no está conectado está marcado como tal.

---

## El problema

Un comercio que vende en cripto termina con tres problemas que no son suyos:

1. **Custodia.** La mayoría de las pasarelas reciben el dinero y después lo reenvían. Eso es ser un intermediario financiero, con el riesgo y la licencia que eso implica.
2. **Repartir con quien trajo la venta.** Marketplaces, afiliados y revendedores cobran su parte. Hoy eso se hace con una segunda transferencia, días después, confiando en que el comercio pague.
3. **Clientes que no son personas.** Un agente IA no puede abrir un checkout, conectar una wallet y apretar un botón. Mantener una segunda integración para eso duplica el trabajo.

## La solución

Un único objeto `payment_intent` con dos puertas:

- **Checkout hosted** (`:3004`) para humanos: wallet (Freighter, Lobstr, xBull, …) o QR SEP-7.
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

- **Pagos clásicos multi-operación.** Una transacción con 2 o 3 `payment` ops y el id del cobro en el memo. `payoutLegs` arma las patas y descarta las de monto cero.
- **Verificación server-side antes de Horizon.** `assertSplitXdr` desarma el XDR firmado y consume una operación por pata esperada; si falta una o el monto no cuadra, se rechaza. Un cliente no puede firmar una versión con menos fee.
- **SEP-7 `web+stellar:tx`** con `replace=sourceAccount` para el QR, con callback a la API. No usamos `web+stellar:pay`, que mandaría el 100% al comercio y rompería el reparto.
- **Trustlines SEP-41/SAC.** Con USDC, si al pagador le falta la trustline, el mismo XDR incluye el `changeTrust`. Y como la comisión del revendedor va en la misma transacción, el comercio **y** la tesorería **y** el revendedor tienen que poder recibir: el dashboard lo comprueba y avisa antes de dejar cobrar.
- **Reconciliación.** Horizon no indexa memos, así que al abrir el checkout o el dashboard se revisan las últimas 40 transacciones del comercio y se marca `succeeded` solo si el memo y las tres patas coinciden.
- **Cómo usa Stellar / Soroban.** `contracts/payment-router` hace el mismo reparto de tres patas on-chain sobre un token SEP-41. Desplegado en testnet. Con `PAYMENT_ROUTER_CONTRACT_ID`, `prepare`/`submit` lo invocan; sin esa env, path clásico multi-op. SEP-7 sigue clásico.

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

**Decisión consciente:** no hay facilitator. El pagador firma un envelope completo de Stellar, no auth entries de un contrato, porque el reparto de hoy es clásico. Eso mantiene el esquema `exact` honesto: el monto que ves en `accepts[0]` es exactamente lo que se mueve.

## Demo de 90 segundos

```bash
pnpm install && pnpm db:seed && pnpm dev
```

1. **(0:00)** Landing en `:3003`. Una frase: un cobro, lo paga una persona o su agente. Scroll hasta el reparto: el recibo y el diagrama de tres patas.
2. **(0:20)** Dashboard en `:3000` → *Continuar en local*. Monto `100`, asset `USDC`, marcar **Reparte una comisión con un revendedor**, `3%` y la wallet del partner. El preview muestra en vivo: ViaPay 1,00 · revendedor 3,00 · tú recibes 96,00. Crear link.
3. **(0:40)** Abrir el link: checkout en `:3004`. El recibo desglosa las tres patas y el total que se firma. Conectar wallet, firmar. Una sola firma.
4. **(1:00)** Vuelta al dashboard: el cobro pasa a **Pagado** con el hash. Abrirlo en stellar.expert: **tres** operaciones de pago en **una** transacción.
5. **(1:15)** El mismo cobro, pero para un agente:

   ```bash
   VIAPAY_API_KEY=sk_test_… AGENT_SECRET_KEY=S… RESELLER_FEE_BPS=300 \
     node examples/agent-pay.mjs
   ```

   Imprime el 402 con el desglose, firma, liquida con `X-PAYMENT` y devuelve el hash. Cero intervención humana.

## Evidencia on-chain (testnet)

**Pago de un agente vía x402, 100 XLM con revendedor al 3%:**

tx `9046dc9b3d107f1eb069c86b8d34252c667cd07f2ef13c7ac04ea1303caa3b0d`

| Operación | Monto | Destino | Rol |
|---|---|---|---|
| payment | `96.0000000` | `GAXLJHCMV6ZATLOI4SWBONOCS27KSBY55DGFNLWEM35NCU256OPBJMRS` | comercio |
| payment | `1.0000000` | `GBIVA57TB4N4IHXYQSDLWSVKC4M4P66AAJWS5A5SQAOIYEZSBUVNCIWD` | tesorería ViaPay (1%) |
| payment | `3.0000000` | `GCKAC7MNMVWK5HISZDCY7QJQ6ICSPQJ6PSX3NJCSLJBQLC5QXJNCYLNP` | revendedor (3%) |

<https://stellar.expert/explorer/testnet/tx/9046dc9b3d107f1eb069c86b8d34252c667cd07f2ef13c7ac04ea1303caa3b0d>

**Contrato Soroban `payment-router` (reparto de 3 patas):**

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

- **Soroban payment-router.** Desplegado y, con `PAYMENT_ROUTER_CONTRACT_ID`, el checkout `prepare`/`submit` lo invoca. SEP-7 QR y reconcile Horizon siguen en path clásico.
- **No hay facilitator x402.** ViaPay liquida por su cuenta.
- **Anchor SEP-24, escrow de Trustless Work y wallet embebida Pollar**: el código existe y se activa por env, pero sin credenciales no hacen nada. No están vivos.
- **Es testnet.** No hay fondos reales, ni KYC, ni límites, ni auditoría.
- **La reconciliación es un escaneo**, no un índice: 40 transacciones recientes del comercio. Suficiente para una demo, no para volumen.

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
