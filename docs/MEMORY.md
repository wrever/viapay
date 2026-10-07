# ViaPay — memoria de proyecto

Actualizado: 2026-10-06 (noche). Lee esto antes de explorar el repo. Si cambias una capacidad, actualiza este archivo en el mismo cambio.

**Git / autor:** historial público solo `wrever`. Nunca `Co-authored-by: Cursor`. Commits del agente: `scripts/rebuild-history.py` usa `git commit-tree` (sin hooks). Repo: https://github.com/wrever/viapay (88 commits limpios).

**Prioridad de producto:** lo demostrable ahora está en [`docs/AHORA.md`](./AHORA.md). Lo diferido (email, embed ecommerce, plugins, infra pesada) está en [`docs/FUTURO.md`](./FUTURO.md). No mezclar.

Índice de docs: [`docs/README.md`](./README.md). Integración API/SDK/x402: [`docs/INTEGRATION.md`](./INTEGRATION.md). Deploy/Supabase: [`docs/DEPLOY.md`](./DEPLOY.md). Sitio prod único: https://viapay.vercel.app/ (`apps/dashboard`: landing `/`, docs `/docs`, login `/login`, panel `/app`, **checkout pagador `/pay/[id]`**). Supabase Site URL debe ser exactamente esa. Local panel+landing+checkout: `:3000`. **No mandar comercios ni pagadores a otro frontend** (`apps/web` es legado local; `apps/checkout` es legado/local — prod es el dashboard). `checkout_url` unificado = `https://viapay-api.vercel.app/v1/x402/…` (navegador → 302 a `/pay`; agente → 402). UI humana directa: `pay_url` = `https://viapay.vercel.app/pay/…` (`VIAPAY_CHECKOUT_URL`). Links de docs en el panel son relativos (`/docs`). Panel `/app`: app shell — top bar (logo, campana notificaciones, locale/theme, user, sign out) + left sidebar desktop / bottom tabs mobile (scroll horizontal). Secciones con estado cliente + `?tab=` + hash (`#resumen` `#cobros` `#historial` `#estadisticas` `#swap` `#integracion` `#notificaciones`); default **Resumen**. Nav: Resumen | Cobros | Historial | Estadísticas | **Swap** (plus, opcional) | Integración | Notificaciones. **Wallet de destino hard-mandatory:** sin `merchant_wallet` el panel fuerza Integración, bloquea el resto de tabs (nav locked), banner + **modal no descartable** con form G… (cierra solo al guardar vía `POST /v1/wallets`), y desbloquea al guardar. API también rechaza `POST /v1/payment_intents` sin wallet. **Trustline comercio:** zona primaria en **Integración** (`TrustlinesSection`: XLM “no requiere”, USDC Circle testnet Activar/Activa vía Freighter + `/v1/wallets/trustline/*`, USDT0 placeholder disabled). Gate residual: si elige USDC en Cobros (o post-guardar wallet) y Horizon dice que no puede recibir → **TrustlineGateModal** (no dismissible hasta activar o confirmar “solo XLM”); si ya tiene trustline, no se bloquea. Cobros default **XLM**. Checkout distingue fallo **comercio** vs **tesorería** vs **revendedor** (no culpa falsa al comercio cuando falla fee→tesorería). Resumen = cards (hoy/mes/todo) + conversión + últimos pagos + hints fiat aprox. Estadísticas = desglose por estado + por activo (+ ≈ fiat). Cobros = form + equivalencia crypto→fiat + instructivo. Historial = solo pagos `succeeded`. Integración = wallet + moneda local preferida (`viapay-fiat`, default CLP) + API key secreta (`sk_…`; sin publishable aún) + snippets curl/SDK + `external_user_id` para clientes del comercio + poll. Notificaciones = poll API, sin UX de webhooks. Sin bloque ReceiveNotice (friendbot/faucet/tesorería). Sin fee ViaPay acumulado (admin). Sin tour/onboarding multi-paso (videos después). Sin copy de marketing en el intro.

