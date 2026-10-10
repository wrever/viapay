import type { PayoutShare } from "@viapay/shared";

export type AssetCode = "XLM" | "USDC";

export type ReceiveStatus = { exists: boolean; canReceive: boolean };

export type CheckoutIntent = {
  id: string;
  status: string;
  amount: string;
  amount_remaining?: string;
  amount_paid?: string;
  abonos_enabled?: boolean;
  plan_enabled?: boolean;
  plan_summary?: {
    kind: "installments";
    role: "parent" | "child";
    installment_count: number;
    installment_index: number | null;
    status: string;
    paid_count: number;
    overdue_count: number;
    next_due_at: string | null;
    next_child_id: string | null;
    next_pay_url?: string | null;
    parent_id: string | null;
  } | null;
  link_verified?: boolean | null;
  link_sig_status?: "verified" | "invalid" | "expired" | null;
  fee_amount: string;
  net_amount: string;
  fee_bps?: number;
  /** Reseller cut, when a partner brought this sale in. */
  reseller_fee_bps?: number;
  reseller_amount?: string;
  reseller_address?: string | null;
  asset: AssetCode;
  /** Settles only on this Stellar network (from payment_intent). */
  network?: "testnet" | "mainnet" | "local" | string;
  description: string | null;
  client_secret: string;
  success_url: string | null;
  cancel_url: string | null;
  stellar_tx_hash: string | null;
  merchant_wallet: string;
  treasury_wallet?: string;
  /** Same shape as x402 `viapay.breakdown`. */
  breakdown?: PayoutShare[];
  /** Unified share link (402 for agents; browsers redirect here → pay_url). */
  checkout_url?: string;
  /** Alias of checkout_url. */
  x402_url?: string;
  /** Direct hosted `/pay` UI. */
  pay_url?: string;
  settlement?: "router" | "classic";
  contract_id?: string | null;
  sep7_tx?: string | null;
  stellar?: {
    network?: "testnet" | "mainnet" | "local" | string;
    asset_issuer?: string | null;
    sep7_error?: string | null;
    payment_router?: string | null;
    receive?: {
      merchant: ReceiveStatus;
      treasury: ReceiveStatus;
      reseller?: ReceiveStatus | null;
    } | null;
  };
};
