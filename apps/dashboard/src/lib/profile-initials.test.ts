import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { profileInitials } from "./profile-initials";

describe("profileInitials", () => {
  it("uses first letters of two names", () => {
    assert.equal(profileInitials("Bruno Miranda", "b@x.com"), "BM");
  });

  it("falls back to email", () => {
    assert.equal(profileInitials("", "ab@x.com"), "AB");
  });

  it("defaults to VP", () => {
    assert.equal(profileInitials("", ""), "VP");
  });
});
