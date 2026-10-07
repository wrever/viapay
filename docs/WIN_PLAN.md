# ViaPay — plan de victoria (General Track)

Actualizado: 2026-10-06. Honestidad primero: pelear **top-3 / mención**; oro solo con mainnet + SEP-55 + demo impecable frente a Local402/Honorarios.

## Ángulo

Mismo `payment_intent` → humano (Freighter/QR) o agente (x402) → split 3 patas on-chain → hash en stellar.expert. Pasarela de cobro LATAM, no otro protocolo.

## Tesorería oficial

`VIAPAY_TREASURY_ADDRESS=GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5`

La wallet del **comercio** demo debe ser **otra** G… (ops del usuario). Si comercio === tesorería, el panel avisa.

## SEPs

Ver [`submission/SEPS.md`](./submission/SEPS.md). HACER: 1, 7 (pulir), 10/24 demo, 41 (ya), 55. SEP-11 stub only.

## Fases

| Fase | Qué | Estado |
|---|---|---|
| P0 | Tesorería documentada + docs submission | en curso |
| P1 | Evidence txs + video 90s | pendiente ops |
| P2 | SEP-1 toml + SEP-24 test anchor UI | en curso |
| P3 | SEP-55 CI + 1 mainnet | CI en curso; mainnet pendiente keys |

## Probabilidad (honesta)

- Solo testnet + demo: oro ~10%, top-3 ~25%
- + SEP-1/24: oro ~15%, top-3 ~35%
- + mainnet + SEP-55: oro ~25–40%, top-3 ~50%

## NO hacer

Plugins ecommerce, clonar Reflector/Local402, KYC SEP-11 real, @username registry, más features fuera del pitch.
