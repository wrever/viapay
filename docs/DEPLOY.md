# Deploy / Supabase / Vercel

## Supabase (ViaPay)

- Proyecto: `fcbdahduqesuotujqbez`
- URL: `https://fcbdahduqesuotujqbez.supabase.co`
- Schema aplicado: `accounts`, `api_keys`, `wallets`, `payment_intents`, `webhook_*` (ver `supabase/migrations/`).
- OAuth: ya conectado en el dashboard de Supabase.
- MCP Cursor: `user-supabase-viapay`.

**Importante:** la API en local sigue usando **SQLite** por defecto. Las tablas en Postgres están listas para cuando cableemos la API a Supabase (service role). OAuth del dashboard sí usa las keys `NEXT_PUBLIC_SUPABASE_*`.

Redirect OAuth en Supabase Auth → URL configuration (obligatorio):

- Site URL: `https://viapay-dashboard.vercel.app`
- Redirect URLs: `https://viapay-dashboard.vercel.app/auth/callback`
- Si Site URL queda en `http://localhost:3000`, Google/GitHub te tiran al localhost con `?code=`

## Vercel — env públicas (web / dashboard / checkout)

```
NEXT_PUBLIC_VIAPAY_WEB_URL=https://viapay.vercel.app
NEXT_PUBLIC_VIAPAY_DASHBOARD_URL=<url del dashboard desplegado>
NEXT_PUBLIC_VIAPAY_CHECKOUT_URL=<url del checkout desplegado>
NEXT_PUBLIC_VIAPAY_API_URL=<url de la API desplegada>
NEXT_PUBLIC_SUPABASE_URL=https://fcbdahduqesuotujqbez.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=<sb_publishable_… o anon jwt>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon jwt>
```

## Vercel — env servidor (solo API)

```
SUPABASE_URL=https://fcbdahduqesuotujqbez.supabase.co
SUPABASE_PUBLISHABLE_KEY=<igual que publishable>
SUPABASE_SERVICE_ROLE_KEY=<service_role — nunca al browser>
VIAPAY_API_PUBLIC_URL=<misma que NEXT_PUBLIC_VIAPAY_API_URL>
VIAPAY_CHECKOUT_URL=<checkout público>
FEE_BPS=100
STELLAR_MODE=onchain
STELLAR_NETWORK=testnet
VIAPAY_TREASURY_ADDRESS=GBIVA57TB4N4IHXYQSDLWSVKC4M4P66AAJWS5A5SQAOIYEZSBUVNCIWD
USDC_ISSUER=GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5
```

Local helper (gitignored): `.env.supabase.local` — cópialo a tus `.env` de apps, no lo subas.

## Apps en Vercel (separadas)

| App | Root Directory | URL típica |
|---|---|---|
| Landing + docs | `apps/web` | `https://viapay.vercel.app` |
| Panel (login / cobros) | `apps/dashboard` | `https://viapay-dashboard.vercel.app` → `NEXT_PUBLIC_VIAPAY_DASHBOARD_URL` en **web** y dashboard |
| Checkout | `apps/checkout` | `NEXT_PUBLIC_VIAPAY_CHECKOUT_URL` |
| API | `apps/api` | `NEXT_PUBLIC_VIAPAY_API_URL` |

`viapay.vercel.app/login` **no** es el panel: es la landing. Sin `NEXT_PUBLIC_VIAPAY_DASHBOARD_URL` apuntando a otro host, `/login` en web muestra un aviso (no un 404 de cobro).

Build tip monorepo: Root Directory = `apps/<app>`, Install = `cd ../.. && pnpm install`, Build = `pnpm --filter @viapay/<app> build`.

## Landing actual

https://viapay.vercel.app/ — redeploy desde `main` para landing + `/docs` + puente `/login`.
