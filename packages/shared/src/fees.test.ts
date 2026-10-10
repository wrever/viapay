import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  assertFeeBps,
  calcFeeSplit,
  formatAssetAmount,
  parseAssetAmount,
} from "./index";

describe("calcFeeSplit", () => {
  it("splits 20 USDC with 1% ViaPay and 7% reseller", () => {
    const units = parseAssetAmount("20");
    const split = calcFeeSplit(units, 100, 700);
    assert.equal(formatAssetAmount(split.viaFee), "0.2000000");
    assert.equal(formatAssetAmount(split.resellerFee), "1.4000000");
    assert.equal(formatAssetAmount(split.net), "18.4000000");
    assert.equal(split.net + split.viaFee + split.resellerFee, units);
  });

  it("merchant absorbs remainder so legs sum to total", () => {
    const units = 100n;
    const split = calcFeeSplit(units, 100, 300);
    assert.equal(split.net + split.viaFee + split.resellerFee, units);
  });

  it("no reseller keeps 99/1", () => {
    const units = parseAssetAmount("10");
    const split = calcFeeSplit(units, 100, 0);
    assert.equal(split.resellerFee, 0n);
    assert.equal(split.viaFee + split.net, units);
  });
});

describe("assertFeeBps", () => {
  it("rejects fees that leave merchant nothing", () => {
    assert.throws(() => assertFeeBps(100, 9900));
  });

  it("allows via 1% + reseller 7%", () => {
    assert.doesNotThrow(() => assertFeeBps(100, 700));
  });

  it("rejects via alone at 100%", () => {
    assert.throws(() => assertFeeBps(10000, 0));
  });

  it("rejects negative reseller", () => {
    assert.throws(() => assertFeeBps(100, -1));
  });
});

describe("calcFeeSplit adversarial", () => {
  it("1 stroop total still sums", () => {
    const split = calcFeeSplit(1n, 100, 0);
    assert.equal(split.net + split.viaFee + split.resellerFee, 1n);
  });

  it("huge amount with reseller still sums", () => {
    const units = parseAssetAmount("999999.9999999");
    const split = calcFeeSplit(units, 100, 2500);
    assert.equal(split.net + split.viaFee + split.resellerFee, units);
    assert.ok(split.net > 0n);
  });
});
