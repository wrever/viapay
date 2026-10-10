import {
  formatAssetAmount,
  parseAssetAmount,
  type AssetCode,
} from "@viapay/shared";
import {
  Account,
  Address,
  Asset,
  BASE_FEE,
  Contract,
  Horizon,
  Keypair,
  Memo,
  Networks,
  Operation,
  Transaction,
  TransactionBuilder,
  TransactionFailedError,
  nativeToScVal,
  rpc,
  scValToNative,
  xdr,
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
    rpcUrl: "https://mainnet.sorobanrpc.com",
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

/** Credit assets the panel can offer for a one-click changeTrust (Freighter). */
export function predefinedCreditAssets(network: Network): Array<{
  code: Exclude<AssetCode, "XLM">;
  issuer: string;
  label: string;
}> {
  const cfg = NETWORKS[network];
  return [
    {
      code: "USDC",
      issuer: cfg.usdcIssuer,
      label: network === "mainnet" ? "USDC (Circle)" : "USDC (Circle testnet)",
    },
  ];
}

/**
 * Unsigned changeTrust for the merchant (or treasury) to open a credit trustline.
 * Returns alreadyTrusted when Horizon already shows the line — caller can skip sign.
 */
export async function buildChangeTrustXdr(input: {
  network: Network;
  source: string;
  asset: Exclude<AssetCode, "XLM">;
  assetIssuer?: string | null;
}): Promise<{
  xdr: string | null;
  networkPassphrase: string;
  alreadyTrusted: boolean;
  asset: { code: string; issuer: string };
}> {
  const cfg = NETWORKS[input.network];
  const asset = assetFor(input.asset, input.assetIssuer, input.network);
  if (asset.isNative()) {
    throw Object.assign(new Error("XLM no necesita trustline"), { status: 400 });
  }
  const source = await loadExisting(input.network, input.source);
  if (!source) {
    const friendbot = cfg.friendbotUrl;
    const hint = friendbot
      ? ` Créala en ${friendbot}?addr=${input.source}`
      : "";
    throw Object.assign(
      new Error(`La wallet no existe en ${input.network}.${hint}`),
      { status: 400 },
    );
  }
  const issuer = asset.issuer;
  if (!issuer) {
    throw Object.assign(new Error("Issuer USDC ausente"), { status: 500 });
  }
  const meta: { code: string; issuer: string } = {
    code: asset.code,
    issuer,
  };
  if (hasTrustline(source, asset)) {
    return {
      xdr: null,
      networkPassphrase: cfg.networkPassphrase,
      alreadyTrusted: true,
      asset: meta,
    };
  }
  const tx = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: cfg.networkPassphrase,
  })
    .addOperation(Operation.changeTrust({ asset }))
    .setTimeout(180)
    .build();
  return {
    xdr: tx.toXDR(),
    networkPassphrase: cfg.networkPassphrase,
    alreadyTrusted: false,
    asset: meta,
  };
}

/** Submit any signed classic XDR (e.g. merchant changeTrust). */
export async function submitSignedXdr(
  network: Network,
  signedXdr: string,
): Promise<{ hash: string; ledger: number; source: string }> {
  const passphrase = NETWORKS[network].networkPassphrase;
  let tx: Transaction;
  try {
    const parsed = TransactionBuilder.fromXDR(signedXdr, passphrase);
    if (!(parsed instanceof Transaction)) {
      throw new Error("expected transaction");
    }
    tx = parsed;
  } catch {
    throw Object.assign(new Error("XDR firmado inválido"), { status: 400 });
  }
  try {
    const result = await horizonServer(network).submitTransaction(tx);
    return {
      hash: result.hash,
      ledger: result.ledger,
      source: tx.source,
    };
  } catch (error) {
    throw Object.assign(new Error(explainHorizon(error)), { status: 400 });
  }
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

/** SHA-256 of the payment intent id → BytesN<32> for `pay(... intent_id)`. */
export async function intentIdBytes(memo: string): Promise<Uint8Array> {
  const digest = await globalThis.crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(memo),
  );
  return new Uint8Array(digest);
}

