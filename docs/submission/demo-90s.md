# Demo — Recibo que no miente (2 min)

**Frase:** Cobros que no se pueden falsificar.  
Guion largo: [`RECIBO_QUE_NO_MIENTE.md`](./RECIBO_QUE_NO_MIENTE.md).

## Setup

- https://viapay.vercel.app/recibo?id=pi_56fad4bc479de4f5e043065e
- Misma URL con `&demo=altered`
- https://viapay.vercel.app/verify?network=mainnet&tx_hash=83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f
- Panel opcional: cobro firmado en `/pay`
- Captura falsa lista (Notes / editor) “Te transferí 50.000”

## Guión

1. **0–20s** — Captura falsa. “Así se cobra hoy. Se falsifica en diez segundos.”
2. **20–45s** — `/recibo?…&demo=altered` → ✘ en recibo. “Si tocás el recibo ViaPay, se rompe.”
3. **45–70s** — `/recibo` sin demo → cuatro ✔ (intent · 402 · Paid · recibo).
4. **70–95s** — Mainnet `83926d93…` en `/verify` o expert; opcional abonos `09f59b22…`.
5. **95–120s** — Cierre: “ViaPay: cobros que no se pueden falsificar. Pagado = cadena, no captura.”

## Frases prohibidas

- “Único en el mercado”
- “Imposible falsificar” → decir: *alterar el recibo se detecta; un link de otro comercio se mitiga con firma*
- “Mainnet en producción / volumen”
- “On-ramp CLP” · “pull automático” · “Lab SEP-55 listo”

## One-pager

[`JUDGE_ONE_PAGER.md`](./JUDGE_ONE_PAGER.md) · copy Dora: [`DORA_DESCRIPTION.md`](./DORA_DESCRIPTION.md)
