import {
  parseAssetAmount,
  type AssetCode,
} from "@viapay/shared";
import {
  Account,
  Asset,
  BASE_FEE,
  Horizon,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  TransactionFailedError,
} from "@stellar/stellar-sdk";

export type Network = "testnet" | "mainnet" | "local";

/** Circle USDC issuers. Testnet value matches official Stellar docs (2026). */
export const USDC_ISSUERS = {
  testnet: "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  mainnet: "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN",
} as const;

export const NETWORKS = {
  testnet: {
    horizonUrl: "https://horizon-testnet.stellar.org",
    rpcUrl: "https://soroban-testnet.stellar.org",
    networkPassphrase: Networks.TESTNET,
    usdcIssuer: USDC_ISSUERS.testnet,
    friendbotUrl: "https://friendbot.stellar.org",
  },
  mainnet: {
    horizonUrl: "https://horizon.stellar.org",
    rpcUrl: "https://soroban.stellar.org",
    networkPassphrase: Networks.PUBLIC,
    usdcIssuer: USDC_ISSUERS.mainnet,
    friendbotUrl: null,
  },
  local: {
    horizonUrl: "http://localhost:8000",
    rpcUrl: "http://localhost:8000/soroban/rpc",
    networkPassphrase: Networks.STANDALONE,
    usdcIssuer: USDC_ISSUERS.testnet,
    friendbotUrl: null,
  },
} as const;

export type SplitLeg = {
  source: string;
  merchant: string;
  treasury: string;
  /** Reseller that brought this merchant in. Null when there is none. */
  reseller?: string | null;
  asset: AssetCode;
  assetIssuer?: string | null;
  netAmount: string;
  /** ViaPay's own fee, to the treasury. */
  feeAmount: string;
  /** The reseller's cut. "0" or null when there is no reseller. */
  resellerAmount?: string | null;
  memo: string;
  network: Network;
};

type PayoutLeg = {
  destination: string;
  amount: string;
  role: "comercio" | "tesorería" | "revendedor";
};

/** The payments a split actually has to make, in order, skipping zero legs. */
export function payoutLegs(input: {
  merchant: string;
  treasury: string;
  reseller?: string | null;
  netAmount: string;
  feeAmount: string;
  resellerAmount?: string | null;
}): PayoutLeg[] {
  const legs: PayoutLeg[] = [
    { destination: input.merchant, amount: input.netAmount, role: "comercio" },
    { destination: input.treasury, amount: input.feeAmount, role: "tesorería" },
  ];
  if (input.reseller && input.resellerAmount) {
    legs.push({
      destination: input.reseller,
      amount: input.resellerAmount,
      role: "revendedor",
    });
  }
  return legs.filter((leg) => parseAssetAmount(leg.amount) > 0n);
}

const RESULT_HINTS: Record<string, string> = {
  tx_bad_seq:
    "La secuencia de la cuenta cambió. Vuelve a conectar y firma de nuevo.",
  tx_bad_auth: "La firma no corresponde a la cuenta que paga.",
  tx_insufficient_fee: "Fee de red insuficiente.",
  tx_insufficient_balance: "Saldo insuficiente para la fee de red.",
  op_underfunded:
    "Saldo insuficiente. En testnet fondea XLM con Friendbot o USDC en https://faucet.circle.com",
  op_no_trust:
    "Falta la trustline de USDC en el comercio o en la tesorería.",
  op_src_no_trust: "Tu cuenta no tiene trustline de USDC.",
  op_no_destination:
    "La cuenta destino no existe en esta red. Debe estar fondeada antes de recibir.",
  op_no_issuer: "El issuer del asset no existe en esta red.",
};

export function networkConfig(network: Network) {
  return NETWORKS[network];
}

export function assetFor(
  code: AssetCode,
  issuer?: string | null,
  network: Network = "testnet",
): Asset {
  if (code === "XLM") return Asset.native();
  const resolved = issuer || NETWORKS[network].usdcIssuer;
  if (!resolved) throw new Error("USDC issuer missing");
  return new Asset(code, resolved);
}

export function horizonServer(network: Network) {
  const { horizonUrl } = NETWORKS[network];
  return new Horizon.Server(horizonUrl, {
    allowHttp: horizonUrl.startsWith("http://"),
  });
}

function isNotFound(error: unknown): boolean {
  const status = (error as { response?: { status?: number } }).response?.status;
  return status === 404 || (error as { name?: string }).name === "NotFoundError";
}

