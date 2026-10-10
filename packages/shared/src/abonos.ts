/**
 * Abonos (installments) — product-layer ledger over payment-router.
 * Contract emits one Paid per pay(); same intent_id may appear many times
 * (no on-chain uniqueness). Full paid = sum(abonos) >= intent amount.
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

export type AbonoPay = {
  amount: string;
  amount_atomic: string;
  tx_hash: string;
  paid_at: string;
  net: string;
  fee: string;
  reseller: string;
};

export type AbonosLedger = {
  enabled: true;
  paid_atomic: string;
  pays: AbonoPay[];
};

export function readAbonos(
  metadata: Record<string, unknown> | null | undefined,
): AbonosLedger | null {
  if (!metadata || typeof metadata !== "object") return null;
  const raw = metadata.abonos;
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const o = raw as Record<string, unknown>;
  if (o.enabled !== true) return null;
  const pays = Array.isArray(o.pays) ? (o.pays as AbonoPay[]) : [];
  const paid_atomic =
    typeof o.paid_atomic === "string"
      ? o.paid_atomic
      : pays
          .reduce((acc, p) => acc + BigInt(p.amount_atomic || "0"), 0n)
          .toString();
  return { enabled: true, paid_atomic, pays };
}

export function emptyAbonosLedger(): AbonosLedger {
  return { enabled: true, paid_atomic: "0", pays: [] };
}

export function remainingAtomic(
  intentAmount: string,
  ledger: AbonosLedger | null,
): bigint {
  const total = parseAmount(intentAmount);
  const paid = BigInt(ledger?.paid_atomic ?? "0");
  const left = total - paid;
  return left > 0n ? left : 0n;
}

export function remainingAmount(
  intentAmount: string,
  ledger: AbonosLedger | null,
): string {
  return formatAmount(remainingAtomic(intentAmount, ledger));
}

export function assertAbonoAmount(
  intentAmount: string,
  ledger: AbonosLedger | null,
  payAmount: string,
  txHash?: string,
): { payUnits: bigint; remainingBefore: bigint } {
  const payUnits = parseAmount(payAmount);
  if (payUnits <= 0n) {
    throw new Error("abono amount must be > 0");
  }
  const remainingBefore = remainingAtomic(intentAmount, ledger);
  if (remainingBefore <= 0n) {
    throw new Error("intent already fully paid");
  }
  if (payUnits > remainingBefore) {
    throw new Error(
      `abono ${payAmount} exceeds remaining ${formatAmount(remainingBefore)}`,
    );
  }
  if (txHash && ledger?.pays.some((p) => p.tx_hash === txHash)) {
    throw new Error("duplicate abono tx_hash");
  }
  return { payUnits, remainingBefore };
}

export function appendAbono(
  intentAmount: string,
  ledger: AbonosLedger,
  pay: AbonoPay,
): { ledger: AbonosLedger; fullyPaid: boolean; remaining: string } {
  assertAbonoAmount(intentAmount, ledger, pay.amount, pay.tx_hash);
  const paid = BigInt(ledger.paid_atomic) + BigInt(pay.amount_atomic);
  const next: AbonosLedger = {
    enabled: true,
    paid_atomic: paid.toString(),
    pays: [...ledger.pays, pay],
  };
  const rem = remainingAtomic(intentAmount, next);
  return {
    ledger: next,
    fullyPaid: rem === 0n,
    remaining: formatAmount(rem),
  };
}
