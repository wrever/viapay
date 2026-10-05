# ViaPay

Pagos **non-custodial** en Stellar. Un cobro, pagado por una persona en el checkout hosted **o** por un agente IA vía HTTP **402 (x402)**.

El reparto va en una sola transacción, hasta tres patas:

| Pata | Cuánto | Quién lo decide |
|---|---|---|
| ViaPay | **1% fijo** (`FEE_BPS`, 100 bps) | el servidor. El cliente no lo puede bajar |
| Revendedor | opcional, `reseller_fee_bps` + `reseller_address` | el comercio, al crear el cobro |
| Comercio | el resto | se calcula |

$100 con un revendedor al 3% → $1 a tesorería, $3 al revendedor, $96 al comercio. Sin custodia en el medio.

Para el detalle de la demo y las pruebas on-chain: [`docs/HACKATHON.md`](docs/HACKATHON.md).  
Docs de producto e integración: [`docs/README.md`](docs/README.md) · sitio `/docs` en la landing.  
Prioridad: [`docs/AHORA.md`](docs/AHORA.md) · Diferido: [`docs/FUTURO.md`](docs/FUTURO.md).

## Producto (fase actual): non-tech

1. Merchant entra al dashboard  
2. Crea un cobro → obtiene `checkout_url`  
3. Comparte el link  
4. Cliente paga en el checkout hosted de ViaPay  
5. Merchant ve el estado en el dashboard  

Sin código obligatorio. API/SDK llegan después como capas extra.

## Monorepo

```
apps/
  api/         # Payment Intents + checkout API (:3001)
  dashboard/   # Crear / copiar links (shadcn) (:3000)
  checkout/    # Checkout hosted (:3004)
  web/         # Landing (:3003)
packages/
  shared/      # Fee math, IDs, types
  sdk/         # Cliente JS mínimo (createCheckout)
  stellar/     # XDR split, SEP-7, Horizon
docs/          # Producto e integración
examples/      # Snippets + agent-pay.mjs (demo x402)
contracts/     # Soroban payment-router (desplegado en testnet; el checkout no lo invoca)
```

## Quickstart

```bash
pnpm install
pnpm db:seed
pnpm dev
```

| App | URL |
|-----|-----|
| Dashboard | http://localhost:3000 |
| API health | http://localhost:3001/v1/health |
| Web | http://localhost:3003 |
| Checkout | http://localhost:3004 |

Login demo: **Continuar** en `/login` (modo local).

## Roadmap corto

- [x] Link de pago + checkout hosted  
- [x] Fee ViaPay fijo 1% + comisión opcional de revendedor, en la misma tx  
- [x] Wallet Kit / Freighter firma real (testnet)  
- [x] QR SEP-7 tx con split + trustline USDC  
- [x] Webhooks firmados (`ViaPay-Signature`)  
- [x] Pagos de agentes IA con x402 (`GET/POST /v1/x402/:id`, demo en `examples/`)  
- [x] Contrato Soroban de 3 patas desplegado en testnet  
- [x] OAuth Supabase cuando hay proyecto (si no, login local)  
- [ ] Checkout liquidando por el contrato Soroban en vez de pagos clásicos  
- [ ] Facilitator x402 (hoy ViaPay liquida por su cuenta)  
- [ ] Anchor SEP-24, escrow Trustless Work, wallet embebida Pollar (código listo, sin credenciales)  

## Licencia

Privado — © ViaPay / wrever