export function sacContractId(
  asset: AssetCode,
  assetIssuer: string | null | undefined,
  network: Network,
): string {
  return assetFor(asset, assetIssuer, network).contractId(
    NETWORKS[network].networkPassphrase,
  );
}

export function rpcServer(network: Network) {
  const { rpcUrl } = NETWORKS[network];
  return new rpc.Server(rpcUrl, { allowHttp: rpcUrl.startsWith("http://") });
}

function scAddressString(val: xdr.ScVal): string {
  return Address.fromScVal(val).toString();
}

function scI128(val: xdr.ScVal): bigint {
  const native = scValToNative(val);
  if (typeof native === "bigint") return native;
  if (typeof native === "number") return BigInt(native);
  throw new Error("Expected i128");
}

function scBytes(val: xdr.ScVal): Uint8Array {
  const native = scValToNative(val);
  if (native instanceof Uint8Array) return native;
  throw new Error("Expected bytes");
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

function isScVoid(val: xdr.ScVal): boolean {
  return "type" in val && (val as { type: string }).type === "scvVoid";
}

async function routerPayArgs(input: SplitLeg): Promise<xdr.ScVal[]> {
  const token = sacContractId(input.asset, input.assetIssuer, input.network);
  const resellerFee = parseAssetAmount(input.resellerAmount ?? "0");
  const reseller =
    input.reseller && resellerFee > 0n
      ? Address.fromString(input.reseller).toScVal()
      : xdr.ScVal.scvVoid();
  return [
    Address.fromString(token).toScVal(),
    Address.fromString(input.source).toScVal(),
    Address.fromString(input.merchant).toScVal(),
    Address.fromString(input.treasury).toScVal(),
    reseller,
    nativeToScVal(parseAssetAmount(input.netAmount), { type: "i128" }),
    nativeToScVal(parseAssetAmount(input.feeAmount), { type: "i128" }),
    nativeToScVal(resellerFee, { type: "i128" }),
    xdr.ScVal.scvBytes(await intentIdBytes(input.memo)),
  ];
}

/**
 * Build a simulated Soroban invoke of payment-router `pay` for the wallet to sign.
 * Destinations still need classic receive readiness (account + USDC trustline).
 */
export async function buildRouterPayXdr(
  input: SplitLeg,
  contractId: string,
): Promise<{
  xdr: string;
  networkPassphrase: string;
  includedTrustline: false;
  settlement: "router";
  contractId: string;
}> {
  const asset = assetFor(input.asset, input.assetIssuer, input.network);
  for (const leg of payoutLegs(input)) {
    await assertCanReceive({
      network: input.network,
      address: leg.destination,
      role: leg.role,
      asset,
    });
  }

  const server = rpcServer(input.network);
  let source: Awaited<ReturnType<rpc.Server["getAccount"]>>;
  try {
    source = await server.getAccount(input.source);
  } catch (error) {
    const friendbot = NETWORKS[input.network].friendbotUrl;
    const hint = friendbot
      ? ` Créala en ${friendbot}?addr=${input.source}`
      : "";
    throw Object.assign(
      new Error(
        `La cuenta que paga no existe en ${input.network}.${hint}`,
      ),
      { status: 400 },
    );
  }

  const contract = new Contract(contractId);
  const built = new TransactionBuilder(source, {
    fee: BASE_FEE,
    networkPassphrase: NETWORKS[input.network].networkPassphrase,
  })
    .addOperation(contract.call("pay", ...(await routerPayArgs(input))))
    .setTimeout(180)
    .build();

  let prepared: Transaction;
  try {
    prepared = await server.prepareTransaction(built);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Simulación Soroban falló";
    throw Object.assign(new Error(message), { status: 400 });
  }

  return {
    xdr: prepared.toXDR(),
    networkPassphrase: NETWORKS[input.network].networkPassphrase,
    includedTrustline: false,
    settlement: "router",
    contractId,
  };
}

type InvokePay = {
  contractId: string;
  token: string;
  payer: string;
  merchant: string;
  treasury: string;
  reseller: string | null;
  net: bigint;
  fee: bigint;
  resellerFee: bigint;
  intentId: Uint8Array;
};

function invokeContractId(raw: unknown): string {
  if (typeof raw === "string") return raw;
  if (raw && typeof raw === "object" && "toString" in raw) {
    try {
      return Address.fromScAddress(raw as xdr.ScAddress).toString();
    } catch {
      const s = String(raw);
      if (s.startsWith("C") && s.length === 56) return s;
    }
  }
  throw Object.assign(new Error("contractAddress inválida"), { status: 400 });
}

function readRouterPayInvoke(tx: Transaction): InvokePay {
  if (tx.operations.length !== 1) {
    throw Object.assign(
      new Error("La invocación del router debe ser la única operación"),
      { status: 400 },
    );
  }
  const op = tx.operations[0];
  if (op.type !== "invokeHostFunction") {
    throw Object.assign(new Error("Se esperaba invokeHostFunction"), {
      status: 400,
    });
  }
  const func = op.func as {
    type?: string;
    invokeContract?: {
      contractAddress: unknown;
      functionName: string | { toString(): string };
      args: xdr.ScVal[];
    };
  };
  const invoke = func.invokeContract;
  if (!invoke || func.type !== "hostFunctionTypeInvokeContract") {
    throw Object.assign(new Error("Se esperaba invokeContract pay"), {
      status: 400,
    });
  }
  const fn =
    typeof invoke.functionName === "string"
      ? invoke.functionName
      : invoke.functionName.toString();
  if (fn !== "pay") {
    throw Object.assign(new Error(`Función inesperada: ${fn}`), { status: 400 });
  }
  const args = invoke.args;
  if (args.length !== 9) {
    throw Object.assign(new Error("pay exige 9 argumentos"), { status: 400 });
  }
  const resellerVal = args[4];
  const reseller = isScVoid(resellerVal) ? null : scAddressString(resellerVal);

  return {
    contractId: invokeContractId(invoke.contractAddress),
    token: scAddressString(args[0]),
    payer: scAddressString(args[1]),
    merchant: scAddressString(args[2]),
    treasury: scAddressString(args[3]),
    reseller,
    net: scI128(args[5]),
    fee: scI128(args[6]),
    resellerFee: scI128(args[7]),
    intentId: scBytes(args[8]),
  };
}

export async function assertRouterPayXdr(
  signedXdr: string,
  expected: SplitLeg,
  contractId: string,
): Promise<Transaction> {
  const passphrase = NETWORKS[expected.network].networkPassphrase;
  const parsed = TransactionBuilder.fromXDR(signedXdr, passphrase);
  if (!(parsed instanceof Transaction)) {
    throw Object.assign(new Error("Solo se acepta una transacción"), {
      status: 400,
    });
  }
  const invoke = readRouterPayInvoke(parsed);
  if (invoke.contractId !== contractId) {
    throw Object.assign(new Error("Contrato payment-router incorrecto"), {
      status: 400,
    });
  }
  const token = sacContractId(
    expected.asset,
    expected.assetIssuer,
    expected.network,
  );
  if (invoke.token !== token) {
    throw Object.assign(new Error("Token SAC incorrecto"), { status: 400 });
  }
  if (invoke.merchant !== expected.merchant) {
    throw Object.assign(new Error("Merchant incorrecto"), { status: 400 });
  }
  if (invoke.treasury !== expected.treasury) {
    throw Object.assign(new Error("Tesorería incorrecta"), { status: 400 });
  }
  const wantResellerFee = parseAssetAmount(expected.resellerAmount ?? "0");
  const wantReseller =
    expected.reseller && wantResellerFee > 0n ? expected.reseller : null;
  if (invoke.reseller !== wantReseller) {
    throw Object.assign(new Error("Revendedor incorrecto"), { status: 400 });
  }
  if (invoke.net !== parseAssetAmount(expected.netAmount)) {
    throw Object.assign(new Error("Neto incorrecto"), { status: 400 });
  }
  if (invoke.fee !== parseAssetAmount(expected.feeAmount)) {
    throw Object.assign(new Error("Fee ViaPay incorrecta"), { status: 400 });
  }
  if (invoke.resellerFee !== wantResellerFee) {
    throw Object.assign(new Error("Fee revendedor incorrecta"), { status: 400 });
  }
  if (!bytesEqual(invoke.intentId, await intentIdBytes(expected.memo))) {
    throw Object.assign(new Error("intent_id no coincide con este cobro"), {
      status: 400,
    });
  }
  if (parsed.source !== invoke.payer) {
    throw Object.assign(
      new Error("El pagador debe ser la cuenta fuente de la transacción"),
      { status: 400 },
    );
  }
  return parsed;
}

async function pollRpcTransaction(
  server: rpc.Server,
  hash: string,
): Promise<{ hash: string; ledger: number }> {
  for (let i = 0; i < 40; i++) {
    const got = await server.getTransaction(hash);
    if (got.status === rpc.Api.GetTransactionStatus.SUCCESS) {
      return {
        hash,
        ledger: got.ledger ?? 0,
      };
    }
    if (got.status === rpc.Api.GetTransactionStatus.FAILED) {
      throw Object.assign(
        new Error("La red rechazó la invocación del router"),
        { status: 400 },
      );
    }
    await new Promise((r) => setTimeout(r, 750));
  }
  throw Object.assign(
    new Error("Timeout esperando confirmación Soroban"),
    { status: 504 },
  );
}

function toHex(bytes: Uint8Array): string {
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function envelopeToBase64(raw: unknown): string {
  if (typeof raw === "string" && raw.length > 0) return raw;
  if (raw && typeof raw === "object") {
    const maybe = raw as { toXDR?: (format?: string) => string | Buffer };
    if (typeof maybe.toXDR === "function") {
      const out = maybe.toXDR("base64");
      if (typeof out === "string" && out.length > 0) return out;
      if (Buffer.isBuffer(out)) return out.toString("base64");
    }
  }
  throw Object.assign(new Error("RPC no devolvió envelopeXdr usable"), {
    status: 502,
  });
}

/**
 * Public verifier: load a confirmed Soroban tx and decode payment-router `pay`.
 * Anyone can check settlement without trusting ViaPay's database.
 */
export async function verifyRouterPayTx(input: {
  network: Network;
  txHash: string;
  /** When set, require this contract id (testnet/mainnet router). */
  expectedContractId?: string | null;
}): Promise<{
  verified: true;
  network: Network;
  tx_hash: string;
  ledger: number | null;
  status: string;
  settlement: "payment-router";
  event: "Paid";
  contract_id: string;
  token: string;
  payer: string;
  merchant: string;
  treasury: string;
  reseller: string | null;
  net: string;
  fee: string;
  reseller_fee: string;
  intent_id: string;
  explorer_tx: string;
  explorer_contract: string;
}> {
  const hash = input.txHash.trim().toLowerCase();
  if (!/^[0-9a-f]{64}$/.test(hash)) {
    throw Object.assign(new Error("tx_hash inválido (64 hex)"), { status: 400 });
  }
  const server = rpcServer(input.network);
  const got = await server.getTransaction(hash);
  if (got.status === rpc.Api.GetTransactionStatus.NOT_FOUND) {
    throw Object.assign(
      new Error("Transacción no encontrada en este RPC / red"),
      { status: 404 },
    );
  }
  if (got.status !== rpc.Api.GetTransactionStatus.SUCCESS) {
    throw Object.assign(
      new Error(`Transacción no exitosa: ${got.status}`),
      { status: 400 },
    );
  }
  const rawEnvelope =
    got.status === rpc.Api.GetTransactionStatus.SUCCESS
      ? (got as { envelopeXdr?: unknown }).envelopeXdr
      : undefined;
  const envelopeXdr = envelopeToBase64(rawEnvelope);
  const passphrase = NETWORKS[input.network].networkPassphrase;
  const parsed = TransactionBuilder.fromXDR(envelopeXdr, passphrase);
  if (!(parsed instanceof Transaction)) {
    throw Object.assign(new Error("Envelope no es una Transaction"), {
      status: 400,
    });
  }
  const invoke = readRouterPayInvoke(parsed);
  if (
    input.expectedContractId &&
    invoke.contractId !== input.expectedContractId
  ) {
    throw Object.assign(
      new Error("La tx no invoca el payment-router esperado"),
      { status: 400 },
    );
  }
  const explorer =
    input.network === "mainnet" ? "public" : input.network === "local" ? "testnet" : "testnet";
  return {
    verified: true,
    network: input.network,
    tx_hash: hash,
    ledger: got.ledger ?? null,
    status: "SUCCESS",
    settlement: "payment-router",
    event: "Paid",
    contract_id: invoke.contractId,
    token: invoke.token,
    payer: invoke.payer,
    merchant: invoke.merchant,
    treasury: invoke.treasury,
    reseller: invoke.reseller,
    net: formatAssetAmount(invoke.net),
    fee: formatAssetAmount(invoke.fee),
    reseller_fee: formatAssetAmount(invoke.resellerFee),
    intent_id: toHex(invoke.intentId),
    explorer_tx: `https://stellar.expert/explorer/${explorer}/tx/${hash}`,
    explorer_contract: `https://stellar.expert/explorer/${explorer}/contract/${invoke.contractId}`,
  };
}

/**
 * Optional fee-bump: set VIAPAY_FEE_SPONSOR_SECRET (S…) so payers without XLM
 * can still land USDC/router pays. Sponsor pays network fees only.
 */
export function maybeFeeBumpTransaction(
  inner: Transaction,
  network: Network,
): Transaction {
  const secret = process.env.VIAPAY_FEE_SPONSOR_SECRET?.trim();
  if (!secret || !secret.startsWith("S")) return inner;
  try {
    const sponsor = Keypair.fromSecret(secret);
    const fee =
      BigInt(BASE_FEE) * 3n > 1000n ? (BigInt(BASE_FEE) * 3n).toString() : "1000";
    const bump = TransactionBuilder.buildFeeBumpTransaction(
      sponsor,
      fee,
      inner,
      NETWORKS[network].networkPassphrase,
    );
    bump.sign(sponsor);
    return bump as unknown as Transaction;
  } catch (e) {
    console.warn(
      "[fee-bump]",
      e instanceof Error ? e.message : e,
      "— submitting inner tx",
    );
    return inner;
  }
}

export async function submitVerifiedRouter(
  signedXdr: string,
  expected: SplitLeg,
  contractId: string,
): Promise<{ hash: string; ledger: number; source: string }> {
  const tx = await assertRouterPayXdr(signedXdr, expected, contractId);
  const toSend = maybeFeeBumpTransaction(tx, expected.network);
  const server = rpcServer(expected.network);
  let send: rpc.Api.SendTransactionResponse;
  try {
    send = await server.sendTransaction(toSend);
  } catch (error) {
    throw Object.assign(
      new Error(error instanceof Error ? error.message : "RPC send falló"),
      { status: 400 },
    );
  }
  if (send.status === "ERROR") {
    throw Object.assign(
      new Error(
        `RPC rechazó la tx${send.errorResult ? ` (${send.errorResult})` : ""}`,
      ),
      { status: 400 },
    );
  }
  const hash = send.hash;
  const confirmed = await pollRpcTransaction(server, hash);
  return {
    hash: confirmed.hash,
    ledger: confirmed.ledger,
    source: tx.source,
  };
}
