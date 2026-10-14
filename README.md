# ViaPay

**Settlement infrastructure** on Stellar: `payment_intent` + Soroban `payment-router` (`pay` / `Paid`). Humans and agents settle the same charge; anyone can re-check on-chain.

**Audit claims (copy-paste):** [`docs/VERIFY.md`](docs/VERIFY.md) · product memory: [`docs/MEMORY.md`](docs/MEMORY.md) · now vs later: [`docs/AHORA.md`](docs/AHORA.md) · [`docs/FUTURO.md`](docs/FUTURO.md)

```bash
pnpm verify -- --kit
curl -sS 'https://viapay-api.vercel.app/v1/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f' \
  | jq '{verified, event, merchant, treasury, net, fee}'
# /evidence · GET /v1/rails · GET /v1/health
```

Pagos **non-custodial**. Un cobro, pagado por una persona en el checkout hosted **o** por un agente IA vía HTTP **402 (x402)**.

El reparto va en una sola transacción, hasta tres patas:

| Pata | Cuánto | Quién lo decide |
|---|---|---|
| ViaPay | **1% fijo** (`FEE_BPS`, 100 bps) | el servidor. El cliente no lo puede bajar |
| Revendedor | opcional, `reseller_fee_bps` + `reseller_address` | el comercio, al crear el cobro |
| Comercio | el resto | se calcula |

$100 con un revendedor al 3% → $1 a tesorería, $3 al revendedor, $96 al comercio. Sin custodia en el medio.

## Producción (canónico)

| Pieza | URL |
|---|---|
| Sitio + panel + checkout pagador | https://viapay.vercel.app (`apps/dashboard`) |
| API | https://viapay-api.vercel.app |
| Health | https://viapay-api.vercel.app/v1/health |
| Evidencia jurado | https://viapay.vercel.app/evidence |

- Panel comercio: `/app` (OAuth Supabase Google/GitHub).
- Checkout humano: `/pay/[id]` (`pay_url`).
- Link compartido unificado: `checkout_url` = gateway `/v1/x402/:id` (navegador → 302 a `pay_url`; agente JSON → 402).
- Liquidación on-chain: contrato **payment-router** (testnet + mainnet). **Billetera** y **QR** liquidan por el mismo `pay()`: el QR es SEP-7 con el XDR de `prepare` (hace falta la G… pagadora).
- Red diaria: **testnet**. Mainnet opt-in por cobro (toggle en el panel).

Detalle de demo / pruebas: [`docs/HACKATHON.md`](docs/HACKATHON.md). Docs de integración: [`docs/README.md`](docs/README.md) · sitio `/docs` en la landing.

## Producto (fase actual)

1. Merchant entra al dashboard (`/login` → `/app`)
2. Guarda wallet de destino (obligatorio) + trustline USDC si cobra USDC
3. Crea un cobro → obtiene `checkout_url` / `pay_url`
4. Comparte el link (o QR del link en `/pay`)
5. Cliente paga en checkout hosted (Freighter / Wallets Kit) → evento `Paid`
6. Merchant ve estado, recibo verificable (`/recibo`, `/r/:id`), webhooks

Sin código obligatorio. API/SDK/x402 son capas extra. Perfil comercio: tab **Perfil** (`GET/PATCH /v1/me`).

**Fuera de scope hackathon (ops):** WhatsApp Meta Live inbound y Resend invoices (sin dominio propio). El código existe; la demo jurado no depende de ellos.

## Monorepo

```
apps/
  api/         # Payment Intents + checkout + x402 + WA/email hooks (:3001)
  dashboard/   # Landing + docs + login + panel + /pay (prod UI) (:3000)
  checkout/    # Checkout legado local (:3004) — no es URL de producto
  web/         # Landing legado local (:3003) — no es URL de producto
  shop/        # Ecommerce demo redirect (:3005, local)
packages/
  shared/      # Fee math, IDs, types, abonos/plan
  sdk/         # Cliente JS mínimo (createCheckout)
  stellar/     # XDR split, SEP-7, Horizon, router helpers
  prefs/       # Locale / theme prefs
docs/          # MEMORY, AHORA, VERIFY, submission/
examples/      # Snippets + agent-pay.mjs (demo x402)
contracts/     # Soroban payment-router (testnet + mainnet, mismo wasm)
supabase/      # Migraciones Postgres
```

## Quickstart (local)

```bash
pnpm install
pnpm db:seed
pnpm dev
```

| App | URL |
|-----|-----|
| Dashboard (UI canónica) | http://localhost:3000 |
| API health | http://localhost:3001/v1/health |
| Web legado | http://localhost:3003 |
| Checkout legado | http://localhost:3004 |

Login local: **Continuar** en `/login` si no hay proyecto Supabase. Con Supabase: OAuth Google/GitHub.

Envs mínimas: ver [`.env.example`](.env.example) y [`docs/DEPLOY.md`](docs/DEPLOY.md). Router testnet: `PAYMENT_ROUTER_CONTRACT_ID`. Mainnet: `PAYMENT_ROUTER_CONTRACT_ID_MAINNET`.

## Cómo se paga (path feliz)

1. `POST /v1/payment_intents` → `checkout_url` + `pay_url`
2. Humano abre `pay_url` → `GET /v1/checkout/:id` → tabs **Billetera | QR**
   - **Billetera:** `prepare` → firmar (`settlement: router`) → `submit` → `Paid`
   - **QR:** misma `prepare` con la G… pagadora → `sep7_tx` (XDR del contrato) → escanear / firmar en móvil → callback `/sep7`
3. Agente: mismo `checkout_url` con `Accept: application/json` → 402 → firma → settle

Extras opt-in al crear el cobro: abonos (`allow_abonos`), plan de cuotas, enlace firmado v2, exact-pay (fiat → crypto trabado), revendedor.

## Roadmap corto

- [x] Link de pago + checkout hosted (prod en `apps/dashboard`)
- [x] Fee ViaPay fijo 1% + comisión opcional de revendedor, misma tx
- [x] Wallet Kit / Freighter firma real (testnet + mainnet opt-in)
- [x] QR SEP-7 del contrato (`prepare` → `sep7_tx`) + path clásico sin router
- [x] Webhooks firmados (`ViaPay-Signature`)
- [x] Pagos de agentes IA con x402 (`GET/POST /v1/x402/:id`, `examples/agent-pay.mjs`)
- [x] Contrato Soroban 3 patas en **testnet + mainnet** (mismo wasm)
- [x] Checkout liquida por `payment-router` (`pay()` + `Paid`)
- [x] OAuth Supabase + perfil comercio (`/v1/me`)
- [x] Recibo verificable / parity / settle-proof / kit `pnpm verify`
- [x] Abonos + enlace firmado + plan cuotas (código)
- [ ] Facilitator x402 externo (hoy ViaPay liquida por su cuenta)
- [ ] Anchor SEP-24 productivo, escrow Trustless Work, wallet embebida Pollar (código listo; SEP-10/24 = demo SDF)
- [ ] WA Live + Resend en prod (bloqueados por Meta / dominio DNS)

## Licencia

Privado — © ViaPay / wrever
