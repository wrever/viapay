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
8. **Riel verificable** — kit [`VERIFY.md`](./VERIFY.md) · `pnpm verify` · `/v1/verify` · `/v1/rails` · `/evidence` · MCP.
9. **Cobros a destino** — panel: agenda **o** email/WhatsApp suelto (XLM/USDC). Bot NL: `cobro N xlm|usdc a nombre|mail|tel` (Meta Live pendiente para inbound real).
10. **exact-pay** — cotizar en CLP/ARS/… y trabar crypto al crear (`scheme: exact_pay`). WA: `cobro 20000 pesos a juanito`. Spec: [`submission/EXACT_PAY.md`](./submission/EXACT_PAY.md).
11. **proof-or-nothing + rail-parity + exact-split** — anti-comprobante; `GET /v1/parity/:id`; split multi-pata nombrado; códigos `VP-XXXX`; recibo `/r/:id`; WA `estado VP-…` / `con hubby 7%`. Specs: [`PROOF_OR_NOTHING`](./submission/PROOF_OR_NOTHING.md) · [`RAIL_PARITY`](./submission/RAIL_PARITY.md) · [`EXACT_SPLIT`](./submission/EXACT_SPLIT.md).
12. **Abonos + enlace firmado** — fiado/layaway con varios `Paid` mismo `intent_id` (sin redeploy wasm); firma ed25519 anti-phishing en `/pay`. Spec: [`ABONOS_SIGNED_LINK.md`](./submission/ABONOS_SIGNED_LINK.md).

## Mejoras de esta fase (sin tocar FUTURO)

- Landing: modos gráficos en un solo lugar (tabs).
- Dashboard: crear + copiar link claro; preview de split al crear (solo comercio).
- Un solo `checkout_url` (gateway): humano → `/pay`, agente → 402. Recibo post-pago en UI.
- Evidencia on-chain y docs de jurado al día (`HACKATHON.md`, `MEMORY.md`).
- Pulir copy y CTAs hacia demo en testnet.
- Path Soroban **obligatorio** onchain; badge “Soroban router” en checkout; QR clásico off con router.

## Excepción hackathon (esta semana)

- Paquete jurado: [`WIN_PLAN.md`](./WIN_PLAN.md) + [`submission/`](./submission/).
- **Mainnet evidencia** (self-pay + third-party) permitida; producto diario = testnet; cobros mainnet opt-in.
- SEP-1/10/24/41 live (probes) · SEP-55 CI (push+Lab pendiente) · SEP-7 = wallet_path.

- **Invoices por contacto + asistente WhatsApp** (Meta Cloud API, NL `cobro 20 xlm a juanito`, deliver WA/email) → mismo `payment_intent` / `checkout_url`.
- **Email invoices Resend** — `POST /v1/payment_intents/:id/send_email` + opción 2 en el chat (sin key → mailto).

## No hacer ahora

Plantillas HSM / SMS · embed sin redirect · plugins Shopify/Woo · clonar Reflector/Local402.