**Prod Vercel (vivo, 2026-10-06):**
- Sitio/panel/checkout: https://viapay.vercel.app (proyecto Vercel `web`, Root = `apps/dashboard`). Envs: `NEXT_PUBLIC_VIAPAY_API_URL=https://viapay-api.vercel.app`, `NEXT_PUBLIC_VIAPAY_CHECKOUT_URL=https://viapay.vercel.app`.
- API: proyecto `viapay-api` · Ready · canónico https://viapay-api.vercel.app · `GET /v1/health` → **200** JSON público (`ok`, `mode`, `payment_router`). Alias team: https://viapay-api-bruno-mirandas-projects-b5bdc738.vercel.app. `VIAPAY_API_PUBLIC_URL` = misma canónica. `VIAPAY_CHECKOUT_URL=https://viapay.vercel.app`. Supabase service role en el entorno (Postgres compartido). `PAYMENT_ROUTER_CONTRACT_ID=CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` en prod → prepare/submit invoca Soroban; health expone ese id en `payment_router` (null = path clásico). `SOROSWAP_API_KEY` = Secret (Sensitive) Production+Preview → `/v1/rates` + `/v1/swap` (`configured: true`).
- Checkout legado `viapay-checkout` puede seguir desplegado pero **no es la URL de producto**; no crear más apps Vercel de UI.
- Proyectos Vercel UI no canónicos: `dashboard` (Root `.`; fallaba “No Next.js version detected”) y `viapay-dashboard` (Ready, duplicado). **Git desconectado** de ambos respecto a `wrever/viapay` (2026-10-05) para cortar notificaciones de deploy; prod UI = solo `web`.
- **Deployment Protection:** `ssoProtection` / `passwordProtection` = **null** en `viapay-api` (backend público; sin redirect 302 a Vercel SSO). Previews de `web` pueden seguir con SSO; el dominio `viapay.vercel.app` es alcanzable.

**Docs (`/docs`):** en el mismo deploy del panel (`apps/dashboard`). Capítulos ES/EN/PT en `apps/dashboard/src/lib/marketing/docs-chapters.ts`.

## Supabase (ViaPay)

- Proyecto `fcbdahduqesuotujqbez` · MCP `user-supabase-viapay`.
- Tablas en Postgres (RLS on): `accounts`, `api_keys`, `wallets`, `payment_intents` (+ `external_user_id`, `metadata`), `webhook_endpoints`, `webhook_events`, `webhook_deliveries`. SQL en `supabase/migrations/`.
- **API → Postgres:** si `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` (o `SUPABASE_SECRET_KEY`) están en el entorno de `@viapay/api`, auth Bearer, payment_intents, wallets y webhooks usan Supabase (mismo Postgres que OAuth). Sin esas env, la API sigue en SQLite local (`VIAPAY_DATABASE_PATH`).
- OAuth del panel (`link-account.ts`) ya escribe en Postgres. Al login: reutiliza API key activa (no inserta duplicados); si no hay cookie con la clave, rota (revoke + mint). Revoca keys activas extras.
- Sin wallet de destino el comercio **no usa el panel**: solo Integración usable hasta guardar G…; resto de nav bloqueado; banner + **modal no descartable** (sin Escape/backdrop/X/localStorage; solo cierra al `POST /v1/wallets` exitoso, con form G… embebido). API rechaza `POST /v1/payment_intents` sin wallet.
- Panel `/app` en Vercel: si no hay `NEXT_PUBLIC_VIAPAY_API_URL` (o apunta a localhost), no hace fetch a la API; el panel carga vacío en lugar de tirar Application error. En prod ya apunta a `https://viapay-api.vercel.app`.
- **Demo cobro (2026-10-06):** path feliz XLM: create → `checkout_url` (gateway x402) → browser 302 a `pay_url` → prepare `settlement: router` → Freighter/sign. Agente: mismo `checkout_url` con `Accept: application/json` → 402. **Tesorería oficial fees:** `VIAPAY_TREASURY_ADDRESS=GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5`. Comercio demo ≠ tesorería. Panel: trustlines + Cash out SEP-24. SEP-1 toml. Plan: [`docs/WIN_PLAN.md`](./WIN_PLAN.md) + [`docs/submission/`](./submission/).
- Keys: solo en Vercel / `.env.supabase.local` (gitignored). Nunca en git.

