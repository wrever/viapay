# Demo 90 segundos (ensayar hasta cero fallos)

## Setup

- Panel: https://viapay.vercel.app/app — wallet comercio **≠** tesorería `GDIN7H…`
- Tesorería con trustline USDC testnet
- Freighter en testnet + XLM (y USDC si demos USDC)
- Opcional: `AGENT_SECRET_KEY` para `examples/agent-pay.mjs`

## Guión

1. **0–15s** — “Pasarela: un cobro, un link, humano o agente; liquida el contrato payment-router.”
2. **15–35s** — Cobros: monto + revendedor → crear → copiar **un** link. Chip “Soroban router” en `/pay`.
3. **35–60s** — Browser → Freighter → Firmar → recibo + hash (invoke `pay`, no 3 ops clásicas).
4. **60–80s** — `curl -i` al mismo link → 402; o `agent-pay.mjs` → liquidación.
5. **80–90s** — Historial. Cierre: “Ellos son apps de nicho. Nosotros somos la pasarela completa.”

One-pager: [`JUDGE_ONE_PAGER.md`](./JUDGE_ONE_PAGER.md) · Kill sheet: [`PITCH_KILL.md`](./PITCH_KILL.md).

## Frases prohibidas

- “Mainnet” sin hash mainnet
- “Offramp real” (solo test anchor / simulado)
- “Oracle CLP” (rates ≈ CoinGecko, no Reflector)
- “Ganamos a Local402 en x402 depth”