function explainHorizon(error: unknown): string {
  if (error instanceof TransactionFailedError) {
    const codes = error.getResultCodes();
    const op = codes.operations.find((c) => RESULT_HINTS[c]);
    if (op) return RESULT_HINTS[op];
    if (RESULT_HINTS[codes.transaction]) return RESULT_HINTS[codes.transaction];
    const joined = [codes.transaction, ...codes.operations].filter(Boolean).join(", ");
    return joined ? `La red rechazó la transacción (${joined}).` : error.message;
  }
  if (isNotFound(error)) return "La cuenta no existe en esta red.";
  return error instanceof Error ? error.message : "Error de red Stellar";
}

function hasTrustline(
  account: Horizon.AccountResponse,
  asset: Asset,
): boolean {
  if (asset.isNative()) return true;
  return account.balances.some((b) => {
    if (!("asset_code" in b) || !("asset_issuer" in b)) return false;
    return b.asset_code === asset.code && b.asset_issuer === asset.issuer;
  });
}

async function loadExisting(network: Network, address: string) {
  try {
    return await horizonServer(network).loadAccount(address);
  } catch (error) {
    if (isNotFound(error)) return null;
    throw Object.assign(new Error(explainHorizon(error)), { status: 502 });
  }
}

export async function assertCanReceive(input: {
  network: Network;
  address: string;
  role: PayoutLeg["role"];
  asset: Asset;
}) {
  const account = await loadExisting(input.network, input.address);
  if (!account) {
    throw Object.assign(
      new Error(
        `La wallet de ${input.role} no existe en ${input.network}. Fóndala antes de cobrar.`,
      ),
      { status: 400 },
    );
  }
  if (!hasTrustline(account, input.asset)) {
    throw Object.assign(
      new Error(
        `La wallet de ${input.role} no tiene trustline de ${input.asset.code}.`,
      ),
      { status: 400 },
    );
  }
}

function addSplitOps(
  builder: TransactionBuilder,
  input: SplitLeg,
  includeTrustline: boolean,
) {
  const asset = assetFor(input.asset, input.assetIssuer, input.network);
  if (includeTrustline) {
    if (asset.isNative()) {
      throw new Error("XLM no necesita trustline");
    }
    builder.addOperation(Operation.changeTrust({ asset }));
  }
  for (const leg of payoutLegs(input)) {
    builder.addOperation(
      Operation.payment({
        destination: leg.destination,
        asset,
        amount: leg.amount,
      }),
    );
  }
  return asset;
}

export async function buildSplitPaymentXdr(input: SplitLeg): Promise<{
  xdr: string;
  networkPassphrase: string;
  includedTrustline: boolean;
}> {
  const asset = assetFor(input.asset, input.assetIssuer, input.network);
  // Every destination that gets money has to exist and, for USDC, hold a trustline.
  for (const leg of payoutLegs(input)) {
    await assertCanReceive({
      network: input.network,
      address: leg.destination,
      role: leg.role,
      asset,
    });
  }

  const source = await loadExisting(input.network, input.source);
  if (!source) {
    const friendbot = NETWORKS[input.network].friendbotUrl;
    const hint = friendbot
      ? ` Créala en ${friendbot}?addr=${input.source}`
      : "";
    throw Object.assign(
      new Error(`La cuenta que paga no existe en ${input.network}.${hint}`),
      { status: 400 },
    );
  }

  const includedTrustline = input.asset !== "XLM" && !hasTrustline(source, asset);
  const builder = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORKS[input.network].networkPassphrase,
  });
  addSplitOps(builder, input, includedTrustline);
  const tx = builder.addMemo(Memo.text(input.memo)).setTimeout(180).build();
  return {
    xdr: tx.toXDR(),
    networkPassphrase: NETWORKS[input.network].networkPassphrase,
    includedTrustline,
  };
}

/**
 * SEP-7 `tx` URI carrying the whole split. `replace=sourceAccount` lets Lobstr /
 * Freighter Mobile swap in the scanner's account (SEP-7 cannot split via `pay`).
 * Sequence is a placeholder; wallets that implement `replace` must refresh it.
 */
