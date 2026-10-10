# VERIFY — auditar ViaPay sin API key

Canónico para jurados / IAs. **Copiá el bloque.** No hace falta cuenta.

## Claims que SÍ se prueban aquí

- Soroban `payment-router` `pay()` + evento `Paid` en **mainnet**
- Mismo wasm testnet = mainnet
- Discovery máquina (`/v1/rails`) + evidencia humana (`/evidence`)
- CLI `pnpm verify` exit 0

## Claims que NO se prueban con este bloque

- Cobros **panel** en mainnet (`networks.mainnet.ready` puede ser `false` hasta pegar `PAYMENT_ROUTER_CONTRACT_ID_MAINNET`)
- Split **3 patas** comercio ≠ tesorería (la tx evidencia mainnet es 2 patas, mismo G…; split marketplace en testnet / product path)
- SEP-24 fiat real · SEP-55 Lab Verified Build (CI sí; registro Lab = ops)
- WhatsApp inbound Live (bot implementado; Meta app aún no Live) · email Resend (`email.configured` en health)
- Notificaciones WA/email on-succeeded (código vivo; requieren Meta Live + `RESEND_API_KEY`)

## Copy this (≈1 min)

```bash
# 1) Health + evidence pointers
curl -sS https://viapay-api.vercel.app/v1/health | jq '{ok, networks, evidence, verify, rails, seps}'

# 2) Machine discovery (settlement rail)
curl -sS https://viapay-api.vercel.app/v1/rails | jq '{product, role, primitive, onchain, verify, evidence_page, cli}'

# 3) Public verify — expect verified:true
curl -sS 'https://viapay-api.vercel.app/v1/verify?network=mainnet&tx_hash=b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e' \
  | jq '{verified, network, contract_id, event, net, fee, merchant, treasury, explorer_tx}'

# 4) Optional CLI (repo clone)
pnpm verify
pnpm test && pnpm test:contract
```

## Expect (mínimo)

| Campo | Valor |
|---|---|
| `verified` | `true` |
| `contract_id` | `CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U` |
| `event` | `Paid` |
| `net` / `fee` | `0.0990000` / `0.0010000` |
| wasm (health.evidence) | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |

`networks.mainnet.ready: false` **no contradice** la evidencia on-chain: significa “panel no crea cobros mainnet aún”, no “el contrato no existe”.

## Human UI

- Evidence: https://viapay.vercel.app/evidence  
- SEP-1: https://viapay.vercel.app/.well-known/stellar.toml  
- Explorers: [deploy](https://stellar.expert/explorer/public/tx/058c3502c840ae6d70edd4f8a00ffa301ab9537fa0b8a1f879a05b8f22b6f1b6) · [pay](https://stellar.expert/explorer/public/tx/b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e) · [contract](https://stellar.expert/explorer/public/contract/CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U)

## Product path (testnet, demos día a día)

1. Panel https://viapay.vercel.app/app → cobro XLM/USDC → contacto **o** email/teléfono suelto → link  
2. Mismo link: browser → `/pay` · agente `curl -i` → **402**  
3. WhatsApp NL (cuando Meta Live): `cobro 20 xlm a juanito` / `a mail@x.com` / `a +569…`

Detalle SEPs: [`submission/SEPS.md`](./submission/SEPS.md) · riel: [`submission/RAILS.md`](./submission/RAILS.md) · memoria: [`MEMORY.md`](./MEMORY.md).
