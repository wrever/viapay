# Demo 90 segundos (ensayar hasta cero fallos)

## Setup

- Panel: https://viapay.vercel.app/app — wallet comercio **≠** tesorería `GDIN7H…`
- Tesorería con trustline USDC testnet
- Freighter en testnet + XLM (y USDC si demos USDC)
- Opcional: `AGENT_SECRET_KEY` para `examples/agent-pay.mjs`

## Guión

1. **0–15s** — “Pasarela Stellar: un cobro, tres puertas, un hash; split 3 patas.”
2. **15–35s** — Cobros: monto + revendedor → crear → copiar link. Mencionar preflight receive/trustline.
3. **35–60s** — Abrir `/pay` → mostrar preview del split + tabs Billetera/QR/Agente → Freighter → Firmar → recibo on-chain + hash en stellar.expert.
4. **60–80s** — Tab Agente (misma URL x402) o `node examples/agent-pay.mjs` → 402 → liquidación → succeeded.
5. **80–90s** — Panel Historial. Cierre: “No somos otro protocolo; somos el checkout.”

## Frases prohibidas

- “Mainnet” sin hash mainnet
- “Offramp real” (solo test anchor / simulado)
- “Oracle CLP” (rates ≈ CoinGecko, no Reflector)
- “Ganamos a Local402 en x402 depth”
