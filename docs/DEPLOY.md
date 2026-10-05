# Deploy / Supabase / Vercel

## Supabase (ViaPay)

- Proyecto: `fcbdahduqesuotujqbez`
- URL: `https://fcbdahduqesuotujqbez.supabase.co`
- Schema aplicado: `accounts`, `api_keys`, `wallets`, `payment_intents`, `webhook_*` (ver `supabase/migrations/`).
- OAuth: ya conectado en el dashboard de Supabase.
- MCP Cursor: `user-supabase-viapay`.

### API → mismo Postgres

Si la API tiene:

```
SUPABASE_URL=https://fcbdahduqesuotujqbez.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role>
```

entonces Bearer keys de OAuth autentican y `payment_intents` / wallets / webhooks viven en **el mismo** Postgres. Sin service role, la API cae a SQLite (`VIAPAY_DATABASE_PATH`).

Local end-to-end con Supabase:

1. Copiá keys desde `.env.supabase.local` (gitignored) a `apps/api/.env.local` y al root / dashboard.
2. `pnpm --filter @viapay/api dev` (puerto 3001).
3. Dashboard con `NEXT_PUBLIC_VIAPAY_API_URL=http://localhost:3001`.
4. Login OAuth → cookie con API key → crear billetera en Integración → crear cobro.

Redirect OAuth en Supabase Auth → URL configuration (obligatorio):

- Site URL: `https://viapay.vercel.app`
- Redirect URLs: `https://viapay.vercel.app/auth/callback`
- Si Site URL queda en `http://localhost:3000`, Google/GitHub te tiran al localhost con `?code=`

Todo el producto (landing, docs, login, panel) vive en **https://viapay.vercel.app** (`apps/dashboard`).

## Vercel — env públicas (sitio / dashboard)

```
NEXT_PUBLIC_VIAPAY_WEB_URL=https://viapay.vercel.app
NEXT_PUBLIC_VIAPAY_DASHBOARD_URL=https://viapay.vercel.app
NEXT_PUBLIC_VIAPAY_CHECKOUT_URL=https://viapay-checkout-nine.vercel.app
NEXT_PUBLIC_VIAPAY_API_URL=https://viapay-api.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://fcbdahduqesuotujqbez.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_… o anon jwt>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon jwt>
SUPABASE_SERVICE_ROLE_KEY=<solo server, panel OAuth link-account>
```

Sin `NEXT_PUBLIC_VIAPAY_API_URL` apuntando a una API real, el panel `/app` no llama a la API (evita Application error en Vercel).

## Vercel — env servidor (API, proyecto aparte Root = `apps/api`)

```
SUPABASE_URL=https://fcbdahduqesuotujqbez.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role — nunca al browser>
SUPABASE_PUBLISHABLE_KEY=<igual que publishable, para /v1/auth/link>
VIAPAY_API_PUBLIC_URL=https://viapay-api.vercel.app
VIAPAY_CHECKOUT_URL=https://viapay-checkout-nine.vercel.app
FEE_BPS=100
STELLAR_MODE=onchain
STELLAR_NETWORK=testnet
VIAPAY_TREASURY_ADDRESS=GBIVA57TB4N4IHXYQSDLWSVKC4M4P66AAJWS5A5SQAOIYEZSBUVNCIWD
USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

Local helper (gitignored): `.env.supabase.local` — cópialo a tus `.env` de apps, no lo subas.

## Apps en Vercel

| App | Root Directory | URL |
|---|---|---|
| Sitio (landing `/`, docs `/docs`, login `/login`, panel `/app`) | `apps/dashboard` | `https://viapay.vercel.app` |
| Checkout | `apps/checkout` | `https://viapay-checkout-nine.vercel.app` (alias team: `…-bruno-mirandas-projects-b5bdc738.vercel.app`) |
| API | `apps/api` | `https://viapay-api.vercel.app` (alias: `…-bruno-mirandas-projects-b5bdc738.vercel.app`) |

Build tip monorepo: Root Directory = `apps/dashboard`, Install = `cd ../.. && corepack pnpm install`, Build = `cd ../.. && corepack pnpm --filter @viapay/dashboard build`.

**API prod:** Ready · `GET /v1/health` → 200. `NEXT_PUBLIC_VIAPAY_API_URL` / `VIAPAY_API_PUBLIC_URL` = `https://viapay-api.vercel.app`.
