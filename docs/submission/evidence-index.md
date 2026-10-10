# Evidence index

Red: **testnet** para demo producto · **mainnet** fila #7 (evidencia jurado). Tesorería fees: `GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5`.

| # | Escenario | Asset | Tx / link | Notas |
|---|---|---|---|---|
| 1 | Deploy payment-router | — | [7f0d1f0a…](https://stellar.expert/explorer/testnet/tx/7f0d1f0a4e9090e86f17eecb438544e8e178d632fc0ac5c91fdfc712b4c7f159) | Contract `CDI6XC5Q…LPRT` |
| 2 | Pay XLM + reseller (clásico 3 ops) | XLM | [9046dc9b…](https://stellar.expert/explorer/testnet/tx/9046dc9b3d107f1eb069c86b8d34252c667cd07f2ef13c7ac04ea1303caa3b0d) | 96 / 1 / 3 — prueba split; path actual = **router** |
| 3 | Pay XLM split 2 patas (router) | XLM | _pending Freighter_ | Tras prepare `settlement: router` + submit |
| 4 | Pay USDC (router) | USDC | _pending_ | Trustlines comercio + tesorería |
| 5 | x402 agent pay (mismo checkout_url) | XLM | _pending_ | `Accept: application/json` → 402 → submit router |
| 6 | Trustline USDC comercio | USDC | _pending_ | Panel Integración → Activar |
| 7 | **Mainnet** deploy + self-pay | XLM | Deploy [058c3502…](https://stellar.expert/explorer/public/tx/058c3502c840ae6d70edd4f8a00ffa301ab9537fa0b8a1f879a05b8f22b6f1b6) · Pay [b28aafbd…](https://stellar.expert/explorer/public/tx/b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e) | ledger 64862300 · **self-pay** GDIN7H… · existencia router+`Paid` |
| 8 | **Mainnet** third-party merchant | XLM | Pay [83926d93…](https://stellar.expert/explorer/public/tx/83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f) | ledger 64864011 · merchant **GCXX…** ≠ treasury **GDIN7H…** · 0.099+0.001 · `Paid` · [verify](https://viapay-api.vercel.app/v1/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f) · `pnpm verify -- --kit` · [/evidence](https://viapay.vercel.app/evidence) |
| 9 | **Mainnet abonos** (mismo intent_id) | XLM | [09f59b22…](https://stellar.expert/explorer/public/tx/09f59b225a37de6702755b2947e23aed9722c7be987b477dcea9b2246f37cde9) + [d44f151e…](https://stellar.expert/explorer/public/tx/d44f151e8f476f02180c7231c45ebe4dbd1564bf3f91be0fc54d2c939eb6c996) | Dos `Paid` con intent `f21f2785…` (= sha256 `pi_abono_mainnet_demo_001`) · merchant GCXX… · **sin cambiar wasm** · spec [`ABONOS_SIGNED_LINK.md`](./ABONOS_SIGNED_LINK.md) |

## Contrato

| Campo | Valor |
|---|---|
| payment-router **testnet** | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` |
| payment-router **mainnet** | `CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U` |
| wasm hash (testnet = mainnet) | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |
| Explorer mainnet | https://stellar.expert/explorer/public/contract/CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U |
| Liquidación onchain | **Solo router** (`assertRouterPayXdr` en submit). Clásico rechazado si hay contract id. |
| SEP-55 | Workflow en `.github/workflows/payment-router-verified-build.yml` (build+attest). Registro Lab = manual |

## Checklist jurado (antes del video)

- [ ] Comercio demo G… ≠ tesorería GDIN7H…  
- [ ] 1 pago Freighter router → hash en fila #3  
- [ ] 1 pago agente mismo link → fila #5  
- [x] Mainnet evidencia fila #7 (self-pay)  
- [x] Mainnet third-party fila #8 (merchant ≠ treasury)  
- [x] Deploy prod: `/v1/verify` + `/v1/rails` + `/evidence` + `pnpm verify -- --kit`  
- [ ] Demo 90s ensayada sin fallos ([demo-90s.md](./demo-90s.md))  
- [x] Vercel: `PAYMENT_ROUTER_CONTRACT_ID_MAINNET=CA4FJAYS…`  
- [x] SEP-1 toml vivo: https://viapay.vercel.app/.well-known/stellar.toml  
- [ ] SEP-55 Lab Verified Build (ops)  
- [ ] Pay mainnet USDC (fila opt)  

## Límites honestos

Demo producto en testnet · mainnet = 2 pays (self + third-party merchant) · cobros opt-in con env mainnet · fee 1% · SEP-24 fiat simulado · sin audit · sin tracción · Meta Live / Resend / Lab SEP-55 = ops · pagador necesita wallet+crypto · QR clásico off con router.
