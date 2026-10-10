import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { isValidE164, sanitizePhoneInput } from "./phone-e164";

describe("phone-e164", () => {
  it("prefixes digits with +", () => {
    assert.equal(sanitizePhoneInput("56912345678"), "+56912345678");
  });

  it("keeps a leading plus", () => {
    assert.equal(sanitizePhoneInput("+56 9 1234 5678"), "+56912345678");
  });

  it("returns empty for blank", () => {
    assert.equal(sanitizePhoneInput("   "), "");
  });

  it("validates E.164 length", () => {
    assert.equal(isValidE164("+56912345678"), true);
    assert.equal(isValidE164("+12"), false);
    assert.equal(isValidE164("56912345678"), false);
  });
});
