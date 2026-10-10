# ViaPay settle-proof

Paquete compartible (HMAC) para cobros `succeeded`. **No sustituye la cadena.**

- `GET /v1/settle-proof/:id` — body + signature
- Recibo humano: `https://viapay.vercel.app/r/:id`
- Verdad: `GET /v1/parity/:id` + `GET /v1/verify?tx_hash=`

Ver [`PROOF_OR_NOTHING.md`](./PROOF_OR_NOTHING.md).
