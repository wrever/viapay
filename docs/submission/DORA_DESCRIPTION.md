# ViaPay — descripción Dora (juez Claude)

Pegar el bloque **Texto para el form**. No inflar schemes. No nombrar rivales.

Cifras de tests (2026-10-10, local): **shared 20** · **API 29** · **router Rust 9** → **58** en verde (`pnpm` / `pnpm test:contract`). Incluyen adversariales de firma v2 (amount alterado, expiry), abonos (overpay, tx duplicado), plan (split/due) y contrato (`same_intent_id_allows_multiple_pays_abonos`).

---

## Texto para el form (ES)

**ViaPay** es un riel de cobros en Stellar para comercios que hoy cierran por chat o link compartido. **Producto estrella:** el *Recibo que no miente* — https://viapay.vercel.app/recibo — cuatro superficies (intent · x402 · Paid · recibo) en ✔/✘; demo `?demo=altered` simula captura falsa. Frase: *Cobros que no se pueden falsificar.*

**Problema.** En LatAm el cobro típico es WhatsApp + transferencia + captura. Las capturas se falsifican; no hay una sola fuente de verdad. Un link reenviado no demuestra que el destino sea el comercio. Y web3 no ofrece debit automático mensual confiable: cada pago exige firma del pagador.

**Qué hace.** Un `payment_intent` → un URL para humano (Freighter) o agente (HTTP 402). Liquidación Soroban `payment-router`: hasta 3 patas + evento `Paid` con `intent_id`. “Pagado” solo tras settle on-chain (**proof-or-nothing**). Cualquiera compara intent ≡ 402 ≡ cadena con **`GET /v1/parity/:id`** (sin API key). Recibo `/r/:id` + verificador público `/verify?tx_hash=…` (decodifica el envelope on-chain) + códigos `VP-XXXX`.

**Qué no es.** No es oráculo FX ni scheme SEP nuevo. `exact-pay` traba crypto con tasas públicas al crear el link (≠ Reflector). **No hay pull automático ni suscripción on-chain** — el plan de cuotas es deuda de producto + avisos; cada cuota la firma el pagador.

**Diferenciadores (opt-in del comercio; default = link simple).**

1. **Enlace firmado (anti-phishing / ecommerce).** El comercio firma con su wallet el payload `viapay-link-v2` (spec: `docs/submission/LINK_SIG_V2.md`). `/pay` muestra checklist + comercio verificado / firma inválida / vencida.
2. **Abonos / fiado.** Pagos parciales; “pagado” cuando la suma de `Paid` con el mismo `intent_id` cubre el total — **sin cambiar el wasm**. Mainnet: `09f59b22…` + `d44f151e…` (intent `f21f2785…`). Spec: `docs/submission/ABONOS_SIGNED_LINK.md`.
3. **Plan de cuotas.** Opt-in: parent + N children; parent no payable. Avisos al vencer = **ops** (necesitan `RESEND_API_KEY` y/o Meta Live); sin eso el cron deja log/dry-run. Lo on-chain de cada cuota sigue siendo un `pay()` normal.

**Pagador (honesto).** Necesita wallet Stellar + XLM/USDC. Sin on-ramp bancario CLP en este MVP.

**Probar ahora**
1. https://viapay-api.vercel.app/v1/rails · https://viapay-api.vercel.app/v1/health  
2. Parity: …/v1/parity/pi_56fad4bc479de4f5e043065e → `ok: true`  
3. Settle-proof pagado / unpaid (409)  
4. Recibo: https://viapay.vercel.app/r/pi_56fad4bc479de4f5e043065e  
5. Verificador tx (sin API key): https://viapay.vercel.app/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f  
6. Mainnet third-party `83926d93…` · abonos `09f59b22…`+`d44f151e…` · https://viapay.vercel.app/evidence  
7. Recibo que no miente: https://viapay.vercel.app/recibo?id=pi_56fad4bc479de4f5e043065e · demo alterada: `…&demo=altered`  
8. `pnpm verify -- --kit` · tests: shared 20 + API 29 + router 9 (adversariales: firma amount/expiry, abonos overpay+tx dup, plan split, contrato same intent_id)

**Límites (directo).** Sin auditoría. Mainnet = evidencia, no volumen (txs entre wallets distintas; si no hay tercero independiente, decirlo). **Hoy no activos por config:** reminders de cuotas (falta Resend/Meta Live + `CRON_SECRET`), SEP-55 Lab. SEP-24 fiat simulado. `/recibo` usa la API para armar la tabla; la cadena sigue en stellar.expert.

**Una frase.** Cobros que no se pueden falsificar: el estado se deriva de la cadena, y alterar el recibo se detecta al verificar.

---

## Texto corto (~750 chars)

ViaPay: riel de cobros Stellar. `payment_intent` → URL humano/agente → `payment-router` + `Paid`. Pagado solo on-chain; parity + `/verify` públicos. Opt-in: enlace firmado v2, abonos (mainnet 2×Paid mismo intent), plan cuotas (deuda+avisos; sin pull). Tests: 20+29+9. Kit: `pnpm verify -- --kit`. Mainnet third-party `83926d93…`. Límites: sin audit; reminders/SEP-55 Lab = ops no activas; pagador necesita wallet+crypto.
