import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { cryptoAmountFromFiat, isFiatCode } from "./exact-pay";

describe("exact-pay", () => {
  it("accepts LatAm fiat codes", () => {
    assert.equal(isFiatCode("CLP"), true);
    assert.equal(isFiatCode("clp"), true);
    assert.equal(isFiatCode("XYZ"), false);
  });

  it("locks crypto from fiat/rate", () => {
    // 10_000 CLP, 1 XLM = 100 CLP → 100 XLM
    assert.equal(cryptoAmountFromFiat(10_000, 100), "100.0000000");
  });

  it("floors tiny amounts to 7 decimals", () => {
    const a = cryptoAmountFromFiat(1, 3);
    assert.match(a, /^\d+\.\d{7}$/);
    assert.ok(Number(a) > 0);
  });
});
