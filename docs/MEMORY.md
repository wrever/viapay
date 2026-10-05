# ViaPay — memoria de proyecto

Actualizado: 2026-10-04. Lee esto antes de explorar el repo. Si cambias una capacidad, actualiza este archivo en el mismo cambio.

**Prioridad de producto:** lo demostrable ahora está en [`docs/AHORA.md`](./AHORA.md). Lo diferido (email, embed ecommerce, plugins, infra pesada) está en [`docs/FUTURO.md`](./FUTURO.md). No mezclar.

Índice de docs: [`docs/README.md`](./README.md). Integración API/SDK/x402: [`docs/INTEGRATION.md`](./INTEGRATION.md). Deploy/Supabase: [`docs/DEPLOY.md`](./DEPLOY.md). Sitio prod: https://viapay.vercel.app/ (`apps/web`). Panel prod: https://viapay-dashboard.vercel.app/ (`apps/dashboard`). `NEXT_PUBLIC_VIAPAY_DASHBOARD_URL` en Vercel web apunta al panel; `/login` en la landing redirige ahí. Docs local: `http://localhost:3003/docs`.

**Docs web (`/docs`):** layout 3 columnas (nav + contenido + TOC) con búsqueda. Capítulos ricos en ES/EN/PT (`apps/web/src/lib/i18n/docs-chapters.ts`): overview, fees, quickstart, link, redirect, split, agent/x402, checkout, webhooks, API, SDK, testnet. Sin “saltar al contenido”. Footer landing profesional (sin hackathon / contrato / GitHub).

## Supabase (ViaPay)

- Proyecto `fcbdahduqesuotujqbez` · MCP `user-supabase-viapay`.
- Tablas en Postgres (RLS on, 0 rows): `accounts`, `api_keys`, `wallets`, `payment_intents`, `webhook_endpoints`, `webhook_events`, `webhook_deliveries`. SQL en `supabase/migrations/`.
- OAuth listo en el proyecto. La **API local sigue en SQLite** hasta cablear service role → Postgres.
- Keys: solo en Vercel / `.env.supabase.local` (gitignored). Nunca en git.

Typecheck del 2026-10-04, sin errores: `@viapay/shared`, `@viapay/stellar`, `@viapay/sdk`, `@viapay/api`, `@viapay/checkout`, `@viapay/dashboard`, `@viapay/web`. `next build` pasa en web, dashboard y checkout. El contrato Soroban compila (`stellar contract build`, CLI 23.2.1) y está desplegado en testnet. Node local v24; pnpm es `corepack pnpm` 10.33.3.

Con Node 24, `better-sqlite3` no trae binario precompilado. Si `pnpm db:seed` revienta con `Could not locate the bindings file`, compílalo:

```bash
cd node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 && npx node-gyp rebuild --release
```

## Qué es

Pagos non-custodial en Stellar. El cliente paga en un checkout hosted. El comercio no custodia la clave del pagador. Un agente IA puede pagar lo mismo por HTTP 402 (x402).

**El reparto es de hasta tres patas, en una sola transacción:**

| Pata | Cuánto | Dónde se decide |
|---|---|---|
| ViaPay | fijo 1% (`DEFAULT_FEE_BPS = 100`) | servidor: `FEE_BPS` del entorno. El cliente **no** lo puede tocar |
| Revendedor | opcional, `reseller_fee_bps` + `reseller_address` | body del `POST /v1/payment_intents` |
| Comercio | el resto | se calcula, nunca se envía |

Caso Hubby (marketplace que revende cursos): curso de $20 → `0.20` a tesorería, `1.40` a Hubby con `reseller_fee_bps: 700`, `18.40` al creador. Verificado on-chain en testnet.

La matemática vive en `calcFeeSplit` (`packages/shared`): bigint, ViaPay y revendedor redondean hacia abajo y el comercio absorbe el resto, así que las tres patas siempre suman el total. `assertFeeBps` rechaza que ViaPay + revendedor lleguen al 100%.

Monorepo pnpm. Puertos: dashboard `:3000`, API `:3001`, web `:3003`, checkout `:3004`, shop (tienda de prueba redirect) `:3005`.

