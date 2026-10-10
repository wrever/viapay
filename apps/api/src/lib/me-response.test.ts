import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { AccountProfile } from "./account-profile";
import { meResponse } from "./me-response";

describe("meResponse", () => {
  it("wraps account under account key", () => {
    const account = {
      id: "acct_x",
      name: "A",
      email: "a@b.c",
      business_name: null,
      phone_e164: null,
      notify_email_paid: true,
      notify_wa_paid: true,
      status: "active",
      created_at: "t",
      updated_at: "t",
      merchant_wallet: null,
    } satisfies AccountProfile;
    assert.deepEqual(meResponse(account), { account });
  });
});