export function buildSep7SplitUri(
  input: Omit<SplitLeg, "source"> & {
    placeholderSource: string;
    callbackUrl: string;
  },
): string {
  const cfg = NETWORKS[input.network];
  const includeTrustline = input.asset !== "XLM";
  const account = new Account(input.placeholderSource, "0");
  const builder = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: cfg.networkPassphrase,
  });
  addSplitOps(builder, { ...input, source: input.placeholderSource }, includeTrustline);
  const tx = builder.addMemo(Memo.text(input.memo)).setTimeout(300).build();
  const params = new URLSearchParams();
  params.set("xdr", tx.toXDR());
  params.set(
    "replace",
    "sourceAccount:X;X:cuenta que paga este cobro ViaPay",
  );
  params.set("callback", `url:${input.callbackUrl}`);
  const parts = payoutLegs({ ...input })
    .map((leg) => `${leg.amount} al ${leg.role}`)
    .join(", ");
  params.set(
    "msg",
    `ViaPay ${input.asset}: ${parts}. Todo en una transaccion.${
      includeTrustline ? " Abre la trustline si hace falta." : ""
    }`,
  );
  params.set("network_passphrase", cfg.networkPassphrase);
  return `web+stellar:tx?${params.toString()}`;
}

function memoText(tx: Transaction): string {
  const memo = tx.memo;
  if (!memo || memo.type !== Memo.text("").type) return "";
  const value = memo.value;
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (value instanceof Uint8Array) return new TextDecoder().decode(value);
  return String(value);
}

export function assertSplitXdr(signedXdr: string, expected: SplitLeg): Transaction {
  const passphrase = NETWORKS[expected.network].networkPassphrase;
  const parsed = TransactionBuilder.fromXDR(signedXdr, passphrase);
  if (!(parsed instanceof Transaction)) {
    throw Object.assign(new Error("Solo se acepta una transacción clásica"), {
      status: 400,
    });
  }
  if (memoText(parsed) !== expected.memo) {
    throw Object.assign(new Error("El memo no coincide con este cobro"), {
      status: 400,
    });
  }

  const asset = assetFor(expected.asset, expected.assetIssuer, expected.network);
  const payments = parsed.operations.filter((op) => op.type === "payment");
  const trustlines = parsed.operations.filter((op) => op.type === "changeTrust");
  const other = parsed.operations.filter(
    (op) => op.type !== "payment" && op.type !== "changeTrust",
  );
  if (other.length > 0) {
    throw Object.assign(new Error("La transacción incluye operaciones no permitidas"), {
      status: 400,
    });
  }
  if (expected.asset === "XLM" && trustlines.length > 0) {
    throw Object.assign(new Error("XLM no debe abrir trustline"), { status: 400 });
  }
  if (trustlines.length > 1) {
    throw Object.assign(new Error("Solo se permite una trustline"), { status: 400 });
  }

  const legs = payoutLegs(expected);
  if (payments.length !== legs.length) {
    throw Object.assign(
      new Error(
        `El split tiene ${payments.length} pagos y este cobro necesita ${legs.length} (${legs
          .map((leg) => leg.role)
          .join(" + ")})`,
      ),
      { status: 400 },
    );
  }

  // Match each expected leg against one unused operation. Two legs can share a
  // destination (a reseller that is also the merchant), so operations are consumed.
  const unused = [...payments];
  for (const leg of legs) {
    const index = unused.findIndex(
      (op) =>
        op.destination === leg.destination &&
        op.asset.equals(asset) &&
        parseAssetAmount(op.amount) === parseAssetAmount(leg.amount),
    );
    if (index === -1) {
      throw Object.assign(
        new Error(`Falta el pago al ${leg.role} por ${leg.amount} ${expected.asset}`),
        { status: 400 },
      );
    }
    unused.splice(index, 1);
  }
  return parsed;
}

export async function submitVerifiedSplit(
  signedXdr: string,
  expected: SplitLeg,
): Promise<{ hash: string; ledger: number; source: string }> {
  const tx = assertSplitXdr(signedXdr, expected);
  try {
    const result = await horizonServer(expected.network).submitTransaction(tx);
    return {
      hash: result.hash,
      ledger: result.ledger,
      source: tx.source,
    };
  } catch (error) {
    throw Object.assign(new Error(explainHorizon(error)), { status: 400 });
  }
}

export type ReceiveStatus = {
  exists: boolean;
  canReceive: boolean;
};

export async function inspectReceive(input: {
  network: Network;
  address: string;
  asset: AssetCode;
  assetIssuer?: string | null;
}): Promise<ReceiveStatus> {
  const asset = assetFor(input.asset, input.assetIssuer, input.network);
  const account = await loadExisting(input.network, input.address);
  if (!account) return { exists: false, canReceive: false };
  return { exists: true, canReceive: hasTrustline(account, asset) };
}

