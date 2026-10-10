# ViaPay `exact-split`

Scheme de settlement multi-pata (no es Local402 `exact-fx`).

## Qué es

Un `payment_intent` fija un monto crypto. Al pagar, Soroban `payment-router.pay` reparte en **una sola transacción**:

| Pata | Destino |
|---|---|
| net | comercio |
| fee | tesorería ViaPay |
| reseller_fee (opcional) | revendedor |

El evento on-chain `Paid` incluye `intent_id` = SHA-256 del id del intent.

## Por qué existe

Marketplaces (Hubby) necesitan fee de plataforma + neto al creador sin dos txs ni confiar en un ledger opaco. Stellar ya permite transfers SAC; ViaPay **nombra y demuestra** el invariante: un monto entra → salen montos exactos que suman el total.

## WhatsApp

```
cobro 20000 pesos a juanito con hubby 7%
```

→ `exact_pay` + `reseller_fee_bps` → confirm → link.

## Límites honestos

- No es escrow ni FX Reflector.
- Refunds post-pago no están en este scheme (FUTURO).
- Ver también [`RAIL_PARITY.md`](./RAIL_PARITY.md) y [`PROOF_OR_NOTHING.md`](./PROOF_OR_NOTHING.md).
