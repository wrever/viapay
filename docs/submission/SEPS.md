# SEPs — matriz ViaPay (hackathon)

Actualizado: 2026-10-07.

| SEP | Encaje | Decisión | Estado |
|---|---|---|---|
| SEP-1 stellar.toml | Identidad dominio | LIVE | `https://viapay.vercel.app/.well-known/stellar.toml` (+ CORS en `next.config`) |
| SEP-7 tx URI | QR checkout | LIVE / off con router | Con `PAYMENT_ROUTER_CONTRACT_ID` onchain → QR clásico desactivado (usar Freighter) |
| SEP-10 | Auth anchor | DEMO | Proxy API `POST /v1/sep10/challenge` + `/token` → SDF Test Anchor; panel firma con Freighter |
| SEP-24 | Cash-out | DEMO | Proxy `POST /v1/sep24/withdraw` → interactive URL; **fiat simulado** (declarado en UI) |
| SEP-11 KYC | Anchor customer info | SKIP | No KYC producto esta semana |
| SEP-41 SAC | USDC + native | LIVE | `payment-router` `pay()` sobre SAC; health `seps["SEP-41"]` |
| SEP-55 Verified Build | payment-router wasm | CI en repo | `.github/workflows/payment-router-verified-build.yml` (build + attest). Registro Lab = ops manual |
| SEP-2/6/12/30/53 | Federación / recovery | SKIP | — |

Matriz viva en runtime: `GET https://viapay-api.vercel.app/v1/health` → `seps`. UI: panel **Integración** → `StellarSepsStatus` + `AnchorCashOut`.

**SEP-55 path:** Actions → artifact `payment-router-wasm` + provenance attestation → Stellar Lab “Verified Build” con wasm hash documentado en [`MEMORY.md`](../MEMORY.md) (`2ef55539…`).