/** SEP-7 tx so the merchant's own wallet opens a USDC trustline. */
export function buildTrustlineSep7(input: {
  network: Network;
  placeholderSource: string;
  pubkey: string;
  assetIssuer?: string | null;
}): string {
  const cfg = NETWORKS[input.network];
  const asset = assetFor("USDC", input.assetIssuer, input.network);
  const tx = new TransactionBuilder(new Account(input.placeholderSource, "0"), {
    fee: BASE_FEE,
    networkPassphrase: cfg.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(300)
    .build();
  const params = new URLSearchParams();
  params.set("xdr", tx.toXDR());
  params.set("replace", "sourceAccount:X;X:tu wallet de comercio ViaPay");
  params.set("pubkey", input.pubkey);
  params.set("msg", "Abre la trustline de USDC para poder cobrar con ViaPay");
  params.set("network_passphrase", cfg.networkPassphrase);
  return `web+stellar:tx?${params.toString()}`;
}

type HorizonPaymentOp = {
  type: string;
  to?: string;
  amount?: string;
  asset_type?: string;
  asset_code?: string;
  asset_issuer?: string;
};

function paymentMatches(
  op: HorizonPaymentOp,
  destination: string,
  amount: string,
  asset: Asset,
): boolean {
  if (op.type !== "payment" || op.to !== destination || !op.amount) return false;
  if (parseAssetAmount(op.amount) !== parseAssetAmount(amount)) return false;
  if (asset.isNative()) return op.asset_type === "native";
  return op.asset_code === asset.code && op.asset_issuer === asset.issuer;
}

/**
 * Look up a confirmed classic split on Horizon by memo.
 * Covers wallets that submitted the SEP-7 tx themselves and never hit the callback.
 * Horizon has no memo index, so this scans the merchant's recent transactions.
 */
export async function findConfirmedSplit(
  expected: Omit<SplitLeg, "source">,
): Promise<{ hash: string; source: string } | null> {
  const hits = await findConfirmedSplits(expected.network, expected.merchant, [
    expected,
  ]);
  return hits[0] ?? null;
}

export async function findConfirmedSplits(
  network: Network,
  merchant: string,
  expected: Array<Omit<SplitLeg, "source">>,
): Promise<Array<{ hash: string; source: string; memo: string }>> {
  if (expected.length === 0) return [];
  const server = horizonServer(network);
  let page;
  try {
    page = await server
      .transactions()
      .forAccount(merchant)
      .order("desc")
      .limit(40)
      .call();
  } catch (error) {
    if (isNotFound(error)) return [];
    throw Object.assign(new Error(explainHorizon(error)), { status: 502 });
  }

  const wanted = new Map(expected.map((item) => [item.memo, item]));
  const found: Array<{ hash: string; source: string; memo: string }> = [];

  for (const record of page.records) {
    const memo = record.memo_type === "text" ? record.memo : undefined;
    if (!memo || !wanted.has(memo) || record.successful === false) continue;
    const leg = wanted.get(memo);
    if (!leg) continue;
    const ops = await server.operations().forTransaction(record.hash).call();
    const payments = ops.records.flatMap((op) =>
      op.type === "payment" && "to" in op ? [op] : [],
    );
    const asset = assetFor(leg.asset, leg.assetIssuer, network);
    const unused = [...payments];
    let allLegsPaid = true;
    for (const payout of payoutLegs(leg)) {
      const index = unused.findIndex((op) =>
        paymentMatches(op, payout.destination, payout.amount, asset),
      );
      if (index === -1) {
        allLegsPaid = false;
        break;
      }
      unused.splice(index, 1);
    }
    if (!allLegsPaid) continue;
    found.push({
      hash: record.hash,
      source: record.source_account,
      memo,
    });
    wanted.delete(memo);
    if (wanted.size === 0) break;
  }
  return found;
}

/** Simulated split receipt — kept for STELLAR_MODE=simulated only. */
export function simulatePaymentTx(input: {
  intentId: string;
  payer?: string;
  merchant: string;
  treasury: string;
  asset: AssetCode;
  amount: string;
  feeAmount: string;
  netAmount: string;
}) {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const txHash =
    "sim_" + Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return {
    txHash,
    ledger: Math.floor(Date.now() / 1000),
    mode: "simulated" as const,
    ...input,
  };
}