**MVP integración (redirect):** una plataforma crea `POST /v1/payment_intents` con `success_url` + `cancel_url`, redirige a `checkout_url`, y recibe `payment_intent` / `tx_hash` al volver. Referencia: `apps/shop` (`VIAPAY_API_KEY` desde `data/seed.local.json`). `pnpm dev` ya incluye shop; o `pnpm dev:shop`.

## Qué está vivo

El camino de cobro por defecto es **clásico, no Soroban**.

1. El dashboard crea un payment intent (`POST /v1/payment_intents`), con o sin revendedor.
2. El checkout pide un XDR con dos o tres operaciones de pago: neto al merchant, fee a tesorería y, si hay, comisión al revendedor (`POST /v1/checkout/:id/prepare`). Si el asset es USDC y al pagador le falta trustline, esa misma tx incluye `changeTrust`. `payoutLegs` en `packages/stellar` arma las patas y descarta las de monto cero.
3. Firma con Stellar Wallets Kit (Freighter, Lobstr, xBull, …) o, si hay `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`, con wallet embebida Pollar.
4. La API verifica destinos, montos y memo, y envía a Horizon (`POST /v1/checkout/:id/submit`).
5. El QR no es `web+stellar:pay` (eso manda el 100% al comercio). Es `web+stellar:tx` con `replace=sourceAccount` y callback `POST /v1/checkout/:id/sep7`.
6. Si la wallet no llama al callback, al abrir el checkout o el dashboard se buscan las últimas 40 txs del comercio en Horizon. Si el memo es el id del cobro y **todas** las patas coinciden, pasa a `succeeded`.
7. Al marcar pagado se dispara `payment_intent.succeeded` a los webhooks del comercio.

La verificación (`assertSplitXdr`, `findConfirmedSplits`) consume una operación por pata, así que un revendedor que además sea el comercio sigue cobrando las dos veces. Toda la validación es server-side: el XDR firmado que no tenga exactamente las patas esperadas se rechaza antes de Horizon.

### x402 (pagos de agentes) — vivo

`GET /v1/x402/:id?client_secret=…` devuelve **402** con un cuerpo con forma de `PaymentRequirements` x402 v2 (`accepts[0]`) más un bloque `viapay` con el desglose completo (rol, dirección, monto, monto atómico, bps) y las URLs para liquidar. `POST` al mismo recurso con el envelope firmado en el header `X-PAYMENT` (base64 JSON, `payload.signed_xdr`) o en `signed_xdr` del body lo manda por `submitCheckoutXdr` y responde 200 con `X-PAYMENT-RESPONSE`. Con `{"reconcile": true}` busca un pago ya hecho en Horizon.

No hay facilitator x402: el pagador firma la transacción completa, no auth entries de contrato. Demo: `examples/agent-pay.mjs` (`ASSET`, `AMOUNT`, `RESELLER_ADDRESS`, `RESELLER_FEE_BPS`). Sin `AGENT_SECRET_KEY` imprime el 402 y para.

Corrido de punta a punta en testnet (100 XLM, revendedor al 3%): tx `9046dc9b3d107f1eb069c86b8d34252c667cd07f2ef13c7ac04ea1303caa3b0d`, tres operaciones de pago en una sola transacción — `96` al comercio, `1` a tesorería, `3` al revendedor.

USDC testnet (Circle): `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.  
USDC mainnet: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`.

Tesorería por defecto: `GBIVA57TB4N4IHXYQSDLWSVKC4M4P66AAJWS5A5SQAOIYEZSBUVNCIWD` (`VIAPAY_TREASURY_ADDRESS`).

