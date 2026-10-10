import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { accountProfilePatchSchema } from "./account-profile-patch";

describe("accountProfilePatchSchema", () => {
  it("accepts name-only patch", () => {
    const parsed = accountProfilePatchSchema.parse({ name: "Bruno" });
    assert.equal(parsed.name, "Bruno");
  });

  it("rejects empty object", () => {
    assert.throws(() => accountProfilePatchSchema.parse({}));
  });

  it("accepts nullable business_name", () => {
    const parsed = accountProfilePatchSchema.parse({ business_name: null });
    assert.equal(parsed.business_name, null);
  });
});
