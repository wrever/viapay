# Evidence index

Red: **testnet** (salvo fila mainnet). Tesorería fees: `GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5`.

| # | Escenario | Asset | Tx / link | Notas |
|---|---|---|---|---|
| 1 | Deploy payment-router | — | [7f0d1f0a…](https://stellar.expert/explorer/testnet/tx/7f0d1f0a4e9090e86f17eecb438544e8e178d632fc0ac5c91fdfc712b4c7f159) | Contract `CDI6XC5Q…LPRT` |
| 2 | Pay XLM + reseller (clásico 3 ops) | XLM | [9046dc9b…](https://stellar.expert/explorer/testnet/tx/9046dc9b3d107f1eb069c86b8d34252c667cd07f2ef13c7ac04ea1303caa3b0d) | 96 / 1 / 3 — prueba split; path actual = **router** |
| 3 | Pay XLM split 2 patas (router) | XLM | _pending Freighter_ | Tras prepare `settlement: router` + submit |
| 4 | Pay USDC (router) | USDC | _pending_ | Trustlines comercio + tesorería |
| 5 | x402 agent pay (mismo checkout_url) | XLM | _pending_ | `Accept: application/json` → 402 → submit router |
| 6 | Trustline USDC comercio | USDC | _pending_ | Panel Integración → Activar |
| 7 | Mainnet mínimo (router + pay) | XLM | _pending fondeo_ | Runbook: [`MAINNET_ONE_SHOT.md`](./MAINNET_ONE_SHOT.md) · script `scripts/mainnet-one-shot.sh` |

## Contrato

| Campo | Valor |
|---|---|
| payment-router testnet | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` |
| wasm hash (deploy) | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |
| Liquidación onchain | **Solo router** (`assertRouterPayXdr` en submit). Clásico rechazado si hay contract id. |
| SEP-55 | Plantilla CI en `submission/payment-router-verified-build.yml` — copiar a `.github/workflows/` con PAT `workflow` |

## Checklist jurado (antes del video)

- [ ] Comercio demo G… ≠ tesorería GDIN7H…  
- [ ] 1 pago Freighter router → hash en fila #3  
- [ ] 1 pago agente mismo link → fila #5  
- [ ] Demo 90s ensayada sin fallos ([demo-90s.md](./demo-90s.md))  
- [ ] No decir “mainnet” sin fila #7  
- [ ] SEP-1 toml vivo: https://viapay.vercel.app/.well-known/stellar.toml  

## Límites honestos

Testnet-first · fee 1% a tesorería · SEP-24 fiat simulado · sin audit · sin tracción · QR clásico off cuando hay router.