## Rutas API

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/v1/health` | health |
| POST/GET | `/v1/payment_intents` | crear y listar. Acepta `reseller_fee_bps` + `reseller_address`. El GET reconcilia pendientes en Horizon |
| GET | `/v1/checkout/:id?client_secret=` | estado público + `sep7_tx` + si comercio, tesorería y revendedor pueden recibir |
| POST | `/v1/checkout/:id/prepare` | XDR sin firmar |
| POST | `/v1/checkout/:id/submit` | XDR firmado → Horizon → succeeded |
| POST | `/v1/checkout/:id/sep7` | callback de wallet móvil (`application/x-www-form-urlencoded`, campo `xdr`) |
| POST | `/v1/checkout/:id/confirm` | solo si `STELLAR_MODE=simulated`. En onchain responde 400 |
| GET/POST | `/v1/x402/:id?client_secret=` | 402 con el desglose; POST con `X-PAYMENT` liquida. Ver arriba |
| GET | `/v1/readiness` | Friendbot, trustline SEP-7 del comercio, faucet USDC, `fee_bps`, y `resellers[]` (los de cobros pendientes más el de `?reseller=G…`) |
| POST/GET | `/v1/webhook_endpoints` | alta y lista. El secreto se devuelve una sola vez |
| DELETE | `/v1/webhook_endpoints/:id` | baja lógica |
| GET | `/v1/webhook_deliveries` | reintenta las vencidas y lista |
| GET/POST | `/v1/integrations` | estado de Soroban, Supabase, anchor, escrow, Pollar. POST descubre un `stellar.toml` |
| POST | `/v1/escrow` | despliega escrow single-release en Trustless Work. Falla si no hay API key |
| POST | `/v1/auth/link` | cambia un access token de Supabase por una API key de ViaPay |

Auth del comercio: `Authorization: Bearer sk_test_…`. CORS abierto en `/v1/*`.

## Webhooks

Header `ViaPay-Signature: t=<unix>,v1=<hex hmac-sha256>`.  
Mensaje firmado: `` `${t}.${rawBody}` ``. Ventana de 5 minutos.  
El SDK verifica con `ViaPay.verifyWebhook(rawBody, header, secret)`.  
Hasta 5 intentos. Localhost http está permitido. El resto exige https.

## Login

- Solo OAuth (Google / GitHub). Sin “Continuar en local” en producto.
- Flujo: `/auth/oauth` → Supabase → `/auth/callback` → upsert `accounts` + `api_keys` en Postgres (service role) → cookies de sesión.
- Site URL de Supabase Auth debe ser `https://viapay-dashboard.vercel.app` (nunca localhost en prod).
- `VIAPAY_ALLOW_LOCAL_LOGIN=1` solo para emergencia en máquina local; en Vercel está apagado.

## Soroban: desplegado, no conectado

`contracts/payment-router` expone `pay(token, payer, merchant, treasury, reseller: Option<Address>, net, fee, reseller_fee, intent_id)` sobre un token SEP-41 y mueve las tres patas con `payer.require_auth()`. Errores: `InvalidAmount = 1`, `MissingReseller = 2` (pasar `reseller_fee > 0` sin dirección).

| | |
|---|---|
| contract id (testnet) | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` |
| tx del deploy | `7f0d1f0a4e9090e86f17eecb438544e8e178d632fc0ac5c91fdfc712b4c7f159` |
| hash del wasm | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |

**El checkout no lo invoca.** `prepare` sigue armando pagos clásicos. Está desplegado como prueba de que el mismo reparto corre on-chain, nada más. No digas que el checkout es Soroban. La env `PAYMENT_ROUTER_CONTRACT_ID` hoy solo alimenta el estado de `/v1/integrations` y el pie de la landing.

## Lo que no está desplegado

- **Anchor SEP-24**: solo descubrimiento de `stellar.toml` si `ANCHOR_HOME_DOMAIN` está definido. No hay flujo interactivo de depósito/retiro.
- **Escrow Trustless Work**: el POST existe. Sin `TRUSTLESSWORK_API_KEY` no llama a su API. Testnet: `https://beta.api.trustlesswork.com` (`/escrow/single-release/v2/deploy`). Mainnet legacy: `https://api.trustlesswork.com`.
- **Pollar**: el checkout monta `PollarProvider` solo si hay `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`. Sin key, el botón no aparece. Hace falta una key de `dashboard.pollar.xyz`.
- **x402 con facilitator**: el endpoint propio está vivo (ver arriba), pero ViaPay liquida por su cuenta. No hay integración con un facilitator x402 ni con el esquema de auth entries de Soroban.

## Límites reales

- Horizon no indexa memos. La reconciliación mira 40 txs recientes del comercio.
- El QR del teléfono no llega a `localhost`. Usa `VIAPAY_API_PUBLIC_URL`.
- El `replace` de SEP-7 depende de que la wallet refresque la secuencia. Si no, `tx_bad_seq`. El camino de navegador (prepare con la cuenta real) es el sólido.
- Comercio, tesorería y revendedor tienen que existir en la red. USDC exige trustline en los tres: si al revendedor le falta, **el cobro entero falla**, no solo su pata. El dashboard avisa (`ReceiveNotice` y, al teclear la wallet, el propio formulario) y copia un SEP-7 de trustline.
- `STELLAR_MODE=simulated` sigue en el endpoint viejo `/confirm`. La UI no lo usa. `.env.example` está en `onchain`.

## SQLite

Archivo `data/viapay.db` (`VIAPAY_DATABASE_PATH`). Tablas en `apps/api/src/lib/db.ts`: `accounts`, `api_keys`, `wallets`, `payment_intents`, `webhook_endpoints` (secreto en claro, `whsec_…`), `webhook_events`, `webhook_deliveries`. El seed local no se commitea: `data/seed.local.json`.

`payment_intents` lleva `reseller_fee_bps`, `reseller_amount` y `reseller_address`. Las bases viejas se migran solas con `addColumns` al arrancar (sqlite no tiene `add column if not exists`).

## Variables

Plantilla: `.env.example`. Obligatorias en local: `STELLAR_MODE=onchain`, `STELLAR_NETWORK=testnet`, `USDC_ISSUER`, `VIAPAY_TREASURY_ADDRESS`, `VIAPAY_API_PUBLIC_URL`. `FEE_BPS` es opcional: si falta o trae basura, `resolveViaFeeBps` cae a 100 (1%). Opcionales que activan integraciones y no deben fingirse: `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_*`, `PAYMENT_ROUTER_CONTRACT_ID`, `ANCHOR_HOME_DOMAIN`, `TRUSTLESSWORK_API_KEY`, `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`.

## Dónde está el código

- Matemática del split 3 vías (`calcFeeSplit`, `assertFeeBps`, `formatBps`): `packages/shared/src/index.ts`
- Patas, SEP-7, Horizon, issuers USDC (`payoutLegs`, `assertSplitXdr`, `findConfirmedSplits`): `packages/stellar/src/index.ts`
- Orquestación del checkout: `apps/api/src/lib/chain.ts`
- Challenge y header x402: `apps/api/src/lib/x402.ts` + ruta `apps/api/src/app/v1/x402/[id]/route.ts`
- Fee y persistencia: `apps/api/src/lib/payments.ts`, SQLite `apps/api/src/lib/db.ts`
- Webhooks: `apps/api/src/lib/webhooks.ts` (firma) + rutas `webhook_endpoints` / `webhook_deliveries`
- Integraciones (estado, toml, escrow): `apps/api/src/lib/integrations.ts`
- Auth OAuth → API key: `apps/api/src/app/v1/auth/link/route.ts`
- Checkout UI: `apps/checkout/src/components/PayPanel.tsx`
- Wallets Kit: `apps/checkout/src/lib/wallet.ts` (`@creit.tech/stellar-wallets-kit`)
- Pollar: `apps/checkout/src/components/PollarShell.tsx` (`@pollar/react`)
- Dashboard login OAuth: `apps/dashboard/src/lib/supabase.ts`, `auth/oauth`, `auth/callback` (`@supabase/ssr`)
- Webhooks en dashboard: `apps/dashboard/src/components/WebhookPanel.tsx`
- Aviso de trustline (comercio, tesorería, revendedores): `apps/dashboard/src/components/ReceiveNotice.tsx`
- Alta de cobro con revendedor y preview del desglose: `apps/dashboard/src/components/CreatePaymentLink.tsx`
- SDK: `packages/sdk/src/index.ts` — `createCheckout` (acepta `reseller_fee_bps` + `reseller_address`), `parseX402Challenge`, `encodePaymentHeader`, `verifyWebhook` con `crypto.subtle`
- Demo de agente x402: `examples/agent-pay.mjs`
- Contrato: `contracts/payment-router/src/lib.rs` — desplegado en testnet, no invocado por el checkout
- Marca: `packages/brand/` (`tokens.css`, `logos/`, `scripts/sync-public.mjs`) + un `Logo.tsx` por app en `apps/*/src/components/`
- Regla de agente: `.cursor/rules/viapay-memory.mdc` (always apply)

## Marca

Kit Claude (azul + naranja). Fuente de verdad: `packages/brand` (`@viapay/brand`).

| | Claro | Oscuro |
|---|---|---|
| Fondo | `#FFFFFF` | `#0A0E1A` |
| Superficie | `#F5F7FD` | `#121829` |
| Borde | `#D5DBEE` | `#263050` |
| Texto | `#0B1020` | `#F3F6FF` |
| Texto 2 | `#4B5468` | `#AAB4CC` |
| Primario | `#2B59FF` | `#5B82FF` |
| Acento (fee ViaPay) | `#FF5A1F` | `#FF7A45` |

