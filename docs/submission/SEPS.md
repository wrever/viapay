# SEPs — matriz ViaPay (hackathon)

Actualizado: 2026-10-10. Runtime: `GET /v1/health` → `seps` (probes live) + `sep_defaults`.

| SEP | Encaje | Decisión | Estado |
|---|---|---|---|
| SEP-1 stellar.toml | Identidad dominio | LIVE | `https://viapay.vercel.app/.well-known/stellar.toml` (probe en health) |
| SEP-7 tx URI | QR checkout | wallet_path | Con router onchain → Freighter / wallets kit (QR clásico off a propósito) |
| SEP-10 | Auth anchor | LIVE (demo cash-out) | SDF Test Anchor WEB_AUTH; panel `POST /v1/sep10/challenge` + `/token` · health sonda challenge |
| SEP-24 | Cash-out | LIVE (fiat simulado) | Proxy `POST /v1/sep24/withdraw` · health sonda `/sep24/info` · UI declara fiat simulado |
| SEP-11 KYC | Anchor customer | SKIP | Sin KYC producto; toml apunta SEP-12 del test anchor |
| SEP-41 SAC | USDC + native | LIVE | `payment-router` `pay()` · testnet + mainnet |
| SEP-55 Verified Build | payment-router wasm | CI + attest | Workflow con meta `home_domain`/`source_repo` + provenance. Health → `attested` si GitHub lista attest. Lab UI = ops |
| SEP-2/6/12/30/53 | Federación / recovery | SKIP | — |

UI: panel **Integración** → `StellarSepsStatus` + `AnchorCashOut`.

**Contratos**

| Red | Contract |
|---|---|
| testnet | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` |
| mainnet | `CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U` |
| wasm hash (deployed) | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |

**Qué no activamos a propósito**

- SEP-11 KYC producto (fuera de scope).  
- SEP-7 clásico con router (rompería settlement atómico `pay()`).  
- Fiat SEP-24 real (sigue simulado en Test Anchor).  
- Lab Verified Build click-ops (tras attest GitHub).
