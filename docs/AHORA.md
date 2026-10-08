# ViaPay — ahora (lo que hay que mostrar)

Foco de producto **antes** de volvernos infra pesada. Lo diferido está en [`FUTURO.md`](./FUTURO.md).

## Ya vivo (demostrar bien)

1. **Link de cobro** — crear en dashboard, copiar URL, pagar en checkout hosted.
2. **Split 2 o 3 patas** — ViaPay 1% fijo + revendedor opcional (Hubby) + neto al comercio, misma tx.
3. **Redirect ecommerce (MVP)** — el sitio manda al cliente al checkout ViaPay; `success_url` / `cancel_url` en la API. App de prueba: `apps/shop` (`:3005`).
4. **Pagos agénticos** — mismo `payment_intent` por HTTP 402 (`/v1/x402/:id`); demo `examples/agent-pay.mjs`.
5. **Webhooks firmados** — `payment_intent.succeeded` + `ViaPay-Signature`.
6. **Landing** — un solo bloque con modos de uso (link simple, split marketplace, agente).
7. **Invoices** — contactos + asistente WhatsApp (NL + deliver) + email Resend (key pendiente) + páginas legales Meta.

## Mejoras de esta fase (sin tocar FUTURO)

- Landing: modos gráficos en un solo lugar (tabs).
- Dashboard: crear + copiar link claro; preview de split al crear (solo comercio).
- Un solo `checkout_url` (gateway): humano → `/pay`, agente → 402. Recibo post-pago en UI.
- Evidencia on-chain y docs de jurado al día (`HACKATHON.md`, `MEMORY.md`).
- Pulir copy y CTAs hacia demo en testnet.
- Path Soroban **obligatorio** onchain; badge “Soroban router” en checkout; QR clásico off con router.

## Excepción hackathon (esta semana)

- Paquete jurado: [`WIN_PLAN.md`](./WIN_PLAN.md) + [`submission/`](./submission/).
- **1 pago mainnet** de prueba (evidencia) permitido; no “ops mainnet” de producto.
- SEP-1 toml + SEP-24 test anchor demo + path SEP-55 CI.
- **Invoices por contacto + asistente WhatsApp** (Meta Cloud API, NL `cobro 20 xlm a juanito`, deliver WA/email) → mismo `payment_intent` / `checkout_url`.
- **Email invoices Resend** — `POST /v1/payment_intents/:id/send_email` + opción 2 en el chat (sin key → mailto).

## No hacer ahora

Plantillas HSM / SMS · embed sin redirect · plugins Shopify/Woo · clonar Reflector/Local402.
