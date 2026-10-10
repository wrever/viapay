import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Keypair } from "@stellar/stellar-sdk";
import { linkSigMessageV2 } from "@viapay/shared";
import {
  verifyLinkSignature,
  verifyLinkSignatureV2,
  verifyStoredLinkSignature,
} from "./link-sig";

describe("link-sig verify", () => {
  const merchant = Keypair.random();
  const treasury = Keypair.random();

  it("verifies v1 signed by merchant", () => {
    const payload = {
      amount: "1.0000000",
      asset: "XLM",
      network: "testnet",
      merchant_wallet: merchant.publicKey(),
    };
    const msg = Buffer.from(
      `viapay-link-v1|1.0000000|XLM|testnet|${merchant.publicKey()}`,
      "utf8",
    );
    const sig = Buffer.from(merchant.sign(msg)).toString("base64");
    assert.equal(verifyLinkSignature(payload, sig).ok, true);
  });

  it("rejects tampered v2 amount", () => {
    const payload = {
      network: "testnet",
      asset: "XLM",
      amount: "1.0000000",
      merchant: merchant.publicKey(),
      treasury: treasury.publicKey(),
      reseller: "-",
      fee_bps: 100,
      expires_unix: Math.floor(Date.now() / 1000) + 3600,
      nonce: "deadbeefdeadbeef",
    };
    const msg = Buffer.from(linkSigMessageV2(payload), "utf8");
    const sig = Buffer.from(merchant.sign(msg)).toString("base64");
    assert.equal(verifyLinkSignatureV2(payload, sig).ok, true);
    assert.equal(
      verifyLinkSignatureV2({ ...payload, amount: "2.0000000" }, sig).ok,
      false,
    );
  });

  it("marks expired v2", () => {
    const payload = {
      network: "testnet",
      asset: "XLM",
      amount: "1.0000000",
      merchant: merchant.publicKey(),
      treasury: treasury.publicKey(),
      reseller: "-",
      fee_bps: 100,
      expires_unix: 1,
      nonce: "aabbccddeeff0011",
    };
    const msg = Buffer.from(linkSigMessageV2(payload), "utf8");
    const sig = Buffer.from(merchant.sign(msg)).toString("base64");
    const r = verifyLinkSignatureV2(payload, sig, 100);
    assert.equal(r.ok, false);
    if (!r.ok) assert.equal(r.expired, true);
  });

  it("verifyStored uses v2 meta", () => {
    const expires = Math.floor(Date.now() / 1000) + 7200;
    const nonce = "1122334455667788";
    const payload = {
      network: "mainnet",
      asset: "XLM",
      amount: "5.0000000",
      merchant: merchant.publicKey(),
      treasury: treasury.publicKey(),
      reseller: "-",
      fee_bps: 100,
      expires_unix: expires,
      nonce,
    };
    const sig = Buffer.from(
      merchant.sign(Buffer.from(linkSigMessageV2(payload), "utf8")),
    ).toString("base64");
    const stored = verifyStoredLinkSignature({
      amount: "5.0000000",
      asset: "XLM",
      network: "mainnet",
      merchant_wallet: merchant.publicKey(),
      fee_bps: 100,
      reseller_address: null,
      treasury: treasury.publicKey(),
      signature: sig,
      metadata: {
        link_sig: {
          v: 2,
          nonce,
          expires_unix: expires,
          treasury: treasury.publicKey(),
          reseller: "-",
          fee_bps: 100,
          amount: "5.0000000",
        },
      },
    });
    assert.equal(stored.verified, true);
    assert.equal(stored.status, "verified");
    assert.equal(stored.version, 2);

    // Plan child can reuse parent sig when link_sig.amount is the signed total.
    const childStored = verifyStoredLinkSignature({
      amount: "1.0000000",
      asset: "XLM",
      network: "mainnet",
      merchant_wallet: merchant.publicKey(),
      fee_bps: 100,
      reseller_address: null,
      treasury: treasury.publicKey(),
      signature: sig,
      metadata: {
        link_sig: {
          v: 2,
          nonce,
          expires_unix: expires,
          treasury: treasury.publicKey(),
          reseller: "-",
          fee_bps: 100,
          amount: "5.0000000",
        },
      },
    });
    assert.equal(childStored.verified, true);
  });
});
