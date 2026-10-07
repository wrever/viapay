# payment-router (Soroban)

Reparte un token SEP-41 (por ejemplo el SAC de USDC) entre tres destinos en una sola invocación, con la misma matemática que usa el camino clásico de ViaPay.

```rust
pub fn pay(
    env: Env,
    token: Address,
    payer: Address,
    merchant: Address,
    treasury: Address,
    reseller: Option<Address>,
    net: i128,
    fee: i128,
    reseller_fee: i128,
    intent_id: BytesN<32>,
) -> Result<(), Error>
```

`payer.require_auth()` y luego una `transfer` por pata (la del revendedor solo si `reseller_fee > 0`). Emite un evento `Paid` con las tres cifras y el `intent_id`. Errores: `InvalidAmount = 1` (algún monto negativo o todo en cero), `MissingReseller = 2` (`reseller_fee > 0` sin `reseller`).

## Desplegado en testnet

| | |
|---|---|
| contract id | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` |
| tx del deploy | `7f0d1f0a4e9090e86f17eecb438544e8e178d632fc0ac5c91fdfc712b4c7f159` |
| hash del wasm | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` |
| soroban-sdk | 27 · Stellar CLI 23.2.1 · target `wasm32v1-none` |

**Checkout onchain:** con `PAYMENT_ROUTER_CONTRACT_ID`, `prepare`/`submit` invocan este contrato (`assertRouterPayXdr`). Testnet id abajo. Mainnet one-shot: `docs/submission/MAINNET_ONE_SHOT.md` (no flippear Vercel a mainnet).

## Build y deploy

```bash
rustup target add wasm32v1-none
stellar contract build --manifest-path contracts/payment-router/Cargo.toml

# Clave de deploy: local, nunca en el repo.
stellar keys generate --global viapay-deployer --network testnet --fund

stellar contract deploy \
  --wasm target/wasm32v1-none/release/payment_router.wasm \
  --network testnet --source viapay-deployer

stellar contract info interface \
  --id CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT \
  --network testnet
```

El id va en `PAYMENT_ROUTER_CONTRACT_ID`. Las claves viven en `~/.config/stellar/identity/`; `target/` está en `.gitignore`.
