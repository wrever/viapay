# Arquitectura

```
[Dashboard] --sk_test--> [API] --checkout_url--> [Checkout hosted] --+
                            |                                        |
[Agente IA] --402/X-PAYMENT-+                                        +--> [Horizon]
                            |
                            +--> SQLite (local)
                            +--> reparto 3 patas @viapay/shared
```

- **Non-custodial:** ViaPay construye y verifica la transacción, no la recibe. El dinero va directo del pagador a comercio, tesorería y (si hay) revendedor, en la misma tx.
- **Reparto:** ViaPay 1% fijo desde el entorno del servidor, revendedor opcional desde el body del cobro, comercio el resto. 2 o 3 operaciones de pago según haya revendedor o no.
- **Dos puertas, un `payment_intent`:** checkout hosted para personas (Stellar Wallets Kit o QR SEP-7 `tx` con `replace=sourceAccount` + callback, nunca `pay`, que no parte el fee) y `GET/POST /v1/x402/:id` para agentes (402 con los requisitos, liquidación con el header `X-PAYMENT`). Las dos llaman al mismo `prepare` / `submit`.
- **Verificación:** el XDR firmado se desarma y se consume una operación por pata esperada antes de tocar Horizon. Además, al cargar el checkout o el dashboard se buscan txs recientes del comercio cuyo memo sea el id del cobro y cuyas patas coincidan, así que el callback SEP-7 no es el único camino.
- **Webhooks:** `payment_intent.succeeded` firmado con `ViaPay-Signature`. OAuth Supabase opcional.
- **Soroban:** `contracts/payment-router` hace el mismo reparto de 3 patas on-chain y está desplegado en testnet, pero el checkout no lo invoca.

El detalle vivo y honesto está en `docs/MEMORY.md`. El paquete de demo, en `docs/HACKATHON.md`.
