# ViaPay Payment Intent — machine-readable settlement primitive

**Name:** ViaPay Payment Intent (`payment_intent`)  
**Role:** Settlement rail primitive (not a vertical app workflow)  
**Status:** Implemented · public discovery at `GET /v1/rails`

This is ViaPay’s **named contribution**: one object that any human UI, WhatsApp bot, email invoice, redirect shop, or HTTP-402 agent can create and settle through the same Soroban `payment-router`.

## Why it exists

x402 and wallet checkouts usually fork into two integrations. Marketplaces need a third (reseller split). ViaPay collapses them:

```
create payment_intent
        │
        ├─ human  → checkout_url → /pay → Freighter → pay()
        ├─ agent  → same URL → 402 → prepare/submit → pay()
        ├─ WA/NL  → same object → deliver link → pay()
        └─ email  → same object → Resend/mailto → pay()
                    │
                    └─ on succeeded:
                         webhooks + merchant WA/email + payer receipt
```

## Schema (API)

| Field | Meaning |
|---|---|
| `id` | `pi_…` |
| `amount` / `asset` | Gross charge (`XLM` \| `USDC`) |
| `network` | `testnet` \| `mainnet` |
| `fee_bps` | ViaPay cut (server-enforced, default 100) |
| `reseller_fee_bps` + `reseller_address` | Optional marketplace leg |
| `checkout_url` | Unified gateway (`/v1/x402/:id`) |
| `pay_url` | Human UI (`/pay/:id`) |
| `metadata.invoice` | Optional `{ recipient_name, phone_e164, email, channel, source }` |
| `stellar_tx_hash` | Set on `succeeded` |

On-chain: `payment-router.pay(...)` emits `Paid`. Anyone verifies with `GET /v1/verify` (no API key).

## Events

| Event | Delivery |
|---|---|
| `payment_intent.succeeded` | HTTPS webhooks (`ViaPay-Signature`) |
| same | Merchant WhatsApp if WA-linked · merchant email (`accounts.email`) |
| same | Payer WhatsApp/email if `metadata.invoice` has destinations |

## Consumers (in-repo)

| Consumer | Path |
|---|---|
| Panel Cobros | `apps/dashboard` — contact or quick email/phone |
| WhatsApp assistant | `apps/api/src/lib/whatsapp` — NL one-shot |
| Shop redirect MVP | `apps/shop` — third-party style `success_url` |
| Agent demo | `examples/agent-pay.mjs` |
| Public verify | `examples/verify-settlement.mjs` · `pnpm verify` |

## Pricing schemes

| `scheme` | Meaning |
|---|---|
| `exact` (default) | `amount` is XLM/USDC |
| `exact_pay` | `fiat_amount` + `fiat_currency` → crypto locked at create ([EXACT_PAY.md](./EXACT_PAY.md)) |

x402 wire still uses scheme `exact` (fixed crypto). ViaPay mode is `viapay.scheme`.

## Not this spec

Local402 **exact-fx** / Reflector atomic FX · ZK nullifiers · tax withhold · clawback. ViaPay owns **charge → multi-party settle → notify → verify** (+ optional fiat lock).

## Verify

See [`../VERIFY.md`](../VERIFY.md) and `GET /v1/rails`.
