# Flujo non-tech (link de pago)

## Merchant

1. Entra a `dashboard` → Continuar (local) u OAuth si hay Supabase  
2. Monto + asset (+ descripción opcional)  
3. Opcional: comisión de revendedor (%) + wallet (split marketplace / Hubby)  
4. **Crear link de pago**  
5. **Copiar link** o Abrir checkout  
6. Compartir por donde quieras (WhatsApp, mail, web). ViaPay **no** envía el correo por ti todavía — ver [`FUTURO.md`](./FUTURO.md)

## Comprador

1. Abre el link (`/pay/pi_…?cs=…`)  
2. Ve el **total a pagar** y cómo se reparte on-chain (comercio / ViaPay / revendedor)  
3. Elige cómo pagar:
   - **Wallet** → Stellar Wallets Kit (Freighter, Lobstr, xBull, …) → Firmar y pagar. La misma tx parte neto, fee ViaPay y (si hay) revendedor. Si el asset es USDC y falta trustline, la firma también la abre.  
   - **Código QR** → SEP-7 `tx` (split), no `pay`.  
4. Pantalla de confirmación (+ redirect a `success_url` si existe)  

## Técnico (interno)

```
POST /v1/payment_intents   → { checkout_url, id, client_secret }
GET  /v1/checkout/:id?client_secret=
POST /v1/checkout/:id/prepare
POST /v1/checkout/:id/submit
POST /v1/checkout/:id/sep7          # callback de wallet móvil
GET/POST /v1/x402/:id               # agentes
POST /v1/checkout/:id/confirm       # solo si STELLAR_MODE=simulated
```

Fuente de verdad: status `succeeded` tras ver el split en Horizon (callback SEP-7 o búsqueda por memo).  
Webhook: `payment_intent.succeeded` firmado (`ViaPay-Signature`).

Guía de integración: [`INTEGRATION.md`](./INTEGRATION.md).
