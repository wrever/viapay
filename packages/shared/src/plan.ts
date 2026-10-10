/**
 * Installment plans — product-layer debt schedule over payment_intents.
 * Parent holds the schedule; each child is a normal one-shot intent (one Paid).
 */

function parseAmount(amount: string, decimals = 7): bigint {
  const cleaned = amount.trim();
  if (!/^\d+(\.\d+)?$/.test(cleaned)) {
    throw new Error("Invalid amount");
  }
  const [whole, frac = ""] = cleaned.split(".");
  const fracPadded = (frac + "0".repeat(decimals)).slice(0, decimals);
  return BigInt(whole) * 10n ** BigInt(decimals) + BigInt(fracPadded || "0");
}

function formatAmount(units: bigint, decimals = 7): string {
  const neg = units < 0n;
  const v = neg ? -units : units;
  const base = 10n ** BigInt(decimals);
  const whole = v / base;
  const frac = (v % base).toString().padStart(decimals, "0");
  return `${neg ? "-" : ""}${whole}.${frac}`;
}

export const PLAN_INSTALLMENTS_MIN = 2;
export const PLAN_INSTALLMENTS_MAX = 24;

export type PlanScheduleEntry = {
  index: number;
  amount: string;
  due_at: string;
  child_id: string;
};

export type PlanMeta = {
  kind: "installments";
  /** null on parent; parent id on children. */
  parent_id: string | null;
  installment_index: number | null;
  installment_count: number;
  schedule: PlanScheduleEntry[];
  status: "active" | "completed" | "canceled";
  last_reminder_at?: string | null;
};

export type PlanSummary = {
  kind: "installments";
  role: "parent" | "child";
  installment_count: number;
  installment_index: number | null;
  status: PlanMeta["status"];
  paid_count: number;
  overdue_count: number;
  next_due_at: string | null;
  next_child_id: string | null;
  schedule: PlanScheduleEntry[];
  parent_id: string | null;
};

export function assertInstallmentCount(n: number): void {
  if (
    !Number.isInteger(n) ||
    n < PLAN_INSTALLMENTS_MIN ||
    n > PLAN_INSTALLMENTS_MAX
  ) {
    throw new Error(
      `plan.installments debe ser entero entre ${PLAN_INSTALLMENTS_MIN} y ${PLAN_INSTALLMENTS_MAX}`,
    );
  }
}

/** Split total into N amounts that sum exactly (remainder on earliest cuotas). */
export function splitInstallmentAmounts(
  totalAmount: string,
  n: number,
): string[] {
  assertInstallmentCount(n);
  const total = parseAmount(totalAmount);
  if (total <= 0n) throw new Error("plan amount must be > 0");
  const base = total / BigInt(n);
  const rem = total % BigInt(n);
  const out: string[] = [];
  for (let i = 0; i < n; i++) {
    const units = base + (BigInt(i) < rem ? 1n : 0n);
    if (units <= 0n) throw new Error("plan cuota amount must be > 0");
    out.push(formatAmount(units));
  }
  return out;
}

/** Monthly due dates starting at startAt (UTC). */
export function buildMonthlyDueDates(
  count: number,
  startAt: Date = new Date(),
): string[] {
  assertInstallmentCount(count);
  const dates: string[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(startAt.getTime());
    d.setUTCMonth(d.getUTCMonth() + i);
    dates.push(d.toISOString());
  }
  return dates;
}

export function readPlan(
  metadata: Record<string, unknown> | null | undefined,
): PlanMeta | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.plan;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.kind !== "installments") return null;
  const count = Number(o.installment_count);
  if (!Number.isInteger(count) || count < 1) return null;
  const schedule = Array.isArray(o.schedule)
    ? (o.schedule as PlanScheduleEntry[])
    : [];
  const status =
    o.status === "completed" || o.status === "canceled" ? o.status : "active";
  return {
    kind: "installments",
    parent_id: typeof o.parent_id === "string" ? o.parent_id : null,
    installment_index:
      typeof o.installment_index === "number" ? o.installment_index : null,
    installment_count: count,
    schedule,
    status,
    last_reminder_at:
      typeof o.last_reminder_at === "string" ? o.last_reminder_at : null,
  };
}

export function isPlanParent(plan: PlanMeta): boolean {
  return plan.parent_id == null && plan.installment_index == null;
}

export function isPlanChild(plan: PlanMeta): boolean {
  return typeof plan.parent_id === "string" && plan.parent_id.length > 0;
}

export type ChildStatusMap = Record<string, string>;

export function summarizePlan(
  plan: PlanMeta,
  childStatuses: ChildStatusMap,
  nowMs = Date.now(),
): PlanSummary {
  let paid_count = 0;
  let overdue_count = 0;
  let next_due_at: string | null = null;
  let next_child_id: string | null = null;

  for (const entry of plan.schedule) {
    const st = childStatuses[entry.child_id] ?? "requires_payment";
    if (st === "succeeded") {
      paid_count += 1;
      continue;
    }
    const due = Date.parse(entry.due_at);
    if (Number.isFinite(due) && due <= nowMs) overdue_count += 1;
    if (!next_child_id) {
      next_child_id = entry.child_id;
      next_due_at = entry.due_at;
    }
  }

  return {
    kind: "installments",
    role: isPlanParent(plan) ? "parent" : "child",
    installment_count: plan.installment_count,
    installment_index: plan.installment_index,
    status: plan.status,
    paid_count,
    overdue_count,
    next_due_at,
    next_child_id,
    schedule: plan.schedule,
    parent_id: plan.parent_id,
  };
}

export function planFullyPaid(
  plan: PlanMeta,
  childStatuses: ChildStatusMap,
): boolean {
  if (plan.schedule.length === 0) return false;
  return plan.schedule.every(
    (e) => (childStatuses[e.child_id] ?? "") === "succeeded",
  );
}