Typecheck del 2026-10-04, sin errores: `@viapay/shared`, `@viapay/stellar`, `@viapay/sdk`, `@viapay/api`, `@viapay/checkout`, `@viapay/dashboard`, `@viapay/web`. `next build` pasa en web, dashboard y checkout. El contrato Soroban compila (`stellar contract build`, CLI 23.2.1) y está desplegado en testnet. Node local v24; pnpm es `corepack pnpm` 10.33.3.

Con Node 24, `better-sqlite3` no trae binario precompilado. Si `pnpm db:seed` revienta con `Could not locate the bindings file`, compílalo:

```bash
cd node_modules/.pnpm/better-sqlite3@11.10.0/node_modules/better-sqlite3 && npx node-gyp rebuild --release
```

## Qué es

Pagos non-custodial en Stellar. El cliente paga en un checkout hosted. El comercio no custodia la clave del pagador. Un agente IA puede pagar lo mismo por HTTP 402 (x402).

**Tesis de producto (demo):** un mismo `payment_intent` → **un `checkout_url`** → humano (billetera / QR) o agente (x402) → split hasta 3 patas → un hash. El link compartido es la gateway `/v1/x402/:id` (`Sec-Fetch-Dest: document` / HTML → 302 a `pay_url`; JSON/agente → 402). UI `/pay` sin tab agente; recibo post-pago sí.

**El reparto es de hasta tres patas, en una sola transacción:**

| Pata | Cuánto | Dónde se decide |
|---|---|---|
| ViaPay | fijo 1% (`DEFAULT_FEE_BPS = 100`) | servidor: `FEE_BPS` del entorno. El cliente **no** lo puede tocar |
| Revendedor | opcional, `reseller_fee_bps` + `reseller_address` | body del `POST /v1/payment_intents` |
| Comercio | el resto | se calcula, nunca se envía |

Caso Hubby (marketplace que revende cursos): curso de $20 → `0.20` a tesorería, `1.40` a Hubby con `reseller_fee_bps: 700`, `18.40` al creador. Verificado on-chain en testnet.

La matemática vive en `calcFeeSplit` (`packages/shared`): bigint, ViaPay y revendedor redondean hacia abajo y el comercio absorbe el resto, así que las tres patas siempre suman el total. `assertFeeBps` rechaza que ViaPay + revendedor lleguen al 100%. El shape de patas para UI/API/x402 es `buildPayoutBreakdown` / `PayoutShare` en el mismo package (`role`, `address`, `amount`, `amount_atomic`, `bps`, `share`).

Monorepo pnpm. Puertos: dashboard (:3000, incluye checkout `/pay/[id]`), API `:3001`, web `:3003` (legado), checkout app `:3004` (legado local), shop (tienda de prueba redirect) `:3005`.

**MVP integración (redirect):** una plataforma crea `POST /v1/payment_intents` con `success_url` + `cancel_url`, redirige a `checkout_url`, y recibe `payment_intent` / `tx_hash` al volver. Referencia: `apps/shop` (`VIAPAY_API_KEY` desde `data/seed.local.json`). `pnpm dev` ya incluye shop; o `pnpm dev:shop`.

## Qué está vivo

En **onchain**, la liquidación **exige** Soroban `payment-router` (`PAYMENT_ROUTER_CONTRACT_ID`). Prepare arma `pay(...)`; submit llama `assertRouterPayXdr` (contrato, merchant, treasury, reseller, montos, intent_id) antes del RPC. Sin contract id en onchain → 503. Clásico multi-op solo si `STELLAR_MODE=simulated` sin router. Con router activo, SEP-7 clásico **no** se ofrece (error en QR: usá Billetera).

