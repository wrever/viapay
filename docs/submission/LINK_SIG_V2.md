# Spec: enlace firmado ViaPay (`viapay-link-v2`)

Una página para terceros. Implementación: `packages/shared/src/link-sig.ts` · verify: `apps/api/src/lib/link-sig.ts`.

## Objetivo

El comercio firma el cobro con la **misma G…** que recibe el neto. El pagador (o un revisor) comprueba que amount/destinos no fueron alterados al reenviar el link (WhatsApp / ecommerce).

## Mensaje UTF-8 (canónico)

Campos unidos con `|` (sin espacios extra):

```
viapay-link-v2|{network}|{asset}|{amount}|{merchant}|{treasury}|{reseller}|{fee_bps}|{expires_unix}|{nonce}
```

| Campo | Ejemplo | Notas |
|---|---|---|
| `network` | `testnet` \| `mainnet` | Red de liquidación |
| `asset` | `XLM` \| `USDC` | |
| `amount` | `10.0000000` | Gross, 7 decimales |
| `merchant` | `G…` | Destino neto |
| `treasury` | `G…` | Fee ViaPay |
| `reseller` | `G…` o `-` | `-` si no hay revendedor |
| `fee_bps` | `100` | Solo fee ViaPay (entero) |
| `expires_unix` | `1735689600` | Unix seconds; default +7d |
| `nonce` | 16 hex | Anti-replay de plantilla |

### Compat v1

```
viapay-link-v1|{amount}|{asset}|{network}|{merchant_wallet}
```

Sin expiry ni legs. La API sigue verificando v1 si no hay `metadata.link_sig.v === 2`.

## Firma

- Algoritmo: **ed25519** de la clave secreta de `merchant`.
- Encoding aceptado: **base64** (64 bytes) o **hex** SEP-43 (128 chars).
- Verify intenta mensaje crudo y, si falla, prefijo `Stellar Signed Message:\n` (wallets SEP-43/53).

## Persistencia

En `payment_intents.metadata`:

```json
{
  "link_signature": "<base64|hex>",
  "link_sig": {
    "v": 2,
    "nonce": "…",
    "expires_unix": 1735689600,
    "treasury": "G…",
    "reseller": "-",
    "fee_bps": 100,
    "amount": "10.0000000"
  }
}
```

`amount` en `link_sig` es el monto firmado (necesario si se copia la firma a cuotas hijas de un plan).

## Respuesta pública (checkout)

| Campo | Valores |
|---|---|
| `link_verified` | `true` \| `false` \| `null` |
| `link_sig_status` | `verified` \| `invalid` \| `expired` \| `null` |
| `link_sig_version` | `1` \| `2` \| `null` |

- Firma expirada → `expired` (el cobro aún se puede pagar; la firma es anti-phishing, no candado).
- Amount/destinos alterados respecto al mensaje → `invalid`.

## Crear (API)

```http
POST /v1/payment_intents
Authorization: Bearer sk_…
Content-Type: application/json

{
  "amount": "10.0000000",
  "asset": "XLM",
  "network": "testnet",
  "link_signature": "…",
  "link_sig": {
    "v": 2,
    "nonce": "aabbccddeeff0011",
    "expires_unix": 1735689600,
    "treasury": "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5",
    "reseller": "-",
    "fee_bps": 100,
    "amount": "10.0000000"
  }
}
```

Panel: toggle “Enlace verificado” → Freighter `signMessage` del string canónico.

## Tests adversariales (API)

- amount alterado → verify fail  
- expiry pasado → `expired`  
- firma ok → `verified`  
- child de plan reusa firma del parent vía `link_sig.amount`

## Límites

No es SEP-1 del comercio. No sustituye KYC. No es boleta fiscal.
