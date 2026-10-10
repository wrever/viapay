import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  buildMonthlyDueDates,
  planFullyPaid,
  splitInstallmentAmounts,
  summarizePlan,
  type PlanMeta,
} from "./plan";

describe("plan installments", () => {
  it("splits 10 into 3 summing to total", () => {
    const parts = splitInstallmentAmounts("10.0000000", 3);
    assert.equal(parts.length, 3);
    // 10e7 / 3 = 33333333 rem 1 → 3.3333334 + 3.3333333 + 3.3333333
    assert.equal(parts[0], "3.3333334");
    assert.equal(parts[1], "3.3333333");
    assert.equal(parts[2], "3.3333333");
  });

  it("rejects bad N", () => {
    assert.throws(() => splitInstallmentAmounts("1.0000000", 1));
    assert.throws(() => splitInstallmentAmounts("1.0000000", 25));
  });

  it("builds monthly dues", () => {
    const start = new Date("2026-01-15T12:00:00.000Z");
    const dues = buildMonthlyDueDates(3, start);
    assert.equal(dues[0], "2026-01-15T12:00:00.000Z");
    assert.equal(dues[1], "2026-02-15T12:00:00.000Z");
    assert.equal(dues[2], "2026-03-15T12:00:00.000Z");
  });

  it("summarizes paid / overdue / next", () => {
    const plan: PlanMeta = {
      kind: "installments",
      parent_id: null,
      installment_index: null,
      installment_count: 3,
      status: "active",
      schedule: [
        {
          index: 1,
          amount: "1.0000000",
          due_at: "2020-01-01T00:00:00.000Z",
          child_id: "pi_a",
        },
        {
          index: 2,
          amount: "1.0000000",
          due_at: "2099-01-01T00:00:00.000Z",
          child_id: "pi_b",
        },
        {
          index: 3,
          amount: "1.0000000",
          due_at: "2099-02-01T00:00:00.000Z",
          child_id: "pi_c",
        },
      ],
    };
    const s = summarizePlan(plan, {
      pi_a: "succeeded",
      pi_b: "requires_payment",
      pi_c: "requires_payment",
    });
    assert.equal(s.paid_count, 1);
    assert.equal(s.overdue_count, 0);
    assert.equal(s.next_child_id, "pi_b");
    assert.equal(
      planFullyPaid(plan, {
        pi_a: "succeeded",
        pi_b: "succeeded",
        pi_c: "succeeded",
      }),
      true,
    );
  });
});