1. El dashboard crea un payment intent (`POST /v1/payment_intents`), con o sin revendedor (preview del split al crear).
2. Quien abre `checkout_url`: si es navegador → 302 a `pay_url` (`/pay/[id]`); si es agente → 402. El hosted carga `GET /v1/checkout/:id` (breakdown, preflight). Tabs **Billetera | QR**.
3. El checkout pide un XDR (`POST /v1/checkout/:id/prepare`):
   - **Con router:** simula `pay(...)` vía RPC (SAC SEP-41) y devuelve `settlement: "router"`.
   - **Sin router:** XDR clásico con 2–3 `payment` (+ `changeTrust` USDC si falta). `payoutLegs` arma las patas.
4. Firma con Stellar Wallets Kit (Freighter, Lobstr, xBull, …) o Pollar si hay key. Alternativa: QR SEP-7. Agente: `GET/POST` al mismo `checkout_url` (`/v1/x402/:id`).
5. La API verifica destinos/montos (clásico: ops; router: args de `pay`) y envía (`POST /v1/checkout/:id/submit`) → `status: succeeded` + `stellar_tx_hash`. UI de éxito = recibo de patas + link stellar.expert.
6. El comercio consulta por id: `GET /v1/payment_intents/:id` (Bearer) o la lista. Polling, no webhooks obligatorios.
7. SEP-7 QR sigue el path **clásico** (placeholder + callback). La reconciliación Horizon por memo también es clásica; cobros router quedan `succeeded` vía submit (o poll tras submit).
8. Al marcar pagado se dispara `payment_intent.succeeded` a los webhooks del comercio (si los configuró fuera del panel).

**No en roadmap cercano (decisión):** memo/tag de exchanges (Binance) como destino de cobro; tarjetas/onramp fiat. El comercio cobra a G… propia; el pagador usa wallet/QR/agente.

La verificación (`assertSplitXdr`, `findConfirmedSplits`) consume una operación por pata, así que un revendedor que además sea el comercio sigue cobrando las dos veces. Toda la validación es server-side: el XDR firmado que no tenga exactamente las patas esperadas se rechaza antes de Horizon.

### x402 (pagos de agentes) — vivo

`GET /v1/x402/:id?client_secret=…` devuelve **402** con un cuerpo con forma de `PaymentRequirements` x402 v2 (`accepts[0]`) más un bloque `viapay` con el desglose completo (rol, dirección, monto, monto atómico, bps) y las URLs para liquidar. `POST` al mismo recurso con el envelope firmado en el header `X-PAYMENT` (base64 JSON, `payload.signed_xdr`) o en `signed_xdr` del body lo manda por `submitCheckoutXdr` y responde 200 con `X-PAYMENT-RESPONSE`. Con `{"reconcile": true}` busca un pago ya hecho en Horizon.

No hay facilitator x402: el pagador firma la transacción completa, no auth entries de contrato. Demo: `examples/agent-pay.mjs` (`ASSET`, `AMOUNT`, `RESELLER_ADDRESS`, `RESELLER_FEE_BPS`). Sin `AGENT_SECRET_KEY` imprime el 402 y para.

Corrido de punta a punta en testnet (100 XLM, revendedor al 3%): tx `9046dc9b3d107f1eb069c86b8d34252c667cd07f2ef13c7ac04ea1303caa3b0d`, tres operaciones de pago en una sola transacción — `96` al comercio, `1` a tesorería, `3` al revendedor.

USDC testnet (Circle): `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.  
USDC mainnet: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`.

Tesorería por defecto: `GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5` (`VIAPAY_TREASURY_ADDRESS`).

## Rutas API

