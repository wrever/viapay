import assert from "node:assert/strict";
import { describe, it } from "node:test";

describe("session-name-client", () => {
  it("exports syncSessionDisplayName", async () => {
    const mod = await import("./session-name-client");
    assert.equal(typeof mod.syncSessionDisplayName, "function");
  });
});
