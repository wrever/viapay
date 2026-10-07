# Mainnet one-shot (evidencia jurado)

**No** cambiar prod Vercel a mainnet (rompe demo testnet). Esto es **1 deploy + 1–2 txs** de evidencia, luego seguir en testnet.

## Estado (2026-10-07)

| Cuenta | Mainnet |
|---|---|
| Tesorería `GDIN7H…DCT5` | Existe (~9 XLM) — **no** tenemos secret en esta máquina |
| Deployer `viapay-hack-deploy` → `GCKAC7MNMVWK5HISZDCY7QJQ6ICSPQJ6PSX3NJCSLJBQLC5QXJNCYLNP` | **No existe** (hay que fondear) |
| Agente `viapay-x402-agent` → `GB4NPG6YCZ6U2XTCX2HD7W5YO763LQBQEGBTGVLGU26RCTERC2B2QYA6` | **No existe** |

USDC Circle mainnet issuer: `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`

## Qué fondear (mínimo)

Enviá desde cualquier wallet mainnet:

1. **≥ 15 XLM** → `GCKAC7MNMVWK5HISZDCY7QJQ6ICSPQJ6PSX3NJCSLJBQLC5QXJNCYLNP` (deploy + fees)  
2. **≥ 2 XLM** → `GB4NPG6YCZ6U2XTCX2HD7W5YO763LQBQEGBTGVLGU26RCTERC2B2QYA6` (pagador evidencia; o usá Freighter)

Alternativa: si tenés la secret de `GDIN7H…`, podés fondear el deployer desde ahí (no está en el repo).

## Cuando haya fondos

```bash
# Desde raíz del monorepo
./scripts/mainnet-one-shot.sh
```

Eso:

1. Build del wasm (si hace falta)  
2. `stellar contract deploy --network mainnet --source viapay-hack-deploy`  
3. Invoca `pay` con XLM nativo vía SAC (monto chico: 1 XLM → 0.99 comercio + 0.01 fee)  
4. Imprime hashes para pegar en `evidence-index.md`

Comercio de evidencia (misma tx): puede ser otra G… tuya o reusar el deployer como merchant **solo** para el one-shot (anotar en evidence).

## Después del one-shot

- Pegar txs en [`evidence-index.md`](./evidence-index.md) fila #7 (+ deploy mainnet)  
- **No** setear `STELLAR_NETWORK=mainnet` en Vercel prod  
- Demo jurado sigue en testnet; en pitch: “también corrimos en mainnet” + link expert  

## Checklist

- [ ] Fondear deployer mainnet  
- [ ] Fondear pagador (≥ 2 XLM)  
- [ ] Correr `./scripts/mainnet-one-shot.sh`  
- [ ] Actualizar evidence-index + JUDGE_ONE_PAGER  
- [ ] Confirmar prod Vercel sigue en `testnet`
