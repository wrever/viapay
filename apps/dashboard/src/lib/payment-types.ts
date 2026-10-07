import { parseAssetAmount } from "@viapay/shared";

export type InvoiceMeta = {
  contact_id?: string;
  recipient_name?: string;
  channel?: string;
  source?: string;
  phone_e164?: string | null;
  email?: string | null;
};

export type DashboardPayment = {
  id: string;
  status: string;
  amount: string;
  fee_amount: string;
  net_amount: string;
  reseller_fee_bps?: number;
  reseller_amount?: string;
  reseller_address?: string | null;
  asset: string;
  description: string | null;
  external_user_id?: string | null;
  metadata?: { invoice?: InvoiceMeta } | null;
  checkout_url: string;
  created_at: string;
  stellar_tx_hash?: string | null;
};

export function invoiceRecipient(p: DashboardPayment): string | null {
  const inv = p.metadata?.invoice;
  if (inv?.recipient_name) {
    const via = inv.source === "whatsapp" ? "WhatsApp" : inv.channel ?? null;
    return via ? `${inv.recipient_name} · ${via}` : inv.recipient_name;
  }
  return null;
}

export type AssetTotals = {
  asset: string;
  gross: bigint;
  net: bigint;
  fees: bigint;
  pendingGross: bigint;
};

export type DashboardPaymentStats = {
  total: number;
  succeeded: number;
  pending: number;
  canceledOrExpired: number;
  byAsset: AssetTotals[];
};

function addToMap(
  map: Map<string, AssetTotals>,
  asset: string,
  patch: Partial<Omit<AssetTotals, "asset">>,
) {
  const cur = map.get(asset) ?? {
    asset,
    gross: 0n,
    net: 0n,
    fees: 0n,
    pendingGross: 0n,
  };
  map.set(asset, {
    asset,
    gross: cur.gross + (patch.gross ?? 0n),
    net: cur.net + (patch.net ?? 0n),
    fees: cur.fees + (patch.fees ?? 0n),
    pendingGross: cur.pendingGross + (patch.pendingGross ?? 0n),
  });
}

export type StatsPeriod = "today" | "month" | "all";

export function filterPaymentsByPeriod(
  payments: DashboardPayment[],
  period: StatsPeriod,
  now = new Date(),
): DashboardPayment[] {
  if (period === "all") return payments;
  const start =
    period === "today"
      ? new Date(now.getFullYear(), now.getMonth(), now.getDate())
      : new Date(now.getFullYear(), now.getMonth(), 1);
  const startMs = start.getTime();
  return payments.filter((p) => {
    const t = Date.parse(p.created_at);
    return Number.isFinite(t) && t >= startMs;
  });
}

export function computePaymentStats(
  payments: DashboardPayment[],
): DashboardPaymentStats {
  let succeeded = 0;
  let pending = 0;
  let canceledOrExpired = 0;
  const byAsset = new Map<string, AssetTotals>();

  for (const p of payments) {
    let amount = 0n;
    let net = 0n;
    let fee = 0n;
    try {
      amount = parseAssetAmount(p.amount);
      net = parseAssetAmount(p.net_amount);
      fee = parseAssetAmount(p.fee_amount);
    } catch {
      // ignore malformed rows
    }

    if (p.status === "succeeded") {
      succeeded += 1;
      addToMap(byAsset, p.asset, { gross: amount, net, fees: fee });
    } else if (p.status === "requires_payment") {
      pending += 1;
      addToMap(byAsset, p.asset, { pendingGross: amount });
    } else if (p.status === "canceled" || p.status === "expired") {
      canceledOrExpired += 1;
    }
  }

  return {
    total: payments.length,
    succeeded,
    pending,
    canceledOrExpired,
    byAsset: [...byAsset.values()].sort((a, b) => a.asset.localeCompare(b.asset)),
  };
}
