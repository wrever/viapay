# Evidence index (llenar con txs reales)

Red: **testnet** (salvo fila mainnet). Tesorería fees: `GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5`.

| # | Escenario | Asset | Tx / link | Notas |
|---|---|---|---|---|
| 1 | Pay XLM split 2 patas | XLM | _pending_ | comercio + fee |
| 2 | Pay XLM + reseller | XLM | _pending_ | 3 ops |
| 3 | Pay USDC | USDC | _pending_ | trustlines OK |
| 4 | x402 agent pay | XLM/USDC | _pending_ | `examples/agent-pay.mjs` |
| 5 | Trustline USDC comercio | USDC | _pending_ | Integración → Activar |
| 6 | Router prepare/submit | — | _pending_ | `settlement: router` |
| 7 | Mainnet mínimo | USDC/XLM | _pending_ | 1 tx real |

## Contrato

| Campo | Valor |
|---|---|
| payment-router testnet | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` |
| wasm hash (deploy) | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |
| SEP-55 | CI workflow; Verified Build pendiente attestation |

## Límites honestos

Testnet-first · fee 1% a tesorería · SEP-24 fiat simulado · sin audit · sin tracción.
