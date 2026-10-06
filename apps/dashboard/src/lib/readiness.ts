/** Subset of GET /v1/readiness used by the merchant panel. */
export type ReceiveStatus = { exists: boolean; canReceive: boolean };

export type Readiness = {
  network: string;
  fee_bps?: number;
  merchant_wallet: string | null;
  usdc_issuer?: string;
  merchant?: {
    xlm: ReceiveStatus;
    usdc: ReceiveStatus;
  };
  treasury?: {
    xlm: ReceiveStatus;
    usdc: ReceiveStatus;
  };
};
