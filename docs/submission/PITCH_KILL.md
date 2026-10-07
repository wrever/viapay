# Pitch kill — única pasarela completa

Actualizado: 2026-10-07. Repetir hasta el cansancio. No somos un protocolo.

## Tesis (15 s)

> Local402 y Honorarios son **aplicaciones de nicho** (FX de un request / reserva fiscal).  
> ViaPay es la **pasarela de cobro completa** en Stellar: panel → un link → humano o agente → split en contrato → hash → historial.

De punta a cabo. Eso es lo que el ecosistema e-commerce / marketplace / agente **necesita** para cobrar.

## Tabla de una slide

| | Local402 | Honorarios | **ViaPay** |
|---|---|---|---|
| Qué vende | Precio local + x402 FX | Tax split freelance | **Checkout comercio** |
| Panel crear cobro | No | No (recibo fiscal) | **Sí** |
| Link pagable humano | No foco | Demo walletless fiscal | **Sí `/pay`** |
| Mismo link → agente 402 | Sí (su esquema) | No | **Sí (unificado)** |
| Split marketplace (reseller) | No | No | **Sí (3 patas)** |
| SDK + webhooks + redirect shop | No | No | **Sí** |
| Contrato verifica el pago | Su FxPay | Su tax contract | **payment-router** |

## Frases de cierre (elegir 2)

1. “Ellos resuelven un problema fino. Nosotros cobramos el negocio.”  
2. “Si Setareh / Vitrinee / un agente necesitan **cobrar**, usan ViaPay — no un oracle ni un carnê-leão.”  
3. “No somos más Local402. Somos la caja registradora.”

## Stellar en tiempo récord (solo lo que mata, no features nuevas)

Orden de impacto vs esfuerzo. **No** clonar Reflector ni tax.

| # | Qué | Por qué parte el campo | Tiempo |
|---|---|---|---|
| 1 | **1–2 txs mainnet** router + hash en evidence | Iguala “estamos en mainnet” de Local402/Honorarios | Ops (vos) |
| 2 | **SEP-55** verified build del wasm | Honorarios lo luce; vos lo igualás | CI + Lab |
| 3 | **Video 90s** con tabla de arriba | El jurado recuerda el contraste | 1 ensayo |
| 4 | **SEP-1 toml** + health `payment_router` en demo | Identidad Stellar “seria” en 5 s | Ya vivo — mostrar |
| 5 | **SEP-41 SAC** en el pitch (“token Circle / nativo vía SAC”) | Hablar el idioma del jurado Soroban | Copy |
| 6 | **Evento `Paid` del contrato** en stellar.expert (si se ve) | Prueba que el contrato emitió, no solo “hubo una tx” | Al pagar |
| 7 | **SEP-10/24** 10 s en Integración | “Ancla al mundo fiat” sin prometer offramp real | Ya demo |
| 8 | Rates CLP en UI (CoinGecko) | “El comercio piensa en pesos” sin mentir oracle Reflector | Ya vivo — decirlo |

### Explicitamente NO en récord

exact-fx · Reflector · @username · passkeys nuevas · KYC · plugins Shopify · clonar allowance.

## Guión 90 s (versión “pasarela”)

1. “No somos un protocolo. Somos el checkout.”  
2. Crear cobro + reseller → un link.  
3. Pagar Freighter → recibo 3 patas → hash.  
4. Mismo link `curl` → 402.  
5. “Local402 = FX del request. Honorarios = tax del freelance. ViaPay = pasarela completa.”