| Método | Ruta | Para qué |
|---|---|---|
| GET | `/v1/health` | health |
| GET | `/v1/rates` | tasas crypto→fiat (XLM/USDC → CLP/ARS/COP/BOB/MXN/PEN/USD). Público, cache ~10 min. CoinGecko (crypto→USD) + open.er-api (USD→fiat); fallback a última tasa |
| GET | `/v1/swap` | estado plus Soroswap (`configured`, red, tokens). Público; no filtra la API key |
| POST | `/v1/swap/quote` | cotización XLM↔USDC vía Soroswap Aggregator. **Público** (sin Bearer). Solo XLM↔USDC. Rate-limit ~40/min/IP. Requiere `SOROSWAP_API_KEY` server-side |
| POST | `/v1/swap/build` | arma XDR sin firmar desde un quote. **Público**. Valida contratos XLM/USDC de la red |
| POST | `/v1/swap/send` | envía XDR firmado a Soroswap `/send`. **Público** |
| POST/GET | `/v1/wallets` | alta/lee billetera de destino del comercio |
| POST | `/v1/wallets/trustline/prepare` | XDR `changeTrust` sin firmar (USDC Circle predefinido). Bearer comercio |
| POST | `/v1/wallets/trustline/submit` | XDR firmado (Freighter) → Horizon. Fuente debe ser la wallet guardada |
| POST/GET | `/v1/payment_intents` | crear y listar. Acepta `reseller_fee_bps` + `reseller_address`, `external_user_id` (aliases `externalUserId` / `customer_id` / `customerId` / `customer_ref`) y `metadata`. El GET reconcilia pendientes en Horizon (path clásico) |
| GET | `/v1/payment_intents/:id` | un cobro del comercio autenticado (poll por id → `succeeded` + `stellar_tx_hash`) |
| GET | `/v1/checkout/:id?client_secret=` | estado público + `sep7_tx` + `breakdown` + `x402_url` + si comercio, tesorería y revendedor pueden recibir |
| POST | `/v1/checkout/:id/prepare` | XDR sin firmar (`settlement: router` si hay contrato; si no `classic`) |
| POST | `/v1/checkout/:id/submit` | XDR firmado → Horizon o RPC Soroban → succeeded |
| POST | `/v1/checkout/:id/sep7` | callback de wallet móvil (`application/x-www-form-urlencoded`, campo `xdr`) |
| POST | `/v1/checkout/:id/confirm` | solo si `STELLAR_MODE=simulated`. En onchain responde 400 |
| GET/POST | `/v1/x402/:id?client_secret=` | **Link unificado** (`checkout_url`): GET navegador → 302 a `pay_url`; GET agente → 402; POST `X-PAYMENT` liquida. `?format=json` fuerza 402; `?human=1` fuerza redirect |
| GET | `/v1/readiness` | Friendbot, trustline SEP-7 del comercio, faucet USDC, `fee_bps`, y `resellers[]` (los de cobros pendientes más el de `?reseller=G…`) |
| POST/GET | `/v1/webhook_endpoints` | alta y lista. El secreto se devuelve una sola vez |
| DELETE | `/v1/webhook_endpoints/:id` | baja lógica |
| GET | `/v1/webhook_deliveries` | reintenta las vencidas y lista |
| GET/POST | `/v1/integrations` | estado de Soroban, Supabase, anchor, escrow, Pollar. POST descubre un `stellar.toml` |
| POST | `/v1/escrow` | despliega escrow single-release en Trustless Work. Falla si no hay API key |
| POST | `/v1/auth/link` | cambia un access token de Supabase por una API key de ViaPay |

Auth del comercio: `Authorization: Bearer sk_test_…`. CORS abierto en `/v1/*`.

## Webhooks

API viva (`POST/GET /v1/webhook_endpoints`, entregas, firma HMAC). El panel **no** exige webhooks: camino recomendado `GET /v1/payment_intents/:id` (o lista). Header `ViaPay-Signature: t=<unix>,v1=<hex hmac-sha256>`.  
Mensaje firmado: `` `${t}.${rawBody}` ``. Ventana de 5 minutos.  
El SDK verifica con `ViaPay.verifyWebhook(rawBody, header, secret)`.  
Hasta 5 intentos. Localhost http está permitido. El resto exige https.

## Login

- Solo OAuth (Google / GitHub). Registro y login son el **mismo** lugar: primera vez `linkAccountFromEmail` crea la cuenta comercio; siguientes = login. Sin “Continuar en local” en producto.
- `/login`: volver a `/`, card con tokens brand, iconos Google/GitHub, hint i18n de “misma cuenta”.
- Flujo: `/auth/oauth` → Supabase → `/auth/callback` → upsert `accounts` + `api_keys` en Postgres (service role) → cookies de sesión.
- Site URL de Supabase Auth debe ser `https://viapay.vercel.app` (nunca localhost ni subdomain).
- `VIAPAY_ALLOW_LOCAL_LOGIN=1` solo para emergencia en máquina local; en Vercel está apagado.

