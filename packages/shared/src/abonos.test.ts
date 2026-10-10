import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  appendAbono,
  assertAbonoAmount,
  emptyAbonosLedger,
  remainingAmount,
} from "./abonos";

describe("abonos ledger", () => {
  it("tracks remaining across two pays", () => {
    let ledger = emptyAbonosLedger();
    assert.equal(remainingAmount("1.0000000", ledger), "1.0000000");
    const a = appendAbono("1.0000000", ledger, {
      amount: "0.4000000",
      amount_atomic: "4000000",
      tx_hash: "aaa",
      paid_at: "t1",
      net: "0.3960000",
      fee: "0.0040000",
      reseller: "0.0000000",
    });
    assert.equal(a.fullyPaid, false);
    assert.equal(a.remaining, "0.6000000");
    ledger = a.ledger;
    const b = appendAbono("1.0000000", ledger, {
      amount: "0.6000000",
      amount_atomic: "6000000",
      tx_hash: "bbb",
      paid_at: "t2",
      net: "0.5940000",
      fee: "0.0060000",
      reseller: "0.0000000",
    });
    assert.equal(b.fullyPaid, true);
    assert.equal(b.remaining, "0.0000000");
  });

  it("rejects overpay and duplicate tx", () => {
    const ledger = emptyAbonosLedger();
    assert.throws(() => assertAbonoAmount("1.0000000", ledger, "2.0000000"));
    const mid = appendAbono("1.0000000", ledger, {
      amount: "0.5000000",
      amount_atomic: "5000000",
      tx_hash: "dup",
      paid_at: "t",
      net: "0.4950000",
      fee: "0.0050000",
      reseller: "0.0000000",
    }).ledger;
    assert.throws(() =>
      assertAbonoAmount("1.0000000", mid, "0.1000000", "dup"),
    );
  });
});
