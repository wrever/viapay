# ViaPay `proof-or-nothing` (anti-comprobante)

## Dolencia

En Chile (y LATAM) el cobro por WhatsApp se rompe con **capturas falsas** de transferencia / apps que imitan Mercado Pago. Meta no reconcilia pagos: el chat no es la caja.

## Regla de producto

**Ningún JPG, PDF ni “te transferí” cambia el estado del cobro.**  
Solo `payment_intent.status = succeeded` tras submit/reconcile con tx on-chain (`Paid`).

## Surfaces

- Checkout: copy “No aceptamos capturas. Confirmación = Stellar.”
- WA `estado VP-XXXX` / `estado pi_…` → unpaid | paid + hash + parity + recibo `/r/…`
- Recibo público `/r/:id` + `GET /v1/settle-proof/:id` + `GET /v1/parity/:id`
- Notify: el mensaje WA/email **es consecuencia** del settle, no la prueba

## chat-truth

WhatsApp solo **notifica** el estado del intent. No hay “marcar pagado” manual.

## split-glass

El recibo y el notify muestran las patas (neto / fee / reseller) — fee opaco = dolencia marketplace.

## one-shot

Un intent solo se paga una vez; prepare/submit rechazan si ya `succeeded`.
