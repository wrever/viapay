# Producto estrella: Recibo que no miente

**Frase:** Cobros que no se pueden falsificar.  
**Página:** https://viapay.vercel.app/recibo?id=pi_…  
**Demo alterado:** https://viapay.vercel.app/recibo?id=pi_56fad4bc479de4f5e043065e&demo=altered

No es un protocolo nuevo. Empaqueta `parity` + settle-proof + `/verify` + checklist de firma en **un objeto** que el jurado entiende en 20s.

## Las 4 comparaciones

| # | Superficie | Fuente |
|---|---|---|
| 1 | Intent (comercio) | `GET /v1/parity/:id` → `surfaces.intent` |
| 2 | x402 | `surfaces.x402` |
| 3 | On-chain Paid | `surfaces.paid` (+ `/verify` decode) |
| 4 | Recibo | `GET /v1/settle-proof/:id` → `body` |

Todo ✔ o alguna ✘. Modo demo altera monto/destino del “recibo” en el cliente para simular captura falsa.

## Límites (decir en voz alta)

- El estado de pago se deriva de la cadena; alterar el recibo se detecta al verificar.
- Un estafador puede enviar un link de otro comercio → enlace firmado en `/pay`.
- `/recibo` usa la API ViaPay para armar la tabla; stellar.expert sigue siendo independiente.

## Guion video 2 minutos

**Setup:** panel abierto, Freighter, un `pi_` ya pagado en testnet + hash mainnet a mano.

| Tiempo | Pantalla | Decir |
|---|---|---|
| 0:00–0:20 | Captura falsa (Notion/Notes con “transferí 50.000”) | “Así se cobra hoy en LatAm: WhatsApp + captura. Se falsifica en diez segundos.” |
| 0:20–0:45 | `/recibo?…&demo=altered` con ✘ en casilla 4 | “Si alterás el recibo ViaPay, la verificación se rompe. No confíes en la imagen: compará.” |
| 0:45–1:10 | `/recibo?id=pi_56…` todo ✔ | “Cuatro superficies: intent, 402, Paid on-chain, recibo. Misma verdad.” |
| 1:10–1:35 | `/pay` checklist + badge firmado (o mainnet expert) | “El pagador ve quién cobra y si el comercio firmó el link. Anti-phishing.” |
| 1:35–1:55 | stellar.expert mainnet `83926d93…` o abonos `09f59b22…` | “Mainnet real: evento Paid. Evidencia, no volumen.” |
| 1:55–2:00 | Título / frase | “ViaPay: cobros que no se pueden falsificar.” |

**No decir:** único en el mercado · on-ramp CLP · pull automático · Lab SEP-55 listo · volumen mainnet.

## Tests adversariales (una línea para Dora)

Firma v2: amount alterado / expiry · Abonos: overpay + tx duplicado · Plan: split · Contrato: same `intent_id` multi-`Paid` · Recibo: demo `?demo=altered` → ✘.