Tipografía: Bricolage Grotesque 800 (display), Figtree 400/500/700 (UI), IBM Plex Mono 500 (montos/hashes). Botones: claro texto blanco sobre primario; oscuro texto `#0A0E1A` sobre primario/acento.

Tokens: `packages/brand/tokens.css` (import `@viapay/brand/tokens.css` en cada layout). Logos SVG en `packages/brand/logos/` y sync a `apps/*/public/brand/` con `pnpm brand:sync`. Nadie más declara color: `packages/shared/brand.css`, el mascota `via-mascot.png` y `via-mark.svg` quedaron retirados.

Esquema por `data-theme` + `prefers-color-scheme`. Por defecto sigue al OS; si el usuario elige claro/oscuro, queda en `localStorage` (`viapay-theme`). Misma key en web, checkout y dashboard. Boot script (`THEME_BOOT` de `@viapay/prefs`) evita FOUC. El logo cambia de variante solo con CSS (`.via-logo--on-light` / `--on-dark`). Superficies fijadas oscuras: masthead del dashboard y terminal de la landing.

i18n en **web, checkout y dashboard**: ES (default) → EN → PT. Detección por `navigator.language` o `viapay-locale`. Toggle de idioma + tema en las tres apps (`@viapay/prefs` + `createI18n`). Cadenas por app en `apps/*/src/lib/i18n/messages.ts`.

