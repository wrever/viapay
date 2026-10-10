import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  planNotifyChannels,
  readInvoiceMeta,
} from "./notify-succeeded";

describe("readInvoiceMeta", () => {
  it("reads phone and email from metadata.invoice", () => {
    const inv = readInvoiceMeta({
      invoice: {
        recipient_name: "Juan",
        phone_e164: "+56912345678",
        email: "a@b.com",
        channel: "whatsapp",
      },
    });
    assert.ok(inv);
    assert.equal(inv!.phone_e164, "+56912345678");
    assert.equal(inv!.email, "a@b.com");
    assert.equal(inv!.recipient_name, "Juan");
  });

  it("returns null without invoice", () => {
    assert.equal(readInvoiceMeta(null), null);
    assert.equal(readInvoiceMeta({}), null);
  });
});

describe("planNotifyChannels", () => {
  it("plans merchant + payer channels", () => {
    const plan = planNotifyChannels({
      merchantWa: "+56911111111",
      merchantEmail: "shop@x.com",
      invoice: {
        phone_e164: "+56922222222",
        email: "buyer@x.com",
        recipient_name: "Buyer",
      },
    });
    assert.equal(plan.merchantWa, "+56911111111");
    assert.equal(plan.merchantEmail, "shop@x.com");
    assert.equal(plan.payerWa, "+56922222222");
    assert.equal(plan.payerEmail, "buyer@x.com");
  });

  it("skips payer when no invoice", () => {
    const plan = planNotifyChannels({
      merchantWa: null,
      merchantEmail: "shop@x.com",
      invoice: null,
    });
    assert.equal(plan.payerWa, null);
    assert.equal(plan.payerEmail, null);
    assert.equal(plan.merchantEmail, "shop@x.com");
  });
});
