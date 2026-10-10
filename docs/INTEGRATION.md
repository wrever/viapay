# Integración ViaPay

Guía para conectar ViaPay **hoy** (sin embed, sin plugins — eso está en [`FUTURO.md`](./FUTURO.md)). Invoices WA/email: vivos en panel; bot WA inbound depende de Meta Live.

Base URL prod: `https://viapay-api.vercel.app` · local: `http://localhost:3001`.  
Auth del comercio: `Authorization: Bearer sk_test_…`.

**Auditar el riel (público, sin key):** [`VERIFY.md`](./VERIFY.md).

```bash
curl -sS 'https://viapay-api.vercel.app/v1/verify?network=mainnet&tx_hash=b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e' \
  | jq '{verified, contract_id, net, fee, event}'
```

---

## 1. Link de cobro (no-dev)

1. Dashboard → crear cobro (monto, asset, descripción opcional).
2. Copiar `checkout_url` (unificado: humano o agente).
3. El cliente abre el checkout hosted, ve **solo el total**, paga con wallet o QR.
4. Opcional: `success_url` / `cancel_url` para volver a tu sitio.

Detalle de pantallas: [`01-NON-TECH-PAYMENT-LINKS.md`](./01-NON-TECH-PAYMENT-LINKS.md).

---

## 2. Crear cobro por API (redirect ecommerce) — MVP

**Mínimo viable para una plataforma:** crear intent con `success_url` / `cancel_url` → redirigir a `checkout_url` → recibir al pagador de vuelta.

App de prueba en el monorepo: [`apps/shop`](../apps/shop) (`pnpm --filter @viapay/shop dev`, puerto **3005**).

```bash
curl -s -X POST http://localhost:3001/v1/payment_intents \
  -H "Authorization: Bearer sk_test_…" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": "20.0000000",
    "asset": "USDC",
    "description": "Curso Hubby",
    "external_user_id": "user_42",
    "success_url": "https://tu-tienda.example/gracias",
    "cancel_url": "https://tu-tienda.example/carrito"
  }'
```

Respuesta útil: `id`, `client_secret`, `checkout_url` (gateway `/v1/x402/…`), `pay_url` (UI `/pay` directa), `fee_amount`, `net_amount`, `reseller_amount`, `external_user_id`, `metadata`.

`external_user_id` (aliases: `externalUserId`, `customer_id`, `customerId`, `customer_ref`) es **tu** id de cliente — no es un usuario ViaPay. Opcional `metadata` (objeto JSON, ~4KB).

Redirige al cliente a `checkout_url`. En el navegador ViaPay hace 302 a `pay_url` (hosted). Un agente que haga GET al mismo URL con `Accept: application/json` recibe 402. Tras pagar, redirect a `success_url` con `payment_intent` y `tx_hash`.

### Con split de marketplace (ej. Hubby 7%)

```json
{
  "amount": "20.0000000",
  "asset": "USDC",
  "reseller_fee_bps": 700,
  "reseller_address": "G…"
}
```

- ViaPay cobra **1%** siempre (`FEE_BPS` en el servidor; el body **no** puede bajarlo).
- El revendedor cobra `reseller_fee_bps` (700 = 7%).
- El comercio recibe el resto.
- ViaPay + revendedor deben sumar **menos** de 100%.

Curso $20 → ~$0.20 ViaPay, ~$1.40 Hubby, ~$18.40 creador, en **una** tx Stellar.

---

## 3. SDK JavaScript

Paquete monorepo: [`packages/sdk`](../packages/sdk) (`@viapay/sdk`). Auth: **secret key** `sk_…` en servidor. No hay publishable key todavía.

```js
import { ViaPay } from "@viapay/sdk";

const via = new ViaPay({
  apiKey: process.env.VIAPAY_API_KEY,
  baseUrl: "https://viapay-api.vercel.app", // o http://localhost:3001
});

const link = await via.createPaymentLink({
  amount: "20",
  asset: "USDC",
  externalUserId: "user_42",
  successUrl: "https://tu-tienda.example/gracias",
  resellerFeeBps: 700,
  resellerAddress: "G…",
});

// Redirige al humano:
// window.location = link.url;
```

También: `createCheckout` (snake_case HTTP), `getPaymentLink(id)`.

Webhooks:

```js
const ok = await ViaPay.verifyWebhook(rawBody, req.headers.get("viapay-signature"), secret);
```

x402 (agentes):

```js
const challenge = ViaPay.parseX402Challenge(await res.json()); // si status === 402
const header = ViaPay.encodePaymentHeader({ signed_xdr });
```

---

## 4. Checkout (humano)

| Paso | Endpoint |
|---|---|
| Estado | `GET /v1/checkout/:id?client_secret=` |
| Armar XDR | `POST /v1/checkout/:id/prepare` `{ client_secret, source }` |
| Enviar firmado | `POST /v1/checkout/:id/submit` `{ client_secret, signed_xdr }` |
| Callback móvil | `POST /v1/checkout/:id/sep7` (form `xdr`) |

El QR es SEP-7 `tx` con split, **no** `web+stellar:pay`.

UI del pagador: **total** + preview/recibo del split + puertas billetera / QR / agente x402.

---

## 5. Agentes (x402)

Mismo `payment_intent`, otra puerta:

```bash
# Reto
curl -i "http://localhost:3001/v1/x402/pi_…?client_secret=…"
# → 402 + accepts[] + viapay.breakdown

# Liquidar
curl -X POST "http://localhost:3001/v1/x402/pi_…?client_secret=…" \
  -H "Content-Type: application/json" \
  -H "X-PAYMENT: <base64 JSON con signed_xdr>" \
  -d '{}'
```

Demo: `examples/agent-pay.mjs` (`AGENT_SECRET_KEY`, opcional `RESELLER_*`).

No hay facilitator: el agente firma el envelope completo.

---

## 6. Webhooks

1. `POST /v1/webhook_endpoints` `{ "url": "https://…" }` → guarda el `secret` (`whsec_…`) una sola vez.
2. Evento: `payment_intent.succeeded`.
3. Header: `ViaPay-Signature: t=<unix>,v1=<hmac-sha256 de "${t}.${rawBody}">`.
4. Ventana ±5 minutos. Hasta 5 reintentos.

---

## 7. Readiness (testnet)

`GET /v1/readiness` (auth comercio): Friendbot, trustlines, `fee_bps`, avisos de revendedores que no pueden recibir.

---

## OpenAPI

Contrato máquina: [`openapi.yaml`](./openapi.yaml).