## Soroban: payment-router (preferido si hay env)

`contracts/payment-router` expone `pay(token, payer, merchant, treasury, reseller: Option<Address>, net, fee, reseller_fee, intent_id)` sobre un token SEP-41 y mueve las tres patas con `payer.require_auth()`. Errores: `InvalidAmount = 1`, `MissingReseller = 2` (pasar `reseller_fee > 0` sin dirección). `intent_id` = SHA-256 UTF-8 del id del payment intent.

| | |
|---|---|
| contract id (testnet) | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` |
| tx del deploy | `7f0d1f0a4e9090e86f17eecb438544e8e178d632fc0ac5c91fdfc712b4c7f159` |
| hash del wasm | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |

Onchain + `PAYMENT_ROUTER_CONTRACT_ID`: `prepare` / `submit` / x402 solo router; un XDR clásico se rechaza. SEP-7 clásico desactivado si hay router. Reconcile Horizon por memo sigue siendo path clásico (no marca cobros router). Código: `requirePaymentRouterContractId`, `buildRouterPayXdr`, `assertRouterPayXdr`, `submitVerifiedRouter`.

## Lo que no está desplegado

- **Anchor SEP-24**: descubrimiento vía `POST /v1/integrations` `{ domain }` (SDF Test Anchor por defecto en UI). Fiat payout **simulado**. `ANCHOR_HOME_DOMAIN` opcional en API para GET status.
- **Escrow Trustless Work**: el POST existe. Sin `TRUSTLESSWORK_API_KEY` no llama a su API. Testnet: `https://beta.api.trustlesswork.com` (`/escrow/single-release/v2/deploy`). Mainnet legacy: `https://api.trustlesswork.com`.
- **Pollar**: el checkout monta `PollarProvider` solo si hay `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`. Sin key, el botón no aparece. Hace falta una key de `dashboard.pollar.xyz`.
- **Swap (público en checkout + plus en panel)**: `POST /v1/swap/quote|build|send` son **públicos** (sin cuenta ViaPay); `SOROSWAP_API_KEY` solo server-side; rate-limit básico por IP. **Checkout pagador** `/pay/[id]`: tabs **Billetera | QR**; debajo del flujo, link «¿No tienes el token? Swappear» cambia `view` a swap (reemplaza el área de pago con `CheckoutSwap` + CTA «Volver a pagar»). Copy visible sin marca del agregador ni link externo (feature ViaPay). Swap no es tab ni liquida el `payment_intent`. Panel `#swap` (`SwapPanel`) usa los mismos endpoints; sin hint de API key / login ni link externo. **Prod:** `SOROSWAP_API_KEY` en Vercel `viapay-api` → `GET /v1/swap` `configured: true`. Sin key la UI degrada (mensaje genérico).
- **x402 con facilitator**: el endpoint propio está vivo (ver arriba), pero ViaPay liquida por su cuenta. No hay integración con un facilitator x402 ni con el esquema de auth entries de Soroban.
- **Checkout unificado:** un `checkout_url` (gateway x402). Navegador → `/pay`; agente → 402. Panel Cobros copia ese único link. `pay_url` = UI directa. Detección: `apps/api/src/lib/accept.ts`.

## Límites reales

- Horizon no indexa memos. La reconciliación mira 40 txs recientes del comercio.
- El QR del teléfono no llega a `localhost`. Usa `VIAPAY_API_PUBLIC_URL`.
- El `replace` de SEP-7 depende de que la wallet refresque la secuencia. Si no, `tx_bad_seq`. El camino de navegador (prepare con la cuenta real) es el sólido.
- Comercio, tesorería y revendedor tienen que existir en la red. USDC exige trustline en los tres: si al revendedor le falta, **el cobro entero falla**, no solo su pata. En el panel, al teclear la wallet del revendedor el formulario avisa si no puede recibir; no hay bloque de readiness/Friendbot/faucet.
- `STELLAR_MODE=simulated` sigue en el endpoint viejo `/confirm`. La UI no lo usa. `.env.example` está en `onchain`.

