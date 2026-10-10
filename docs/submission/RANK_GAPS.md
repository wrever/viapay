# Brechas vs podio — plan de cierre (post feedback 6°)

Actualizado 2026-10-10. Juez: honestidad subió; techo = originalidad moderada + mainnet/volumen + UX pagador Chile.

## Ya cerrado esta ronda

| Pedido juez / rival | Estado |
|---|---|
| Parity no es `ok` fijo | id inventado → 404 · test `ok:false` si tx basura |
| Settle-proof pagado | 200 + hash (además del 409 unpaid) |
| `pnpm verify` desde clon | vivo · **`pnpm verify -- --kit`** (Proved-style) |
| 2º mainnet merchant ≠ treasury | tx `83926d93…` ledger 64864011 |
| Path pagador Chile | sección honesta en `/evidence` + DORA |
| Vocabulario sin inflar | DORA actual |

## Ideas robadas / adaptadas (sin clonar)

| De | Idea | ViaPay |
|---|---|---|
| **Proved** | verify CLI + checks públicos | `pnpm verify -- --kit` |
| **Local402** | discovery / MCP | `/v1/rails` + MCP tools |
| **Habeas** | evidence page + honesty | `/evidence` judge kit |
| **XReceipt** | recibo verificable | settle-proof + `/r` |
| **Honorarios** | mainnet + límites | 2 pays + payer-path |
| **Rehearse** | tooling contribution | kit + parity tests |

**No clonamos:** exact-fx/Reflector · ZK · disputas on-chain Proved · tax/passkeys Honorarios.

## Ops que aún mueven aguja

1. Video 90s con kit en pantalla.  
2. Evidence testnet #3–#5 (Freighter router + x402) documentada.  
3. Meta Live + Resend key.  
4. Push workflow SEP-55 → attest GitHub → Lab Verified Build.  
5. Consumer tercero con nombre (hoy `apps/shop` solo local).  
6. Opcional: 1 pay mainnet USDC · fee-sponsor.  

Mapa completo: sección **Estado listo / falta** en [`../MEMORY.md`](../MEMORY.md).

## Mensaje de ranking

ViaPay gana por **riel completo + parity + proof-or-nothing + verify kit**, no por inventar FX. Claim: *settlement infrastructure for Stellar commerce with public verification*. Para mención: kit verde + third-party mainnet (hecho) + video + Lab.
