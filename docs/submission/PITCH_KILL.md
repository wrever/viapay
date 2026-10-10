# Pitch kill — settlement rail, not another niche app

Actualizado: 2026-10-09. Repetir hasta el cansancio. **No** somos solo un checkout UI.

## Tesis (15 s)

> ViaPay es **infraestructura de settlement** en Stellar: `payment_intent` + `payment-router`, **proof-or-nothing** (anti-comprobante), **exact-split**, **rail-parity** (humano ≡ agente ≡ cadena).  
> Local402 nombró FX; nosotros atacamos el JPG falso y la paridad del riel. El panel/`/pay` son consumers.

De punta a cabo y **demostrable** (`pnpm verify`, `/evidence`, `/v1/rails`).

## Tabla de una slide (riel)

| Superficie | Qué prueba |
|---|---|
| `payment_intent` + un URL | Humano **o** agente (402) |
| Soroban `pay()` + `Paid` | Split atómico on-chain (hasta 3 patas) |
| `GET /v1/verify` · `pnpm verify` | Cualquiera re-chequea sin API key |
| `/evidence` · `/v1/rails` · MCP | Empaque estilo top (Habeas / Proved / Local402 ideas) |
| Panel + WA + shop redirect | Consumers reales del mismo riel |

## Frases de cierre (elegir 2)

1. “No vendemos un workflow vertical. Vendemos el settle.”  
2. “Si un marketplace o un agente necesita **cobrar con split**, usa el riel — no un oracle ni un carnê-leão.”  
3. “Verify sin confiar en nuestra DB: eso es infraestructura.”

## Stellar en tiempo récord (solo lo que mata, no features nuevas)

Orden de impacto vs esfuerzo. **No** clonar Reflector ni tax.

| # | Qué | Por qué parte el campo | Tiempo |
|---|---|---|---|
| 1 | **1–2 txs mainnet** router + hash en evidence | ~~Pendiente~~ → **HECHO** `CA4FJAYS…` + pay `b28aafbd…` (Paid) · falta env Vercel para cobros panel | Hecho 2026-10-09 |
| 2 | **Public verify + rails + /evidence** | Empaque Local402/Proved/Habeas | Código listo · **deploy prod** |
| 3 | **SEP-55** verified build del wasm | Iguala el bar de “verified” | CI + Lab ops |
| 4 | **Video 90s** riel + verify | El jurado recuerda settle demostrable | 1 ensayo |
| 5 | **SEP-1 toml** + health `evidence` | Identidad Stellar en 5 s | Ya vivo — mostrar |
| 6 | **SEP-41 SAC** en el pitch | Idioma Soroban | Copy |
| 7 | **Evento `Paid`** en stellar.expert | Contrato emitió, no solo “hubo tx” | Al pagar |
| 8 | **SEP-10/24** 10 s en Integración | Fiat path sin mentir offramp | Ya demo |

### Explicitamente NO en récord

exact-fx · Reflector · @username · passkeys nuevas · KYC · plugins Shopify · clonar allowance / ZK tax.

## Guión 90 s (versión “riel”)

1. “Somos settlement infrastructure: un payment_intent, un URL.”  
2. Crear cobro (+ reseller) → link.  
3. Pagar Freighter → recibo + hash + `Paid`.  
4. Mismo link `curl` → 402.  
5. `pnpm verify` / `/evidence` → `verified: true` sin API key.  
6. “Eso es el riel. El panel es un consumer.”
