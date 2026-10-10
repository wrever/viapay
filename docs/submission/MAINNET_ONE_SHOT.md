# Mainnet one-shot (evidencia jurado)

**No** cambiar prod Vercel a `STELLAR_NETWORK=mainnet` (rompe demo testnet). Producto: cobros eligen red; mainnet necesita `PAYMENT_ROUTER_CONTRACT_ID_MAINNET`.

## Hecho (2026-10-09)

| Campo | Valor |
|---|---|
| Contract | `CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U` |
| Wasm hash | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |
| Deployer | `GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5` (`viapay-treasury`) |
| Deploy tx | https://stellar.expert/explorer/public/tx/058c3502c840ae6d70edd4f8a00ffa301ab9537fa0b8a1f879a05b8f22b6f1b6 |
| Pay self | https://stellar.expert/explorer/public/tx/b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e |
| Pay 3rd party | https://stellar.expert/explorer/public/tx/83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f (merchant `GCXX…` ≠ treasury) |
| Explorer | https://stellar.expert/explorer/public/contract/CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U |

Upload usó `--fee 50000000`. `PAYMENT_ROUTER_CONTRACT_ID_MAINNET` ya seteada en Vercel.

## Re-run (si hace falta otro contrato)

```bash
stellar network add mainnet \
  --rpc-url https://mainnet.sorobanrpc.com \
  --network-passphrase "Public Global Stellar Network ; September 2015"

VIAPAY_MAINNET_DEPLOY_SOURCE=viapay-treasury \
VIAPAY_MAINNET_PAYER_SOURCE=viapay-treasury \
VIAPAY_MAINNET_MERCHANT=GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5 \
PAYMENT_ROUTER_MAINNET_ID=CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U \
./scripts/mainnet-one-shot.sh
```

(`PAYMENT_ROUTER_MAINNET_ID` salta el deploy y solo intenta `pay`.)

## Checklist

- [x] Deploy mainnet  
- [x] Pay self-pay + third-party merchant  
- [x] evidence-index #7 + #8  
- [x] `PAYMENT_ROUTER_CONTRACT_ID_MAINNET` en Vercel  
- [x] Prod `STELLAR_NETWORK=testnet`  
- [ ] SEP-55 Verified Build en Stellar Lab (manual)
