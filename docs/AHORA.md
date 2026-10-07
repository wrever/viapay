# ViaPay — ahora (lo que hay que mostrar)

Foco de producto **antes** de volvernos infra pesada. Lo diferido está en [`FUTURO.md`](./FUTURO.md).

## Ya vivo (demostrar bien)

1. **Link de cobro** — crear en dashboard, copiar URL, pagar en checkout hosted.
2. **Split 2 o 3 patas** — ViaPay 1% fijo + revendedor opcional (Hubby) + neto al comercio, misma tx.
3. **Redirect ecommerce (MVP)** — el sitio manda al cliente al checkout ViaPay; `success_url` / `cancel_url` en la API. App de prueba: `apps/shop` (`:3005`).
4. **Pagos agénticos** — mismo `payment_intent` por HTTP 402 (`/v1/x402/:id`); demo `examples/agent-pay.mjs`.
5. **Webhooks firmados** — `payment_intent.succeeded` + `ViaPay-Signature`.
6. **Landing** — un solo bloque con modos de uso (link simple, split marketplace, agente).

## Mejoras de esta fase (sin tocar FUTURO)

- Landing: modos gráficos en un solo lugar (tabs).
- Dashboard: crear + copiar link claro; preview de split al crear (solo comercio).
- Checkout pagador: total + **preview del split** (comercio / ViaPay / revendedor) + **recibo** post-pago + tres puertas (billetera / QR / agente x402).
- Evidencia on-chain y docs de jurado al día (`HACKATHON.md`, `MEMORY.md`).
- Pulir copy y CTAs hacia demo en testnet.
- Path Soroban en checkout cuando `PAYMENT_ROUTER_CONTRACT_ID` está configurado.

## Excepción hackathon (esta semana)

- Paquete jurado: [`WIN_PLAN.md`](./WIN_PLAN.md) + [`submission/`](./submission/).
- **1 pago mainnet** de prueba (evidencia) permitido; no “ops mainnet” de producto.
- SEP-1 toml + SEP-24 test anchor demo + path SEP-55 CI.

## No hacer ahora

Email desde el producto · embed sin redirect · plugins Shopify/Woo · clonar Reflector/Local402.
