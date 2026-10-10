# payment-router (Soroban)

Reparte un token SEP-41 (por ejemplo el SAC de USDC o el nativo) entre hasta tres destinos en una sola invocación. Misma matemática que `calcFeeSplit` en `@viapay/shared`. Path canónico del checkout onchain.

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

## Desplegado

| | testnet | mainnet |
|---|---|---|
| contract id | `CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT` | `CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U` |
| deploy tx | `7f0d1f0a…` | `058c3502…` |
| pay evidencia | — | `b28aafbd…` (evento `Paid`) |
| wasm hash | `2ef555396732f7866186932864a3564fbf2bf410cd85ed2cac21b0a2209bf383` (idéntico) |
| toolchain | soroban-sdk 27 · Stellar CLI 23.2.1 · `wasm32v1-none` | mismo |

**Checkout onchain:** `PAYMENT_ROUTER_CONTRACT_ID` (testnet) y opcional `PAYMENT_ROUTER_CONTRACT_ID_MAINNET`. `prepare`/`submit` invocan este contrato (`assertRouterPayXdr`). Mainnet one-shot: `docs/submission/MAINNET_ONE_SHOT.md`.

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

El id va en `PAYMENT_ROUTER_CONTRACT_ID` / `_MAINNET`. Las claves viven en `~/.config/stellar/identity/`; `target/` está en `.gitignore`.
