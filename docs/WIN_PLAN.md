# ViaPay — plan de victoria (General Track)

Actualizado: 2026-10-07. Honestidad: pelear **top-3 / mención**; oro solo con **mainnet + SEP-55 + demo 90s** frente a Local402/Honorarios.

## Ángulo (no negociar)

**Pasarela completa**, no protocolo. Mismo `payment_intent` → **un `checkout_url`** → humano o agente → split en **payment-router** → hash + panel.  
Local402/Honorarios = nicho; ViaPay = checkout de punta a cabo. Ver [`submission/PITCH_KILL.md`](./submission/PITCH_KILL.md).

## Amenazas #1 a vigilar

Local402 · Honorarios · (agent-stack) AgentAllowance / AegisOS.  
Detalle: [`submission/COMPETITORS.md`](./submission/COMPETITORS.md).

## Tesorería

`VIAPAY_TREASURY_ADDRESS=GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5`  
Comercio demo **≠** esa G….

## SEPs

[`submission/SEPS.md`](./submission/SEPS.md). Vivo: 1, 41, 10/24 demo (proxies+UI), router enforce, health `seps`, workflow SEP-55 en `.github`. Pendiente ops: registrar Verified Build en Lab + 1 mainnet (vos).

## Sprint (ejecutar en orden)

| Prio | Qué | Estado |
|---|---|---|
| P0 | Link unificado + router obligatorio onchain + recibo | **hecho** |
| P1 | Evidence: 1 tx Freighter router + 1 tx agente (llenar index) | **bloqueado en ops / keys** |
| P2 | Demo 90s cero fallos + one-pager jurado | guión listo; ensayar |
| P3 | SEP-55 CI en repo + Verified Build | plantilla; falta PAT workflow |
| P4 | 1 pago mainnet evidencia | **bloqueado:** fondear `GCKAC7MN…` + `GB4NPG6Y…` · ver [`MAINNET_ONE_SHOT.md`](./submission/MAINNET_ONE_SHOT.md) |

## Probabilidad (honesta)

| Escenario | Oro | Top-3 |
|---|---|---|
| Solo testnet + demo | ~8% | ~25% |
| + evidence router/agente fresca + video | ~15% | ~35% |
| + mainnet + SEP-55 | ~25–40% | ~50% |

## NO hacer

Plugins ecommerce · clonar Reflector/Local402 · KYC SEP-11 · @username · features fuera del pitch · decir mainnet sin hash.
