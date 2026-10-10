import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { verifyRouterPayTx } from "@viapay/stellar";

const MAINNET_PAY_THIRD =
  "83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f";
const MAINNET_PAY_SELF =
  "b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e";
const MAINNET_ROUTER =
  "CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U";
const TREASURY = "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5";
const MERCHANT_THIRD =
  "GCXXPBS3OZ2ELAY4BOHNEWHGEPYNRZHPFCPICVVMNCYXPH3XPEBEMLFI";

describe("verifyRouterPayTx (mainnet live)", () => {
  it("decodes third-party merchant pay (merchant ≠ treasury)", async () => {
    const r = await verifyRouterPayTx({
      network: "mainnet",
      txHash: MAINNET_PAY_THIRD,
      expectedContractId: MAINNET_ROUTER,
    });
    assert.equal(r.verified, true);
    assert.equal(r.contract_id, MAINNET_ROUTER);
    assert.equal(r.merchant, MERCHANT_THIRD);
    assert.equal(r.treasury, TREASURY);
    assert.notEqual(r.merchant, r.treasury);
    assert.equal(r.net, "0.0990000");
    assert.equal(r.fee, "0.0010000");
    assert.equal(r.event, "Paid");
  });

  it("still decodes earlier self-pay evidence", async () => {
    const r = await verifyRouterPayTx({
      network: "mainnet",
      txHash: MAINNET_PAY_SELF,
      expectedContractId: MAINNET_ROUTER,
    });
    assert.equal(r.verified, true);
    assert.equal(r.event, "Paid");
    assert.equal(r.merchant, r.treasury);
  });
});