## SQLite

Archivo `data/viapay.db` (`VIAPAY_DATABASE_PATH`). Tablas en `apps/api/src/lib/db.ts`: `accounts`, `api_keys`, `wallets`, `payment_intents`, `webhook_endpoints` (secreto en claro, `whsec_…`), `webhook_events`, `webhook_deliveries`. El seed local no se commitea: `data/seed.local.json`.

`payment_intents` lleva `reseller_fee_bps`, `reseller_amount`, `reseller_address`, `external_user_id` y `metadata` (JSON text). Las bases viejas se migran solas con `addColumns` al arrancar (sqlite no tiene `add column if not exists`).

## Variables

Plantilla: `.env.example`. Obligatorias en local: `STELLAR_MODE=onchain`, `STELLAR_NETWORK=testnet`, `USDC_ISSUER`, `VIAPAY_TREASURY_ADDRESS`, `VIAPAY_API_PUBLIC_URL`. `FEE_BPS` es opcional: si falta o trae basura, `resolveViaFeeBps` cae a 100 (1%). Opcionales que activan integraciones y no deben fingirse: `NEXT_PUBLIC_SUPABASE_*` + `SUPABASE_*`, `PAYMENT_ROUTER_CONTRACT_ID`, `ANCHOR_HOME_DOMAIN`, `TRUSTLESSWORK_API_KEY`, `NEXT_PUBLIC_POLLAR_PUBLISHABLE_KEY`, `SOROSWAP_API_KEY` (solo API / proyecto Vercel **viapay-api**; opcional `SOROSWAP_API_URL`).

## Dónde está el código

- Matemática del split 3 vías (`calcFeeSplit`, `assertFeeBps`, `formatBps`, `buildPayoutBreakdown`, `PayoutShare`): `packages/shared/src/index.ts`
- Patas, SEP-7, Horizon, router Soroban (`payoutLegs`, `assertSplitXdr`, `buildRouterPayXdr`, `findConfirmedSplits`): `packages/stellar/src/index.ts`
- Orquestación del checkout: `apps/api/src/lib/chain.ts`
- Challenge y header x402 (`breakdownFor` → shared): `apps/api/src/lib/x402.ts` + ruta `apps/api/src/app/v1/x402/[id]/route.ts`
- GET checkout público (`breakdown`, `x402_url`, receive, sep7): `apps/api/src/app/v1/checkout/[id]/route.ts`
- Fee y persistencia: `apps/api/src/lib/payments.ts`, SQLite `apps/api/src/lib/db.ts`, Postgres via `apps/api/src/lib/supabase-admin.ts` cuando hay service role
- Auth OAuth → API key (dashboard): `apps/dashboard/src/lib/link-account.ts` + callback
- Auth OAuth → API key (API link): `apps/api/src/app/v1/auth/link/route.ts`
- Wallets destino: `POST/GET /v1/wallets` (`apps/api/src/app/v1/wallets/route.ts`) + `IntegrationPanel`
- Checkout UI (prod en dashboard): `apps/dashboard/src/components/checkout/PayPanel.tsx` + `SplitLegsList.tsx` (solo recibo) + `lib/checkout/breakdown.ts` + `/pay/[id]` (discovery x402 en page). Tabs **Billetera | QR**; swap vista secundaria.
- Checkout legado (local): `apps/checkout/src/components/PayPanel.tsx` (puede seguir desfasado; prod = dashboard)
- Wallets Kit: `apps/dashboard/src/lib/checkout/wallet.ts` (y espejo en `apps/checkout`)
- Pollar: `apps/dashboard/src/components/checkout/PollarShell.tsx`
- Dashboard login OAuth: `apps/dashboard/src/lib/supabase.ts`, `auth/oauth`, `auth/callback` (`@supabase/ssr`)
- Alta de cobro con revendedor y preview del desglose: `apps/dashboard/src/components/CreatePaymentLink.tsx`
- Pitch / demo jurado: [`docs/WIN_PLAN.md`](./WIN_PLAN.md), [`docs/submission/demo-90s.md`](./submission/demo-90s.md), [`docs/submission/COMPETITORS.md`](./submission/COMPETITORS.md)
- Equivalencias crypto→fiat (aprox.): prefs `viapay-fiat` en `@viapay/prefs` (default CLP); tasas `GET /v1/rates` (`apps/api/src/lib/rates.ts`); UI en Cobros (`FiatEquivalent`), Integración (selector), checkout `/pay` y hints en Resumen/Estadísticas
- Swap Soroswap XLM↔USDC: `apps/api/src/lib/soroswap.ts` + `rate-limit.ts` + rutas públicas `/v1/swap/*`; UI panel `SwapPanel.tsx` (`#swap`); checkout `CheckoutSwap.tsx`
- Integración (wallet + trustlines testnet + API key + snippets curl/SDK + `externalUserId`): `apps/dashboard/src/components/IntegrationPanel.tsx` + `TrustlinesSection.tsx`
- Tipo readiness del panel: `apps/dashboard/src/lib/readiness.ts`
- SDK: `packages/sdk/src/index.ts` — `createPaymentLink` (camelCase + `externalUserId`), `createCheckout`, `getPaymentLink`, `parseX402Challenge`, `encodePaymentHeader`, `verifyWebhook` con `crypto.subtle`. README: `packages/sdk/README.md`
- Demo de agente x402: `examples/agent-pay.mjs`
- Contrato: `contracts/payment-router/src/lib.rs` — desplegado en testnet; checkout lo invoca si `PAYMENT_ROUTER_CONTRACT_ID` está set
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

