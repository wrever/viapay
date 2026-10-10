# Abonos + enlace firmado + plan de cuotas

Sin tocar el wasm del `payment-router` (mismo hash testnet/mainnet).

## Por qué

- LatAm: fiado / “me vas abonando” / layaway — no es first-class en pasarelas.
- WhatsApp / ecommerce: links falsos de cobro — el pagador necesita comprobar destino.
- Cuotas con presión de avisos: web3 no hace cobro persistente on-chain; ViaPay modela deuda de producto + reminders.

## Opt-in del comercio

El cobro **default** sigue siendo un link simple (un pago). Todo lo demás es toggle al crear:

| Modo | Campo | Notas |
|---|---|---|
| Link simple | — | default |
| Enlace firmado | `link_signature` (+ `link_sig` v2) | independiente |
| Fiado libre | `allow_abonos: true` | no combinar con plan |
| Plan cuotas | `plan: { installments: N }` | parent + N children |

## Abonos (fiado libre)

- Contrato: `pay()` **no** exige unicidad de `intent_id` (test Rust `same_intent_id_allows_multiple_pays_abonos`).
- API: `allow_abonos: true` al crear → `metadata.abonos` ledger.
- Estados: `requires_payment` → `partially_paid` → `succeeded` cuando suma de abonos = amount.
- Prepare/submit aceptan `amount` opcional (default = remaining).
- Cada abono emite `Paid` on-chain con el mismo `intent_id` (sha256 del `pi_…`).
- Settle-proof: `partially_paid` → JSON con pays + remaining (HMAC completo solo en `succeeded`).

## Enlace firmado

**Spec de una página (terceros):** [`LINK_SIG_V2.md`](./LINK_SIG_V2.md).

### v1 (compat)

`viapay-link-v1|{amount}|{asset}|{network}|{merchant_wallet}`

### v2 (recomendado)

```
viapay-link-v2|{network}|{asset}|{amount}|{merchant}|{treasury}|{reseller}|{fee_bps}|{expires_unix}|{nonce}
```

- `reseller` = G… o `-`
- `expires_unix` default 7 días
- Firma ed25519 (base64 o hex SEP-43); se guarda `metadata.link_signature` + `metadata.link_sig`
- Serialize / checkout: `link_verified`, `link_sig_status` (`verified` \| `invalid` \| `expired`)
- Panel: Freighter `signMessage` al crear con toggle “Enlace verificado”

## Plan de cuotas (opt-in)

```json
POST /v1/payment_intents
{
  "amount": "30.0000000",
  "asset": "XLM",
  "network": "testnet",
  "plan": { "installments": 3 }
}
```

- Crea **1 parent** (total) + **N children** (cuotas mensuales).
- Parent no se paga directo (`prepare` → `plan_parent_not_payable`); usar `plan_summary.next_pay_url`.
- Al pagar un child → actualiza schedule; si todas succeeded → parent `succeeded` + notify.
- Recordatorios: `POST/GET /v1/cron/plan-reminders` (Bearer `CRON_SECRET` o Vercel Cron diario). WA/email best-effort; sin ops → dry-run/log.

## Crear (API) — ejemplos

```json
POST /v1/payment_intents
{
  "amount": "1.0000000",
  "asset": "XLM",
  "network": "testnet",
  "allow_abonos": true,
  "link_signature": "<base64|hex>",
  "link_sig": {
    "v": 2,
    "nonce": "…",
    "expires_unix": 1700000000,
    "treasury": "G…",
    "reseller": "-",
    "fee_bps": 100
  }
}
```

## Límites honestos

- Abonos son ledger de producto + eventos on-chain; no hay estado de “saldo” en el contrato.
- Plan cuotas = deuda off-chain + presión de avisos; no hay pull automático de wallet.
- Firma de enlace no es SEP-1 del comercio (ViaPay.toml); es firma de la wallet destino del cobro.
- No es boleta SII ni on-ramp CLP.
