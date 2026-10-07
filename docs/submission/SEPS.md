# SEPs — matriz ViaPay (hackathon)

| SEP | Encaje | Decisión | Estado |
|---|---|---|---|
| SEP-1 stellar.toml | Identidad dominio | HACER | `apps/dashboard/public/.well-known/stellar.toml` |
| SEP-7 tx URI | QR checkout | PULIR / documentar | Vivo (`packages/stellar`, `/v1/checkout/:id/sep7`) |
| SEP-10 + SEP-24 | Cash-out test anchor | Demo SDF Test Anchor | UI Integración + `ANCHOR_HOME_DOMAIN` |
| SEP-11 KYC | Anchor customer info | LATER / stub docs | No KYC real en 6 días |
| SEP-41 SAC | USDC + router | Mantener | Vivo |
| SEP-55 Verified Build | payment-router | HACER CI | `.github/workflows/payment-router-verified-build.yml` |
| SEP-2/6/12/30/53 | Federación / recovery | SKIP esta semana | — |

**SEP-55** = WASM on-chain = artefacto CI atestiguado (Stellar Lab “Verified”).
