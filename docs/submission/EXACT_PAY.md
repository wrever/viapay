# ViaPay `exact-pay` (nuestro)

**No es Local402 `exact-fx`.** No usamos Reflector ni swap atómico pagador→vendedor en otra moneda en la misma tx.

## Qué es

El comercio cotiza en **moneda local** (CLP, ARS, COP, BOB, MXN, PEN, USD). Al crear el `payment_intent`, ViaPay:

1. Lee tasas públicas (`GET /v1/rates` — CoinGecko + open.er-api).
2. **Traba** un monto exacto en XLM o USDC.
3. Liquida ese crypto on-chain con `payment-router` (`pay` / `Paid`), split incluido.

El pagador y el agente ven un cobro x402 scheme wire **`exact`** (monto crypto fijo). El modo de pricing ViaPay va en `viapay.scheme: "exact_pay"` + `exact_pay` (fiat, tasa, lock).

## Por qué existe

Fuera de EE.UU. el comercio piensa en pesos. Sin traba, la equivalencia ≈ en UI miente al firmar. Con `exact-pay`, el settle on-chain es el crypto **acordado al crear el link**, no un float de pantalla.

## API

```bash
curl -sS -X POST https://viapay-api.vercel.app/v1/payment_intents \
  -H "Authorization: Bearer sk_…" \
  -H "Content-Type: application/json" \
  -d '{
    "scheme": "exact_pay",
    "fiat_amount": "10000",
    "fiat_currency": "CLP",
    "asset": "USDC",
    "network": "testnet"
  }'
```

Respuesta incluye `scheme: "exact_pay"`, `amount` (crypto trabado), `exact_pay: { rate_asset_in_fiat, locked_at, … }`.

`scheme: "exact"` (default) = cobro en crypto como siempre (`amount` obligatorio).

## WhatsApp (el golpe Chile)

```
cobro 20000 pesos a juanito
cobro 20000 clp en usdc a +56912345678
cobro 15 mil pesos chilenos a mail@cliente.com
```

→ traba USDC (o XLM) ≈ esos pesos → confirm → mandás el link por WA/email.  
El pagador paga el **crypto trabado** (Freighter). No necesita cuenta ViaPay.

## Límites honestos

- La tasa **no** es oráculo Reflector on-chain.
- No hay FX en el contrato al pagar (eso sería exact-fx).
- Settle hoy: **USDC o XLM** (no EURC todavía — FUTURO si hay SAC + trustlines).
- Si las tasas caen, `exact_pay` responde 503 — usá `exact` en crypto.
- El comercio recibe el **net** tras fee ViaPay (± reseller), no el fiat bancario.
- Bot inbound real requiere Meta app Live.

## Spec hermano

[`PAYMENT_INTENT_SPEC.md`](./PAYMENT_INTENT_SPEC.md) · verify: [`../VERIFY.md`](../VERIFY.md).
