# ViaPay as settlement infrastructure

Not “another checkout app”. The product surface is a **settlement rail**.

## Public discovery (copy from Local402/Habeas playbook — our own)

| Surface | Role |
|---|---|
| https://viapay.vercel.app/evidence | Human evidence page (hashes, verify, tests) |
| `GET /v1/rails` | Machine-readable manifest + MCP tool list |
| `GET /v1/verify?network=&tx_hash=` | Anyone verifies `pay()` from chain (no API key) |
| `pnpm verify` | CLI like Proved’s verify — exit 0 on mainnet evidence |
| `scripts/mcp-viapay.mjs` | MCP stdio tools: rails / verify / health |
| `GET /v1/health` | `evidence.verify_url` + `rails` |

Example:

```bash
pnpm verify
# or
curl -s 'https://viapay-api.vercel.app/v1/verify?network=mainnet&tx_hash=b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e'
```

## Tests (cite in submission)

```bash
pnpm test                 # shared fees + notify + api verify live mainnet
pnpm test:contract        # payment-router: 8 passed
pnpm verify               # public verify CLI against mainnet evidence
```

## What we borrowed (ideas, not clones)

| From | Idea we adapted | ViaPay version |
|---|---|---|
| Proved | `pnpm run verify` against live chain | `pnpm verify` → `/v1/verify` |
| Habeas | Public evidence page with linked txs | `/evidence` |
| Local402 | MCP + npm-style agent surface | `scripts/mcp-viapay.mjs` + `/v1/rails` tools |
| Honorarios | Honest limits + verified-build path | limits on evidence page; SEP-55 CI (Lab ops) |

**Own scheme:** [`EXACT_PAY.md`](./EXACT_PAY.md) — fiat → crypto locked at create (≠ Local402 exact-fx).  
**Not cloned:** Reflector atomic FX / tax ZK / clawback process.

## Still open (ops)

- [x] Deploy API: `/v1/verify` + `/v1/rails` on https://viapay-api.vercel.app (2026-10-09)
- [x] Deploy dashboard: `/evidence` on https://viapay.vercel.app (2026-10-09)
- Vercel env `PAYMENT_ROUTER_CONTRACT_ID_MAINNET` for panel mainnet cobros
- Second mainnet pay with **merchant ≠ treasury** (and optionally USDC)
- Meta `META_WA_APP_LIVE=1` + Resend key + SEP-55 Lab registration
- Stellar Lab Verified Build registration (SEP-55)
