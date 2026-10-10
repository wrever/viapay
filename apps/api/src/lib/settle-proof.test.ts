import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildSettleProofPayload,
  signSettleProof,
  verifySettleProofSignature,
} from "./settle-proof";
import type { PaymentIntentRow } from "./payments";

const row: PaymentIntentRow = {
  id: "pi_proof_test",
  account_id: "acc",
  status: "succeeded",
  amount: "10.0000000",
  fee_amount: "0.1000000",
  net_amount: "9.9000000",
  fee_bps: 100,
  reseller_fee_bps: 0,
  reseller_amount: "0.0000000",
  reseller_address: null,
  asset_code: "XLM",
  network: "testnet",
  merchant_wallet: "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5",
  description: null,
  external_user_id: null,
  metadata: { cobro_code: "VP-AAAA" },
  client_secret: "cs",
  success_url: null,
  cancel_url: null,
  stellar_tx_hash: "a".repeat(64),
  expires_at: new Date().toISOString(),
  succeeded_at: new Date().toISOString(),
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
};

describe("settle-proof", () => {
  it("signs and verifies payload", () => {
    const body = buildSettleProofPayload(row);
    assert.equal(body.proof_or_nothing, true);
    assert.equal(body.short_code, "VP-AAAA");
    const sig = signSettleProof(body);
    assert.equal(verifySettleProofSignature(body, sig), true);
    assert.equal(verifySettleProofSignature(body, "00".repeat(32)), false);
  });
});