| Superficie | Logo |
|---|---|
| Landing nav / footer | horizontal 128px / 112px |
| Landing hero y 404 | isotipo 520px / 168px |
| Landing `#modos` | tabs Link / Split / Agente — los tres con `FlowSplit` + badges `%` |
| Dashboard header | horizontal 120px; watermark isotipo en la masthead |
| Dashboard login | stacked 176px |
| Checkout | horizontal 104px + watermark isotipo en la tarjeta |
| Favicon / apple-icon | `icon.svg` del kit + `apple-icon.png` 180px (Next ignora SVG para apple-icon) |

Checkout (pagador): solo el **total a pagar**. Sin fees, sin desglose, sin wallets de ViaPay/revendedor. El split on-chain sigue siendo 3 patas; solo se oculta en UI al pagador. El dashboard sí muestra preview al crear el cobro (el comercio configura el % Hubby).

## Cómo arrancar

```bash
pnpm install
pnpm db:seed
pnpm dev
```

Login demo: Continuar en local. La API key sale de `data/seed.local.json` (no commitear).

Este trabajo está en `main` de `github.com/wrever/viapay`. No hay PR abierto. No afirmar que Supabase, Pollar, Trustless Work o un anchor están vivos sin las env de arriba, ni que el checkout liquida por Soroban.

Para la demo y la evidencia on-chain: `docs/HACKATHON.md`.
