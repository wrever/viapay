# ViaPay `rail-parity`

Propiedad verificable del riel: **humano ≡ agente ≡ prepare ≡ cadena**.

## Endpoint

```
GET /v1/parity/:payment_intent_id
```

Sin API key. Responde `ok`, `surfaces` (intent, x402, paid?) y `mismatches[]`.

## Superficies

1. **intent** — montos y patas del `payment_intent`
2. **x402** — challenge 402 del mismo cobro (`accepts[0].maxAmountRequired` + payouts)
3. **paid** (si `succeeded`) — decode de `pay()` vía `/v1/verify` (merchant, net, fee, reseller_fee, intent_id)

## CLI / MCP

- `pnpm verify --parity <pi_id>`
- MCP tool `viapay_parity`

## Límites

- Pre-pago no hay superficie `paid`.
- No prueba calidad del bien ni tasas fiat Reflector.
- La verdad dura es la cadena; parity demuestra que ViaPay no mintió entre UI y 402.
