#!/usr/bin/env node
/**
 * Third-party style consumer: verify a ViaPay settlement without an API key.
 * Mirrors what an integrator / agent would call after seeing a tx hash.
 *
 *   node examples/verify-settlement.mjs
 *   node examples/verify-settlement.mjs <tx_hash> [mainnet|testnet]
 */
const API = process.env.VIAPAY_API_PUBLIC_URL || "https://viapay-api.vercel.app";
const DEFAULT_TX =
  "b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e";

const tx = (process.argv[2] || DEFAULT_TX).toLowerCase().replace(/^0x/, "");
const network = process.argv[3] || "mainnet";
const url = `${API.replace(/\/$/, "")}/v1/verify?network=${encodeURIComponent(network)}&tx_hash=${encodeURIComponent(tx)}`;

const res = await fetch(url);
const body = await res.json().catch(() => ({}));
if (!res.ok || !body.verified) {
  console.error("verify failed", res.status, body);
  process.exit(1);
}
console.log(
  JSON.stringify(
    {
      verified: body.verified,
      network: body.network,
      contract_id: body.contract_id,
      merchant: body.merchant,
      treasury: body.treasury,
      net: body.net,
      fee: body.fee,
      reseller_fee: body.reseller_fee,
      explorer_tx: body.explorer_tx,
    },
    null,
    2,
  ),
);