Esquema por `data-theme` + `prefers-color-scheme`. Por defecto sigue al OS; si el usuario elige claro/oscuro, queda en `localStorage` (`viapay-theme`). Misma key en web, checkout y dashboard. Boot script (`THEME_BOOT` de `@viapay/prefs`) evita FOUC. El logo cambia de variante solo con CSS (`.via-logo--on-light` / `--on-dark`). Superficies fijadas oscuras: masthead del dashboard y terminal de la landing. Moneda fiat de display (equivalencias ≈): `localStorage` `viapay-fiat` (default **CLP**; códigos CLP/ARS/COP/BOB/MXN/PEN/USD) vía `@viapay/prefs`.

i18n en **web, checkout y dashboard**: ES (default) → EN → PT. Detección por `navigator.language` o `viapay-locale`. Toggle de idioma + tema en las tres apps (`@viapay/prefs` + `createI18n`). Cadenas por app en `apps/*/src/lib/i18n/messages.ts`.

| Superficie | Logo |
|---|---|
| Landing nav / footer | horizontal 128px / 112px |
| Landing hero y 404 | isotipo 520px / 168px |
| Landing `#modos` | tabs Link / Split / Agente — los tres con `FlowSplit` + badges `%` |
| Dashboard header | horizontal 120px; top bar + sidebar/tabs en `/app` (default Resumen) |
| Dashboard login | stacked 176px |
| Checkout | horizontal 104px + watermark isotipo (misma host `/pay/[id]`) |
| Favicon / apple-icon | `icon.svg` del kit + `apple-icon.png` 180px (Next ignora SVG para apple-icon) |

Checkout: `checkout_url` = share unificado; `pay_url` = hosted; `x402_url` alias. UI `/pay`: total + billetera/QR + recibo. Helper `buildPayoutBreakdown` en `@viapay/shared`.

## Cómo arrancar

```bash
pnpm install
pnpm db:seed
pnpm dev
```

Login producto: OAuth Google/GitHub. Local de emergencia: `VIAPAY_ALLOW_LOCAL_LOGIN=1`. API key de seed: `data/seed.local.json` (no commitear).

Este trabajo está en `main` de `github.com/wrever/viapay`. No hay PR abierto. No afirmar que Supabase, Pollar, Trustless Work o un anchor están vivos sin las env de arriba. Con `PAYMENT_ROUTER_CONTRACT_ID` el checkout liquida por Soroban; sin ella, clásico.

Para la demo y la evidencia on-chain: `docs/HACKATHON.md`.
