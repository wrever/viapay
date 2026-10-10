import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { shouldRemindPlanChild } from "./notify-plan-reminder";
import type { PaymentIntentRow } from "./payments";

function baseRow(
  overrides: Partial<PaymentIntentRow> & {
    metadata: Record<string, unknown>;
  },
): PaymentIntentRow {
  return {
    id: "pi_child",
    account_id: "acc",
    status: "requires_payment",
    amount: "1.0000000",
    fee_amount: "0.0100000",
    net_amount: "0.9900000",
    fee_bps: 100,
    reseller_fee_bps: 0,
    reseller_amount: "0.0000000",
    reseller_address: null,
    asset_code: "XLM",
    network: "testnet",
    merchant_wallet: "G".padEnd(56, "M"),
    description: null,
    external_user_id: null,
    client_secret: "cs",
    success_url: null,
    cancel_url: null,
    stellar_tx_hash: null,
    expires_at: "2099-01-01T00:00:00.000Z",
    succeeded_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

describe("shouldRemindPlanChild", () => {
  it("reminds overdue unpaid child", () => {
    const row = baseRow({
      metadata: {
        plan: {
          kind: "installments",
          parent_id: "pi_parent",
          installment_index: 1,
          installment_count: 2,
          status: "active",
          schedule: [
            {
              index: 1,
              amount: "1.0000000",
              due_at: "2020-01-01T00:00:00.000Z",
              child_id: "pi_child",
            },
          ],
        },
      },
    });
    assert.equal(shouldRemindPlanChild(row, Date.parse("2026-01-01")).remind, true);
  });

  it("respects cooldown", () => {
    const now = Date.parse("2026-06-01T00:00:00.000Z");
    const row = baseRow({
      metadata: {
        plan: {
          kind: "installments",
          parent_id: "pi_parent",
          installment_index: 1,
          installment_count: 2,
          status: "active",
          last_reminder_at: new Date(now - 3600_000).toISOString(),
          schedule: [
            {
              index: 1,
              amount: "1.0000000",
              due_at: "2020-01-01T00:00:00.000Z",
              child_id: "pi_child",
            },
          ],
        },
      },
    });
    assert.equal(shouldRemindPlanChild(row, now).remind, false);
  });
});
