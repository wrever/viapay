import assert from "node:assert/strict";
import { describe, it } from "node:test";

/** Smoke: module path resolves (network calls covered in UI). */
describe("me-client module", () => {
  it("exports fetch and patch helpers", async () => {
    const mod = await import("./me-client");
    assert.equal(typeof mod.fetchAccountProfile, "function");
    assert.equal(typeof mod.patchAccountProfile, "function");
  });
});
