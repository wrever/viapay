# Deploy / Supabase / Vercel

## Supabase (ViaPay)

- Proyecto: `fcbdahduqesuotujqbez`
- URL: `https://fcbdahduqesuotujqbez.supabase.co`
- Schema aplicado: `accounts`, `api_keys`, `wallets`, `payment_intents`, `contacts`, `wa_*` (links, codes, sessions, inbound_dedup), `webhook_*` (ver `supabase/migrations/`).
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

Todo el producto (landing, docs, login, panel, **checkout pagador**, **legal**) vive en **https://viapay.vercel.app** (`apps/dashboard`). Checkout: `/pay/[id]?cs=…`. Legal: `/privacy`, `/terms`, `/data-deletion` (Meta App Review / WhatsApp).

## Vercel — env públicas (sitio / dashboard = proyecto `web`)

```
NEXT_PUBLIC_VIAPAY_WEB_URL=https://viapay.vercel.app
NEXT_PUBLIC_VIAPAY_DASHBOARD_URL=https://viapay.vercel.app
NEXT_PUBLIC_VIAPAY_CHECKOUT_URL=https://viapay.vercel.app
NEXT_PUBLIC_VIAPAY_API_URL=https://viapay-api.vercel.app
NEXT_PUBLIC_SUPABASE_URL=https://fcbdahduqesuotujqbez.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_… o anon jwt>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon jwt>
SUPABASE_SERVICE_ROLE_KEY=<solo server, panel OAuth link-account>
```

Sin `NEXT_PUBLIC_VIAPAY_API_URL` apuntando a una API real, el panel `/app` no llama a la API (evita Application error en Vercel).

## Vercel — env servidor (API, proyecto `viapay-api`, Root = `apps/api`)

```
SUPABASE_URL=https://fcbdahduqesuotujqbez.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service_role — nunca al browser>
SUPABASE_PUBLISHABLE_KEY=<igual que publishable, para /v1/auth/link>
VIAPAY_API_PUBLIC_URL=https://viapay-api.vercel.app
VIAPAY_CHECKOUT_URL=https://viapay.vercel.app
NEXT_PUBLIC_VIAPAY_CHECKOUT_URL=https://viapay.vercel.app
FEE_BPS=100
STELLAR_MODE=onchain
STELLAR_NETWORK=testnet
VIAPAY_TREASURY_ADDRESS=GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5
USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
# WhatsApp Meta Cloud API (ver MEMORY / .env.example)
# META_WA_ACCESS_TOKEN=…
# META_WA_PHONE_NUMBER_ID=1384802108045403
# META_WA_VERIFY_TOKEN=viapay_wa_verify_2026
# META_APP_SECRET=…
# META_WA_APP_LIVE=0
# Email invoices
# RESEND_API_KEY=re_…
# RESEND_FROM_EMAIL=ViaPay <cobros@tudominio.com>
```

Local helper (gitignored): `.env.supabase.local` — cópialo a tus `.env` de apps, no lo subas.

## Apps en Vercel

| App | Root Directory | URL |
|---|---|---|
| Sitio (landing, docs, login, panel, checkout `/pay`, legal `/privacy` `/terms` `/data-deletion`) | `apps/dashboard` (proyecto Vercel `web`) | `https://viapay.vercel.app` |
| API | `apps/api` | `https://viapay-api.vercel.app` |

`apps/checkout` sigue en el monorepo para local/legado; **prod ya no usa** `viapay-checkout-*.vercel.app` como URL de producto. No crear más proyectos Vercel de UI.

Build tip monorepo: Root Directory = `apps/dashboard`, Install = `cd ../.. && corepack pnpm install`, Build = `cd ../.. && corepack pnpm --filter @viapay/dashboard build`.

**API prod:** Ready · `GET /v1/health` → 200. `NEXT_PUBLIC_VIAPAY_API_URL` / `VIAPAY_API_PUBLIC_URL` = `https://viapay-api.vercel.app`.
