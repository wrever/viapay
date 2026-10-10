import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  defaultLinkSigExpiresUnix,
  generateLinkSigNonce,
  linkSigMessageV1,
  linkSigMessageV2,
  readLinkSigMeta,
} from "./link-sig";

describe("link-sig messages", () => {
  it("builds stable v1", () => {
    assert.equal(
      linkSigMessageV1({
        amount: "1.0000000",
        asset: "XLM",
        network: "testnet",
        merchant_wallet: "G".padEnd(56, "A"),
      }),
      `viapay-link-v1|1.0000000|XLM|testnet|${"G".padEnd(56, "A")}`,
    );
  });

  it("builds v2 with legs + expiry + nonce", () => {
    const msg = linkSigMessageV2({
      network: "mainnet",
      asset: "USDC",
      amount: "10.0000000",
      merchant: "G".padEnd(56, "M"),
      treasury: "G".padEnd(56, "T"),
      reseller: "-",
      fee_bps: 100,
      expires_unix: 1700000000,
      nonce: "abc123",
    });
    assert.equal(
      msg,
      `viapay-link-v2|mainnet|USDC|10.0000000|${"G".padEnd(56, "M")}|${"G".padEnd(56, "T")}|-|100|1700000000|abc123`,
    );
  });

  it("changing amount changes message", () => {
    const base = {
      network: "testnet",
      asset: "XLM",
      amount: "1.0000000",
      merchant: "G".padEnd(56, "M"),
      treasury: "G".padEnd(56, "T"),
      reseller: "-",
      fee_bps: 100,
      expires_unix: 1,
      nonce: "n",
    };
    assert.notEqual(
      linkSigMessageV2(base),
      linkSigMessageV2({ ...base, amount: "2.0000000" }),
    );
  });

  it("nonce + default expiry helpers", () => {
    const a = generateLinkSigNonce();
    const b = generateLinkSigNonce();
    assert.equal(a.length, 16);
    assert.notEqual(a, b);
    const exp = defaultLinkSigExpiresUnix(0);
    assert.equal(exp, 7 * 24 * 60 * 60);
  });

  it("reads link_sig meta v2", () => {
    const meta = readLinkSigMeta({
      link_sig: {
        v: 2,
        nonce: "n1",
        expires_unix: 99,
        treasury: "G".padEnd(56, "T"),
        reseller: "-",
        fee_bps: 100,
      },
    });
    assert.ok(meta);
    assert.equal(meta!.nonce, "n1");
    assert.equal(readLinkSigMeta({ link_sig: { v: 1 } }), null);
  });
});
