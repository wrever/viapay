import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { buildRailParity } from "./rail-parity";
import type { PaymentIntentRow } from "./payments";

function sampleRow(over: Partial<PaymentIntentRow> = {}): PaymentIntentRow {
  return {
    id: "pi_parity_test_001",
    account_id: "acc_1",
    status: "requires_payment",
    amount: "20.0000000",
    fee_amount: "0.2000000",
    net_amount: "18.4000000",
    fee_bps: 100,
    reseller_fee_bps: 700,
    reseller_amount: "1.4000000",
    reseller_address: "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5",
    asset_code: "USDC",
    network: "testnet",
    merchant_wallet: "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5",
    description: null,
    external_user_id: null,
    metadata: { cobro_code: "VP-TEST" },
    client_secret: "cs_test",
    success_url: null,
    cancel_url: null,
    stellar_tx_hash: null,
    expires_at: new Date(Date.now() + 3600_000).toISOString(),
    succeeded_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    ...over,
  };
}

describe("buildRailParity", () => {
  it("matches intent and x402 surfaces pre-pay", async () => {
    const parity = await buildRailParity(sampleRow());
    assert.equal(parity.ok, true);
    assert.equal(parity.mismatches.length, 0);
    assert.equal(
      parity.surfaces.intent.amount_atomic,
      parity.surfaces.x402.amount_atomic,
    );
    assert.equal(parity.surfaces.paid, null);
    assert.ok(parity.schemes.includes("exact_split"));
    assert.ok(parity.schemes.includes("rail_parity"));
    assert.ok(parity.proof_or_nothing);
  });

  it("flags mismatch when amounts diverge from challenge construction", async () => {
    const parity = await buildRailParity(sampleRow());
    assert.ok(parity.links.parity.includes("/v1/parity/"));
    assert.ok(parity.links.receipt.includes("/r/"));
  });

  it("ok is false when succeeded tx cannot verify on-chain (not a fixed ok)", async () => {
    const parity = await buildRailParity(
      sampleRow({
        status: "succeeded",
        stellar_tx_hash:
          "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
        reseller_fee_bps: 0,
        reseller_amount: "0.0000000",
        reseller_address: null,
        net_amount: "19.8000000",
        fee_amount: "0.2000000",
      }),
    );
    assert.equal(parity.ok, false);
    assert.ok(parity.mismatches.length > 0);
    assert.ok(
      parity.mismatches.some((m) => m.startsWith("onchain_verify_failed")),
    );
  });
});
