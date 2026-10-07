# Demo 90 segundos (ensayar hasta cero fallos)

## Setup

- Panel: https://viapay.vercel.app/app — wallet comercio **≠** tesorería `GDIN7H…`
- Tesorería con trustline USDC testnet
- Freighter en testnet + XLM (y USDC si demos USDC)
- Opcional: `AGENT_SECRET_KEY` para `examples/agent-pay.mjs`

## Guión

1. **0–15s** — “Pasarela Stellar: un cobro, humano o agente, un hash; split 3 patas.”
2. **15–35s** — Cobros: monto + revendedor → crear → copiar link humano + link agente x402.
3. **35–60s** — Abrir `/pay` → Freighter → Firmar → recibo on-chain + hash en stellar.expert.
4. **60–80s** — `node examples/agent-pay.mjs` (o `x402_url`) → 402 → liquidación → succeeded.
5. **80–90s** — Panel Historial. Cierre: “No somos otro protocolo; somos el checkout.”

## Frases prohibidas

- “Mainnet” sin hash mainnet
- “Offramp real” (solo test anchor / simulado)
- “Oracle CLP” (rates ≈ CoinGecko, no Reflector)
- “Ganamos a Local402 en x402 depth”
