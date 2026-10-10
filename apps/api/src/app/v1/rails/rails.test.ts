import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { GET } from "./route";

describe("GET /v1/rails", () => {
  it("returns settlement infrastructure manifest", async () => {
    const res = await GET();
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.product, "ViaPay");
    assert.equal(body.role, "settlement_infrastructure");
    assert.equal(body.primitive, "payment_intent");
    assert.ok(body.verify?.url);
    assert.ok(body.agent?.mcp?.tools?.length >= 3);
    assert.ok(body.onchain?.networks?.mainnet);
    assert.ok(
      body.consumers?.some((c: { path: string }) =>
        c.path.includes("verify-settlement"),
      ),
    );
    assert.equal(body.cli?.verify, "pnpm verify");
    assert.ok(body.notifications?.on_succeeded?.includes("https_webhooks"));
    assert.ok(body.spec?.includes("PAYMENT_INTENT"));
    assert.ok(body.schemes?.exact_pay);
    assert.ok(body.invariants?.rail_parity);
    assert.ok(body.invariants?.proof_or_nothing);
    assert.ok(body.invariants?.exact_split);
    assert.ok(body.product_surfaces?.receipt);
    assert.ok(body.parity?.url_pattern);
    assert.ok(
      body.agent?.mcp?.tools?.some(
        (t: { name: string }) => t.name === "viapay_parity",
      ),
    );
  });
});
