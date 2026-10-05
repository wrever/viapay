# @viapay/shop — tienda de prueba (redirect)

MVP de integración: tu plataforma crea un cobro, redirige al checkout ViaPay y recibe al comprador de vuelta en `success_url` / `cancel_url`.

## Flujo

1. El comprador elige un producto.
2. `POST /api/checkout` llama `ViaPay.createCheckout` con `success_url` y `cancel_url`.
3. El navegador va a `checkout_url` (app checkout `:3004`).
4. Tras pagar → `/success?payment_intent=…&tx_hash=…`. Si cancela → `/cancel`.

## Setup local

```bash
pnpm db:seed
# copiá api_key de data/seed.local.json
cp apps/shop/.env.example apps/shop/.env.local
# editá VIAPAY_API_KEY

pnpm --filter @viapay/api dev        # :3001
pnpm --filter @viapay/checkout dev   # :3004
pnpm --filter @viapay/shop dev       # :3005
```

O `pnpm dev` (incluye shop) + asegurate de tener la API key en `.env.local`.
