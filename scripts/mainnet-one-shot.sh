#!/usr/bin/env bash
# One-shot: deploy payment-router on Stellar PUBLIC network + tiny native pay.
# Does NOT touch Vercel env. Requires funded identities (see docs/submission/MAINNET_ONE_SHOT.md).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

DEPLOY_ID="${VIAPAY_MAINNET_DEPLOY_SOURCE:-viapay-hack-deploy}"
PAYER_ID="${VIAPAY_MAINNET_PAYER_SOURCE:-viapay-x402-agent}"
MERCHANT="${VIAPAY_MAINNET_MERCHANT:-}"
TREASURY="${VIAPAY_MAINNET_TREASURY:-GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5}"
# 1 XLM in stroops (7 decimals for SAC native)
AMOUNT_STROOPS="${VIAPAY_MAINNET_AMOUNT_STROOPS:-10000000}"
FEE_STROOPS="${VIAPAY_MAINNET_FEE_STROOPS:-100000}"
NET_STROOPS=$((AMOUNT_STROOPS - FEE_STROOPS))
INTENT_TEXT="${VIAPAY_MAINNET_INTENT_ID:-pi_mainnet_evidence_001}"

DEPLOY_ADDR="$(stellar keys address "$DEPLOY_ID")"
PAYER_ADDR="$(stellar keys address "$PAYER_ID")"
if [[ -z "$MERCHANT" ]]; then
  MERCHANT="$DEPLOY_ADDR"
fi

echo "Network: mainnet (PUBLIC)"
echo "Deployer: $DEPLOY_ADDR ($DEPLOY_ID)"
echo "Payer:    $PAYER_ADDR ($PAYER_ID)"
echo "Merchant: $MERCHANT"
echo "Treasury: $TREASURY"
echo "Split:    net=$NET_STROOPS fee=$FEE_STROOPS (stroops)"

need_account() {
  local addr="$1"
  local label="$2"
  if ! curl -sf "https://horizon.stellar.org/accounts/$addr" >/dev/null; then
    echo "ERROR: $label $addr no existe en mainnet. Fondeala con XLM y reintentá."
    exit 1
  fi
  local bal
  bal="$(curl -sf "https://horizon.stellar.org/accounts/$addr" | python3 -c 'import json,sys; d=json.load(sys.stdin); print(next(b["balance"] for b in d["balances"] if b.get("asset_type")=="native"))')"
  echo "OK $label balance XLM=$bal"
}

need_account "$DEPLOY_ADDR" "deployer"
need_account "$PAYER_ADDR" "payer"
need_account "$TREASURY" "treasury"
need_account "$MERCHANT" "merchant"

WASM="$ROOT/contracts/payment-router/target/wasm32v1-none/release/payment_router.wasm"
if [[ ! -f "$WASM" ]]; then
  echo "Building wasm…"
  rustup target add wasm32v1-none >/dev/null
  stellar contract build --manifest-path "$ROOT/contracts/payment-router/Cargo.toml"
fi

if [[ -n "${PAYMENT_ROUTER_MAINNET_ID:-}" ]]; then
  CONTRACT_ID="$PAYMENT_ROUTER_MAINNET_ID"
  echo "Using existing CONTRACT_ID=$CONTRACT_ID"
else
  echo "Uploading wasm (mainnet needs higher --fee than CLI default)…"
  WASM_HASH="$(
    stellar contract upload \
      --wasm "$WASM" \
      --network mainnet \
      --source "$DEPLOY_ID" \
      --fee "${VIAPAY_MAINNET_FEE_STROOPS_TX:-50000000}" \
      --no-cache
  )"
  echo "wasm_hash=$WASM_HASH"
  echo "Deploying payment-router…"
  CONTRACT_ID="$(
    stellar contract deploy \
      --wasm-hash "$WASM_HASH" \
      --network mainnet \
      --source "$DEPLOY_ID" \
      --alias viapay-payment-router-mainnet \
      --fee "${VIAPAY_MAINNET_FEE_STROOPS_TX:-30000000}" \
      --no-cache
  )"
  echo "DEPLOYED contract_id=$CONTRACT_ID"
fi

# Native XLM as SAC on mainnet
NATIVE_SAC="$(stellar contract id asset --asset native --network mainnet)"
echo "Native SAC: $NATIVE_SAC"

INTENT_HEX="$(printf '%s' "$INTENT_TEXT" | shasum -a 256 | awk '{print $1}')"
echo "intent_id sha256=$INTENT_HEX ($INTENT_TEXT)"

echo "Invoking pay…"
OUT="$(
  stellar contract invoke \
    --id "$CONTRACT_ID" \
    --source "$PAYER_ID" \
    --network mainnet \
    --fee "${VIAPAY_MAINNET_FEE_STROOPS_TX:-10000000}" \
    --no-cache \
    --send=yes \
    -- \
    pay \
    --token "$NATIVE_SAC" \
    --payer "$PAYER_ADDR" \
    --merchant "$MERCHANT" \
    --treasury "$TREASURY" \
    --reseller null \
    --net "$NET_STROOPS" \
    --fee "$FEE_STROOPS" \
    --reseller_fee 0 \
    --intent_id "$INTENT_HEX"
)"
echo "$OUT"

echo ""
echo "=== Pegá esto en docs/submission/evidence-index.md ==="
echo "payment-router mainnet: $CONTRACT_ID"
echo "pay invoke output (busca tx hash arriba / en stellar.expert account $PAYER_ADDR)"
echo "explorer: https://stellar.expert/explorer/public/contract/$CONTRACT_ID"
echo "payer:    https://stellar.expert/explorer/public/account/$PAYER_ADDR"
echo ""
echo "Prod Vercel debe seguir en STELLAR_NETWORK=testnet."
