# ViaPay — plan a futuro (infra pesada)

Esto **no** se trabaja en la fase de demo/hackathon actual. Vive aquí para no mezclarlo con lo que hay que mostrar ya. Legal público (`/privacy`, `/terms`, `/data-deletion`) y email Resend ya están en AHORA — no aquí.

## Diferido a propósito

### Plantillas WhatsApp HSM / SMS
Plantillas HSM para iniciar conversación fuera de la ventana 24h + SMS.
Hoy (AHORA): asistente WhatsApp Cloud API + share `wa.me`; email de invoices vía **Resend** (`RESEND_API_KEY`, fallback mailto).
Motivo del defer restante: HSM aprobadas y SMS.

### Ecommerce integrado sin redirección (devs)
Checkout embebido / iframe / SDK de UI in-page dentro del sitio del comercio.
Hoy: el cobro se paga en el **checkout hosted** de ViaPay (`:3004`).
Motivo: producto de integración largo (CSP, wallets en iframe, branding white-label).

### Plugins y conectores no-dev
Shopify, WooCommerce, botones “Pay with ViaPay”, plantillas de marketplace.
Hoy: crear link en el panel y redirigir al cliente al checkout, o llamar la API.
Motivo: cada conector es un producto aparte; primero se demuestra el riel.

### Infra más pesada (después de ganar tracción)
- Mainnet production + ops
- Checkout liquida por Soroban (hoy el path vivo es clásico; el router está desplegado en testnet)
- Anchors SEP-24/31 de punta a punta
- Escrow Trustless Work en flujo de producto
- Slugs bonitos (`pay.viapay.app/curso-x`)
- Órdenes, inventario, reembolsos, disputas
- Agentes 2.0: allowances, políticas de gasto, catálogo agente↔agente

## Regla

Si una idea suena a “infraestructura de plataforma”, va aquí.  
Si se puede **demostrar en testnet en minutos** con lo que ya existe, va a [`AHORA.md`](./AHORA.md).
