# ViaPay — una página para el jurado

**Qué es:** riel de cobros en Stellar. `payment_intent` + Soroban `payment-router` (`pay` + `Paid`). Panel / WhatsApp / shop son consumers.

**Producto estrella:** *Recibo que no miente* — [/recibo](https://viapay.vercel.app/recibo?id=pi_56fad4bc479de4f5e043065e) (intent ≡ 402 ≡ Paid ≡ recibo). Demo captura falsa: `?demo=altered`. Frase: **Cobros que no se pueden falsificar.**

**Promesa:** un cobro → un URL (humano o agente) → settle atómico; **pagado solo on-chain**; cualquiera compara las cuatro superficies.

## Probar (checklist)

1. **Parity (no es ok fijo):**  
   https://viapay-api.vercel.app/v1/parity/pi_56fad4bc479de4f5e043065e  
   → `ok: true`, surfaces intent/x402/paid, `mismatches: []`.  
   Id inventado `pi_does_not_exist_judge_test` → **404**.
2. **Settle-proof pagado:**  
   https://viapay-api.vercel.app/v1/settle-proof/pi_56fad4bc479de4f5e043065e → **200** + `stellar_tx_hash` · `network: testnet`.
3. **Unpaid:**  
   `GET …/settle-proof/pi_df1327cbdea35264be5d24a9` → **409** `{ "status": "unpaid" }`.
4. **Recibo testnet:** https://viapay.vercel.app/r/pi_56fad4bc479de4f5e043065e · `VP-AMMU`.
5. **Mainnet third-party** (merchant ≠ treasury):  
   [83926d93…](https://stellar.expert/explorer/public/tx/83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f) · [verify](https://viapay-api.vercel.app/v1/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f) → `Paid`.
6. **Self-pay** (existencia): [b28aafbd…](https://stellar.expert/explorer/public/tx/b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e).
7. **CLI kit:** `pnpm verify -- --kit` · UI [/evidence](https://viapay.vercel.app/evidence)
8. **Verificador UI (sin API key):** [/verify?network=mainnet&tx_hash=83926d93…](https://viapay.vercel.app/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f)
9. **Tests:** shared 20 + API 29 + router 9 · spec firma [`LINK_SIG_V2.md`](./LINK_SIG_V2.md)

## Aportes (sin inflar)

| Nombre | Qué es |
|---|---|
| **proof-or-nothing** | Invariante: sin captura |
| **rail-parity** | Consistencia pública intent ≡ 402 ≡ Paid |
| **exact-pay** | Fiat→crypto trabado (**≠** Reflector/exact-fx) |
| **exact-split** | `pay()` multi-pata ya desplegado |

Copy Dora: [`DORA_DESCRIPTION.md`](./DORA_DESCRIPTION.md).

## Límites honestos

Sin auditoría · demos diarias en **testnet** · mainnet = evidencia (no volumen) · pagador necesita wallet+crypto (sin on-ramp bancario) · **Reminders de cuotas / Meta Live / Resend / Lab SEP-55: no activos hoy** (falta config ops) · SEP-24 fiat simulado · plan cuotas = deuda+avisos, no pull on-chain.
