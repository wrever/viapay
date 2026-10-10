import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AccountProfilePatch } from "./account-profile";

/** Pure validation mirrors used by updateAccountProfile (no DB). */
function validateName(name: string): string {
  const n = name.trim();
  if (n.length < 1 || n.length > 80) {
    throw Object.assign(new Error("name inválido (1–80)"), { status: 400 });
  }
  return n;
}

function validatePhone(phone: string | null): string | null {
  const v = phone?.trim() || null;
  if (v && !/^\+[1-9]\d{6,14}$/.test(v)) {
    throw Object.assign(new Error("phone_e164 inválido (E.164)"), {
      status: 400,
    });
  }
  return v;
}

describe("account profile validation", () => {
  it("accepts a normal display name", () => {
    assert.equal(validateName("  Bruno Miranda  "), "Bruno Miranda");
  });

  it("rejects empty name", () => {
    assert.throws(() => validateName("   "), /name inválido/);
  });

  it("accepts E.164 phone", () => {
    assert.equal(validatePhone("+56912345678"), "+56912345678");
  });

  it("rejects local phone without +", () => {
    assert.throws(() => validatePhone("912345678"), /E\.164/);
  });

  it("allows clearing phone with null", () => {
    assert.equal(validatePhone(null), null);
  });

  it("patch shape allows partial updates", () => {
    const patch: AccountProfilePatch = { notify_email_paid: false };
    assert.equal(patch.notify_email_paid, false);
  });
});
