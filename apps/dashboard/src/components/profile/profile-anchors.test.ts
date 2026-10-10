import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { PROFILE_ANCHORS } from "./profile-anchors";

describe("PROFILE_ANCHORS", () => {
  it("includes identity and password sections", () => {
    assert.ok(PROFILE_ANCHORS.includes("profile-identity"));
    assert.ok(PROFILE_ANCHORS.includes("profile-password"));
  });

  it("has five subsection anchors", () => {
    assert.equal(PROFILE_ANCHORS.length, 5);
  });
});
