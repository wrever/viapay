/** Subset of GET /v1/readiness used by the merchant panel. */
export type Readiness = {
  network: string;
  fee_bps?: number;
  merchant_wallet: string | null;
};
