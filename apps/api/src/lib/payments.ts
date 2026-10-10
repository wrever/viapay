import {
  appendAbono,
  assertFeeBps,
  assertInstallmentCount,
  buildMonthlyDueDates,
  calcFeeSplit,
  emptyAbonosLedger,
  formatAssetAmount,
  generatePrefixedId,
  isPlanParent,
  isValidStellarPubkey,
  parseAssetAmount,
  planFullyPaid,
  readAbonos,
  readPlan,
  remainingAmount,
  splitInstallmentAmounts,
  summarizePlan,
  type AssetCode,
  type PaymentIntentStatus,
  type PlanMeta,
  type PlanScheduleEntry,
} from "@viapay/shared";
import { verifyStoredLinkSignature } from "./link-sig";
import type { Network } from "@viapay/stellar";
import type { AuthContext } from "./auth";
import { getTreasuryAddress } from "./auth";
import { getDb } from "./db";
import { getSupabaseAdmin, throwSb, usesSupabase } from "./supabase-admin";
import { enqueuePaymentSucceeded } from "./webhooks";
import { notifyPaymentSucceeded } from "./notify-succeeded";
import { attachCobroCode, generateCobroCode } from "./cobro-codes";

function coerceNetwork(raw: unknown): Network {
  if (raw === "mainnet" || raw === "public") return "mainnet";
  if (raw === "local") return "local";
  return "testnet";
}

export interface PaymentIntentRow {
  id: string;
  account_id: string;
  status: PaymentIntentStatus;
  amount: string;
  fee_amount: string;
  net_amount: string;
  fee_bps: number;
  reseller_fee_bps: number;
  reseller_amount: string;
  reseller_address: string | null;
  asset_code: AssetCode;
  /** Stellar network this charge settles on (testnet | mainnet | local). */
  network: Network;
  merchant_wallet: string;
  description: string | null;
  /** Merchant's own end-customer id (not a ViaPay user). */
  external_user_id: string | null;
  /** Opaque JSON object from the merchant (stringified in DB). */
  metadata: Record<string, unknown> | null;
  client_secret: string;
  success_url: string | null;
  cancel_url: string | null;
  stellar_tx_hash: string | null;
  expires_at: string;
  succeeded_at: string | null;
  created_at: string;
  updated_at: string;
}

function parseMetadata(raw: unknown): Record<string, unknown> | null {
  if (raw == null || raw === "") return null;
  if (typeof raw === "object" && !Array.isArray(raw)) {
    return raw as Record<string, unknown>;
  }
  if (typeof raw !== "string") return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
  } catch {
    return null;
  }
  return null;
}

export function normalizeRow(raw: Record<string, unknown>): PaymentIntentRow {
  return {
    id: String(raw.id),
    account_id: String(raw.account_id),
    status: raw.status as PaymentIntentStatus,
    amount: String(raw.amount),
    fee_amount: String(raw.fee_amount),
    net_amount: String(raw.net_amount),
    fee_bps: Number(raw.fee_bps),
    reseller_fee_bps: Number(raw.reseller_fee_bps ?? 0),
    reseller_amount: String(raw.reseller_amount ?? "0.0000000"),
    reseller_address: (raw.reseller_address as string | null) ?? null,
    asset_code: raw.asset_code as AssetCode,
    network: coerceNetwork(raw.network),
    merchant_wallet: String(raw.merchant_wallet),
    description: (raw.description as string | null) ?? null,
    external_user_id: (raw.external_user_id as string | null) ?? null,
    metadata: parseMetadata(raw.metadata),
    client_secret: String(raw.client_secret),
    success_url: (raw.success_url as string | null) ?? null,
    cancel_url: (raw.cancel_url as string | null) ?? null,
    stellar_tx_hash: (raw.stellar_tx_hash as string | null) ?? null,
    expires_at: String(raw.expires_at),
    succeeded_at: (raw.succeeded_at as string | null) ?? null,
    created_at: String(raw.created_at),
    updated_at: String(raw.updated_at),
  };
}

export function getCheckoutBaseUrl(): string {
  return (
    process.env.VIAPAY_CHECKOUT_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_CHECKOUT_URL ??
    "http://localhost:3000"
  ).replace(/\/$/, "");
}

/** Direct hosted checkout UI (Freighter / QR). Prefer sharing `checkout_url` instead. */
export function buildPayUrl(id: string, clientSecret: string): string {
  const url = new URL(`${getCheckoutBaseUrl()}/pay/${id}`);
  url.searchParams.set("cs", clientSecret);
  return url.toString();
}

/** @deprecated Use buildPayUrl — kept for call sites that meant the hosted page. */
export function buildCheckoutUrl(id: string, clientSecret: string): string {
  return buildPayUrl(id, clientSecret);
}

export function getApiPublicUrl(): string {
  return (
    process.env.VIAPAY_API_PUBLIC_URL ??
    process.env.NEXT_PUBLIC_VIAPAY_API_URL ??
    "http://localhost:3001"
  ).replace(/\/$/, "");
}

/**
 * Unified share link: browser navigations redirect to hosted `/pay`,
 * agents (JSON / no Sec-Fetch document) get HTTP 402 on the same URL.
 */
export function buildX402Url(id: string, clientSecret: string): string {
  const url = new URL(`${getApiPublicUrl()}/v1/x402/${id}`);
  url.searchParams.set("client_secret", clientSecret);
  return url.toString();
}

export function serializePaymentIntent(
  row: PaymentIntentRow,
  opts?: {
    childStatuses?: Record<string, string>;
    nextPayUrl?: string | null;
  },
) {
  const payUrl = buildPayUrl(row.id, row.client_secret);
  const shareUrl = buildX402Url(row.id, row.client_secret);
  const exactPay =
    row.metadata &&
    typeof row.metadata === "object" &&
    row.metadata.exact_pay &&
    typeof row.metadata.exact_pay === "object"
      ? (row.metadata.exact_pay as Record<string, unknown>)
      : null;
  const abonos = readAbonos(row.metadata);
  const plan = readPlan(row.metadata);
  const linkSig =
    row.metadata && typeof row.metadata.link_signature === "string"
      ? row.metadata.link_signature
      : null;
  const linkCheck = linkSig
    ? verifyStoredLinkSignature({
        amount: row.amount,
        asset: row.asset_code,
        network: row.network,
        merchant_wallet: row.merchant_wallet,
        fee_bps: row.fee_bps,
        reseller_address: row.reseller_address,
        metadata: row.metadata,
        treasury: getTreasuryAddress(),
        signature: linkSig,
      })
    : null;
  const planSummary =
    plan && opts?.childStatuses
      ? {
          ...summarizePlan(plan, opts.childStatuses),
          next_pay_url: opts.nextPayUrl ?? null,
        }
      : plan
        ? {
            ...summarizePlan(plan, {}),
            next_pay_url: opts?.nextPayUrl ?? null,
          }
        : null;
  return {
    id: row.id,
    object: "payment_intent" as const,
    status: row.status,
    /** ViaPay pricing scheme: exact (crypto) | exact_pay (fiat→locked crypto). */
    scheme: exactPay ? ("exact_pay" as const) : ("exact" as const),
    /** Installments / abonos — same intent_id, many Paid events. */
    abonos_enabled: Boolean(abonos),
    /** Fixed installment plan (parent or child). */
    plan_enabled: Boolean(plan),
    plan_summary: planSummary,
    amount_remaining: abonos
      ? remainingAmount(row.amount, abonos)
      : row.status === "succeeded"
        ? "0.0000000"
        : row.amount,
    amount_paid: abonos
      ? formatAssetAmount(BigInt(abonos.paid_atomic))
      : row.status === "succeeded"
        ? row.amount
        : "0.0000000",
    abonos: abonos
      ? { paid_atomic: abonos.paid_atomic, pays: abonos.pays }
      : null,
    link_verified: linkCheck ? linkCheck.verified : null,
    link_sig_status: linkCheck ? linkCheck.status : null,
    link_sig_version: linkCheck ? linkCheck.version : null,
    amount: row.amount,
    fee_amount: row.fee_amount,
    net_amount: row.net_amount,
    fee_bps: row.fee_bps,
    reseller_fee_bps: row.reseller_fee_bps,
    reseller_amount: row.reseller_amount,
    reseller_address: row.reseller_address,
    asset: row.asset_code,
    network: row.network,
    merchant_wallet: row.merchant_wallet,
    description: row.description,
    external_user_id: row.external_user_id,
    metadata: row.metadata,
    exact_pay: exactPay,
    client_secret: row.client_secret,
    /** One link for humans and agents (API gateway → 402 or redirect to pay_url). */
    checkout_url: shareUrl,
    /** Alias of checkout_url (same unified entry). */
    x402_url: shareUrl,
    /** Direct hosted UI if you already know the payer is human. */
    pay_url: payUrl,
    /** Short cobro code (VP-XXXX) for WA status / share. */
    cobro_code:
      row.metadata && typeof row.metadata.cobro_code === "string"
        ? row.metadata.cobro_code
        : null,
    /** Public receipt (proof-or-nothing) when paid. */
    receipt_url: `${getCheckoutBaseUrl()}/r/${row.id}`,
    parity_url: `${getApiPublicUrl()}/v1/parity/${row.id}`,
    success_url: row.success_url,
    cancel_url: row.cancel_url,
    expires_at: row.expires_at,
    succeeded_at: row.succeeded_at,
    stellar_tx_hash: row.stellar_tx_hash,
    created_at: row.created_at,
  };
}

/** Enrich serialize with live child statuses for plan parents. */
export async function serializePaymentIntentAsync(row: PaymentIntentRow) {
  const plan = readPlan(row.metadata);
  if (!plan || !isPlanParent(plan) || plan.schedule.length === 0) {
    return serializePaymentIntent(row);
  }
  const children = await getPaymentIntentsByIds(
    plan.schedule.map((e) => e.child_id),
  );
  const childStatuses: Record<string, string> = {};
  const byId = new Map(children.map((c) => [c.id, c]));
  for (const e of plan.schedule) {
    childStatuses[e.child_id] = byId.get(e.child_id)?.status ?? "requires_payment";
  }
  const summary = summarizePlan(plan, childStatuses);
  const next = summary.next_child_id
    ? byId.get(summary.next_child_id)
    : undefined;
  return serializePaymentIntent(row, {
    childStatuses,
    nextPayUrl: next ? buildPayUrl(next.id, next.client_secret) : null,
  });
}

export async function createPaymentIntent(
  auth: AuthContext,
  input: {
    amount: string;
    asset: AssetCode;
    /** Defaults to deployment STELLAR_NETWORK. */
    network?: Network | string;
    description?: string;
    success_url?: string;
    cancel_url?: string;
    reseller_fee_bps?: number;
    reseller_address?: string;
    /** Merchant's end-customer id (aliases accepted at the HTTP layer). */
    external_user_id?: string;
    metadata?: Record<string, unknown>;
    /** Accept partial pays (abonos) until amount is covered. */
    allow_abonos?: boolean;
    /** Opt-in fixed installments (mutually exclusive with allow_abonos). */
    plan?: { installments: number; start_at?: string };
    /** Base64/hex ed25519 signature of link message (merchant wallet). */
    link_signature?: string;
    /** Required with v2 signatures (nonce + expires + legs snapshot). */
    link_sig?: {
      v: 2;
      nonce: string;
      expires_unix: number;
      treasury: string;
      reseller: string;
      fee_bps: number;
      amount?: string;
    };
  },
): Promise<PaymentIntentRow> {
  if (!auth.merchantWallet) {
    throw Object.assign(
      new Error("Configura una wallet Stellar antes de crear links de pago"),
      { status: 400 },
    );
  }

  if (input.allow_abonos && input.plan) {
    throw Object.assign(
      new Error("No se puede combinar allow_abonos con plan de cuotas"),
      { status: 400 },
    );
  }

  const network = coerceNetwork(
    input.network ?? process.env.STELLAR_NETWORK ?? "testnet",
  );

  const amountUnits = parseAssetAmount(input.amount, 7);
  if (amountUnits <= 0n) {
    throw Object.assign(new Error("amount must be > 0"), { status: 400 });
  }

  const resellerBps = input.reseller_fee_bps ?? 0;
  const resellerAddress = input.reseller_address?.trim() || null;
  try {
    assertFeeBps(auth.feeBps, resellerBps);
  } catch (error) {
    throw Object.assign(error as Error, { status: 400 });
  }
  if (resellerBps > 0 && !resellerAddress) {
    throw Object.assign(
      new Error("Un fee de revendedor necesita reseller_address"),
      { status: 400 },
    );
  }
  if (resellerAddress && !isValidStellarPubkey(resellerAddress)) {
    throw Object.assign(
      new Error("reseller_address no es una cuenta Stellar válida (G…)"),
      { status: 400 },
    );
  }

  const split = calcFeeSplit(amountUnits, auth.feeBps, resellerBps);
  if (split.net <= 0n) {
    throw Object.assign(
      new Error("Después de los fees el comercio no recibiría nada"),
      { status: 400 },
    );
  }
  const externalUserId = input.external_user_id?.trim() || null;
  const amountStr = formatAssetAmount(split.amount);

  if (input.plan) {
    return createInstallmentPlan(auth, {
      amountStr,
      asset: input.asset,
      network,
      description: input.description,
      success_url: input.success_url,
      cancel_url: input.cancel_url,
      resellerBps,
      resellerAddress,
      externalUserId,
      metadata: input.metadata,
      installments: input.plan.installments,
      startAt: input.plan.start_at,
      link_signature: input.link_signature,
      link_sig: input.link_sig,
    });
  }

  const cobroCode = generateCobroCode();
  const baseMeta =
    input.metadata && Object.keys(input.metadata).length > 0
      ? { ...input.metadata }
      : {};
  baseMeta.cobro_code = cobroCode;
  if (input.allow_abonos) {
    baseMeta.abonos = emptyAbonosLedger();
  }

  const id = generatePrefixedId("pi");
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

  applyLinkSignatureMeta(baseMeta, {
    amount: amountStr,
    asset: input.asset,
    network,
    merchant_wallet: auth.merchantWallet,
    fee_bps: split.viaBps,
    reseller_address: resellerBps > 0 ? resellerAddress : null,
    link_signature: input.link_signature,
    link_sig: input.link_sig,
  });

  const row = buildIntentRow({
    id,
    accountId: auth.accountId,
    amountStr,
    split,
    resellerAddress: resellerBps > 0 ? resellerAddress : null,
    asset: input.asset,
    network,
    merchantWallet: auth.merchantWallet,
    description: input.description ?? null,
    externalUserId,
    metadata: baseMeta,
    successUrl: input.success_url ?? null,
    cancelUrl: input.cancel_url ?? null,
    expiresAt,
    now,
  });

  await persistIntent(row, cobroCode);
  return row;
}

function applyLinkSignatureMeta(
  baseMeta: Record<string, unknown>,
  input: {
    amount: string;
    asset: string;
    network: string;
    merchant_wallet: string;
    fee_bps: number;
    reseller_address: string | null;
    link_signature?: string;
    link_sig?: {
      v: 2;
      nonce: string;
      expires_unix: number;
      treasury: string;
      reseller: string;
      fee_bps: number;
      amount?: string;
    };
  },
): void {
  if (!input.link_signature?.trim()) return;
  const sig = input.link_signature.trim();
  if (input.link_sig) {
    if (input.link_sig.v !== 2) {
      throw Object.assign(new Error("link_sig.v debe ser 2"), { status: 400 });
    }
    baseMeta.link_sig = {
      v: 2,
      nonce: input.link_sig.nonce,
      expires_unix: input.link_sig.expires_unix,
      treasury: input.link_sig.treasury,
      reseller: input.link_sig.reseller || "-",
      fee_bps: input.link_sig.fee_bps,
      amount: input.amount,
    };
  }
  const check = verifyStoredLinkSignature({
    amount: input.amount,
    asset: input.asset,
    network: input.network,
    merchant_wallet: input.merchant_wallet,
    fee_bps: input.fee_bps,
    reseller_address: input.reseller_address,
    metadata: baseMeta,
    treasury: getTreasuryAddress(),
    signature: sig,
  });
  if (!check.verified) {
    throw Object.assign(
      new Error(
        `link_signature inválida (${check.status ?? "invalid"})`,
      ),
      { status: 400 },
    );
  }
  baseMeta.link_signature = sig;
}

function buildIntentRow(input: {
  id: string;
  accountId: string;
  amountStr: string;
  split: ReturnType<typeof calcFeeSplit>;
  resellerAddress: string | null;
  asset: AssetCode;
  network: Network;
  merchantWallet: string;
  description: string | null;
  externalUserId: string | null;
  metadata: Record<string, unknown>;
  successUrl: string | null;
  cancelUrl: string | null;
  expiresAt: string;
  now: string;
}): PaymentIntentRow {
  return {
    id: input.id,
    account_id: input.accountId,
    status: "requires_payment",
    amount: input.amountStr,
    fee_amount: formatAssetAmount(input.split.viaFee),
    net_amount: formatAssetAmount(input.split.net),
    fee_bps: input.split.viaBps,
    reseller_fee_bps: input.split.resellerBps,
    reseller_amount: formatAssetAmount(input.split.resellerFee),
    reseller_address: input.resellerAddress,
    asset_code: input.asset,
    network: input.network,
    merchant_wallet: input.merchantWallet,
    description: input.description,
    external_user_id: input.externalUserId,
    metadata: input.metadata,
    client_secret: `${input.id}_secret_${generatePrefixedId("cs").slice(3)}`,
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
    stellar_tx_hash: null,
    expires_at: input.expiresAt,
    succeeded_at: null,
    created_at: input.now,
    updated_at: input.now,
  };
}

async function persistIntent(
  row: PaymentIntentRow,
  cobroCode: string,
): Promise<void> {
  const metadataJson = JSON.stringify(row.metadata ?? {});
  if (usesSupabase()) {
    const ins = await getSupabaseAdmin().from("payment_intents").insert({
      id: row.id,
      account_id: row.account_id,
      status: row.status,
      amount: row.amount,
      fee_amount: row.fee_amount,
      net_amount: row.net_amount,
      fee_bps: row.fee_bps,
      reseller_fee_bps: row.reseller_fee_bps,
      reseller_amount: row.reseller_amount,
      reseller_address: row.reseller_address,
      asset_code: row.asset_code,
      network: row.network,
      merchant_wallet: row.merchant_wallet,
      description: row.description,
      external_user_id: row.external_user_id,
      metadata: metadataJson,
      client_secret: row.client_secret,
      success_url: row.success_url,
      cancel_url: row.cancel_url,
      expires_at: row.expires_at,
      created_at: row.created_at,
      updated_at: row.updated_at,
    });
    throwSb(ins.error, "payment_intent insert failed");
  } else {
    getDb()
      .prepare(
        `insert into payment_intents (
          id, account_id, status, amount, fee_amount, net_amount, fee_bps,
          reseller_fee_bps, reseller_amount, reseller_address,
          asset_code, network, merchant_wallet, description, external_user_id, metadata,
          client_secret, success_url, cancel_url, expires_at, created_at, updated_at
        ) values (
          @id, @account_id, @status, @amount, @fee_amount, @net_amount, @fee_bps,
          @reseller_fee_bps, @reseller_amount, @reseller_address,
          @asset_code, @network, @merchant_wallet, @description, @external_user_id, @metadata,
          @client_secret, @success_url, @cancel_url, @expires_at, @created_at, @updated_at
        )`,
      )
      .run({
        ...row,
        metadata: metadataJson,
      });
  }
  try {
    await attachCobroCode(row.id, cobroCode);
  } catch (e) {
    console.warn("[cobro_code]", row.id, e);
  }
}

async function createInstallmentPlan(
  auth: AuthContext,
  input: {
    amountStr: string;
    asset: AssetCode;
    network: Network;
    description?: string;
    success_url?: string;
    cancel_url?: string;
    resellerBps: number;
    resellerAddress: string | null;
    externalUserId: string | null;
    metadata?: Record<string, unknown>;
    installments: number;
    startAt?: string;
    link_signature?: string;
    link_sig?: {
      v: 2;
      nonce: string;
      expires_unix: number;
      treasury: string;
      reseller: string;
      fee_bps: number;
      amount?: string;
    };
  },
): Promise<PaymentIntentRow> {
  try {
    assertInstallmentCount(input.installments);
  } catch (e) {
    throw Object.assign(e as Error, { status: 400 });
  }
  const start = input.startAt ? new Date(input.startAt) : new Date();
  if (Number.isNaN(start.getTime())) {
    throw Object.assign(new Error("plan.start_at inválida"), { status: 400 });
  }
  const parts = splitInstallmentAmounts(input.amountStr, input.installments);
  const dues = buildMonthlyDueDates(input.installments, start);
  const parentId = generatePrefixedId("pi");
  const childIds = parts.map(() => generatePrefixedId("pi"));
  const schedule: PlanScheduleEntry[] = parts.map((amount, i) => ({
    index: i + 1,
    amount,
    due_at: dues[i]!,
    child_id: childIds[i]!,
  }));
  const lastDue = Date.parse(dues[dues.length - 1]!);
  const expiresAt = new Date(lastDue + 30 * 24 * 60 * 60 * 1000).toISOString();
  const now = new Date().toISOString();
  const parentSplit = calcFeeSplit(
    parseAssetAmount(input.amountStr),
    auth.feeBps,
    input.resellerBps,
  );
  const parentMeta: Record<string, unknown> =
    input.metadata && Object.keys(input.metadata).length > 0
      ? { ...input.metadata }
      : {};
  parentMeta.cobro_code = generateCobroCode();
  const planMeta: PlanMeta = {
    kind: "installments",
    parent_id: null,
    installment_index: null,
    installment_count: input.installments,
    schedule,
    status: "active",
  };
  parentMeta.plan = planMeta;
  applyLinkSignatureMeta(parentMeta, {
    amount: input.amountStr,
    asset: input.asset,
    network: input.network,
    merchant_wallet: auth.merchantWallet!,
    fee_bps: parentSplit.viaBps,
    reseller_address:
      input.resellerBps > 0 ? input.resellerAddress : null,
    link_signature: input.link_signature,
    link_sig: input.link_sig,
  });

  const parent = buildIntentRow({
    id: parentId,
    accountId: auth.accountId,
    amountStr: input.amountStr,
    split: parentSplit,
    resellerAddress: input.resellerBps > 0 ? input.resellerAddress : null,
    asset: input.asset,
    network: input.network,
    merchantWallet: auth.merchantWallet!,
    description: input.description ?? null,
    externalUserId: input.externalUserId,
    metadata: parentMeta,
    successUrl: input.success_url ?? null,
    cancelUrl: input.cancel_url ?? null,
    expiresAt,
    now,
  });
  await persistIntent(parent, String(parentMeta.cobro_code));

  for (let i = 0; i < parts.length; i++) {
    const amt = parts[i]!;
    const childSplit = calcFeeSplit(
      parseAssetAmount(amt),
      auth.feeBps,
      input.resellerBps,
    );
    const childMeta: Record<string, unknown> = {
      cobro_code: generateCobroCode(),
      plan: {
        kind: "installments",
        parent_id: parentId,
        installment_index: i + 1,
        installment_count: input.installments,
        schedule,
        status: "active",
      } satisfies PlanMeta,
    };
    if (parentMeta.invoice) childMeta.invoice = parentMeta.invoice;
    // Propagate signed-link proof so next_pay_url (child) still shows verified.
    if (typeof parentMeta.link_signature === "string") {
      childMeta.link_signature = parentMeta.link_signature;
    }
    if (parentMeta.link_sig && typeof parentMeta.link_sig === "object") {
      childMeta.link_sig = parentMeta.link_sig;
    }
    const child = buildIntentRow({
      id: childIds[i]!,
      accountId: auth.accountId,
      amountStr: amt,
      split: childSplit,
      resellerAddress: input.resellerBps > 0 ? input.resellerAddress : null,
      asset: input.asset,
      network: input.network,
      merchantWallet: auth.merchantWallet!,
      description:
        input.description != null
          ? `${input.description} · cuota ${i + 1}/${input.installments}`
          : `Cuota ${i + 1}/${input.installments}`,
      externalUserId: input.externalUserId,
      metadata: childMeta,
      successUrl: input.success_url ?? null,
      cancelUrl: input.cancel_url ?? null,
      expiresAt,
      now,
    });
    await persistIntent(child, String(childMeta.cobro_code));
  }

  return parent;
}

export async function listPayableIntents(accountId: string) {
  const now = new Date().toISOString();
  const rows = usesSupabase()
    ? await (async () => {
        const res = await getSupabaseAdmin()
          .from("payment_intents")
          .select("*")
          .eq("account_id", accountId)
          .in("status", ["requires_payment", "partially_paid"])
          .gt("expires_at", now)
          .order("created_at", { ascending: false })
          .limit(80);
        throwSb(res.error, "list payable failed");
        return (res.data ?? []).map((row) =>
          normalizeRow(row as Record<string, unknown>),
        );
      })()
    : (
        getDb()
          .prepare(
            `select * from payment_intents
         where account_id = ? and status in ('requires_payment','partially_paid') and expires_at > ?
         order by created_at desc limit 80`,
          )
          .all(accountId, now) as Record<string, unknown>[]
      ).map(normalizeRow);

  // Plan parents are not payable — only children (or non-plan intents).
  return rows
    .filter((row) => {
      const plan = readPlan(row.metadata);
      return !(plan && isPlanParent(plan));
    })
    .slice(0, 40);
}

export async function listPaymentIntents(accountId: string) {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .eq("account_id", accountId)
      .order("created_at", { ascending: false })
      .limit(100);
    throwSb(res.error, "list payment_intents failed");
    return (res.data ?? []).map((row) => normalizeRow(row as Record<string, unknown>));
  }
  return (
    getDb()
      .prepare(
        `select * from payment_intents where account_id = ? order by created_at desc limit 100`,
      )
      .all(accountId) as Record<string, unknown>[]
  ).map(normalizeRow);
}

export async function getPaymentIntentPublic(id: string, clientSecret: string) {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwSb(res.error, "payment_intent lookup failed");
    if (!res.data) return null;
    const row = normalizeRow(res.data as Record<string, unknown>);
    if (row.client_secret !== clientSecret) return null;
    return row;
  }
  const row = getDb()
    .prepare(`select * from payment_intents where id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  if (!row || row.client_secret !== clientSecret) return null;
  return normalizeRow(row);
}

export async function getPaymentIntentById(id: string) {
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .eq("id", id)
      .maybeSingle();
    throwSb(res.error, "payment_intent lookup failed");
    if (!res.data) return null;
    return normalizeRow(res.data as Record<string, unknown>);
  }
  const row = getDb()
    .prepare(`select * from payment_intents where id = ?`)
    .get(id) as Record<string, unknown> | undefined;
  return row ? normalizeRow(row) : null;
}

export async function getPaymentIntentsByIds(
  ids: string[],
): Promise<PaymentIntentRow[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  if (usesSupabase()) {
    const res = await getSupabaseAdmin()
      .from("payment_intents")
      .select("*")
      .in("id", unique);
    throwSb(res.error, "payment_intents batch lookup failed");
    return (res.data ?? []).map((row) =>
      normalizeRow(row as Record<string, unknown>),
    );
  }
  const placeholders = unique.map(() => "?").join(",");
  const rows = getDb()
    .prepare(`select * from payment_intents where id in (${placeholders})`)
    .all(...unique) as Record<string, unknown>[];
  return rows.map(normalizeRow);
}

async function updateIntentMetadataAndStatus(
  id: string,
  patch: {
    status?: PaymentIntentStatus;
    metadata: Record<string, unknown>;
    stellar_tx_hash?: string | null;
    succeeded_at?: string | null;
  },
): Promise<void> {
  const now = new Date().toISOString();
  const metaJson = JSON.stringify(patch.metadata);
  if (usesSupabase()) {
    const body: Record<string, unknown> = {
      metadata: metaJson,
      updated_at: now,
    };
    if (patch.status) body.status = patch.status;
    if (patch.stellar_tx_hash !== undefined) {
      body.stellar_tx_hash = patch.stellar_tx_hash;
    }
    if (patch.succeeded_at !== undefined) {
      body.succeeded_at = patch.succeeded_at;
    }
    const upd = await getSupabaseAdmin()
      .from("payment_intents")
      .update(body)
      .eq("id", id);
    throwSb(upd.error, "payment_intent plan update failed");
    return;
  }
  if (patch.status) {
    getDb()
      .prepare(
        `update payment_intents
         set status = ?, metadata = ?, stellar_tx_hash = coalesce(?, stellar_tx_hash),
             succeeded_at = coalesce(?, succeeded_at), updated_at = ?
         where id = ?`,
      )
      .run(
        patch.status,
        metaJson,
        patch.stellar_tx_hash ?? null,
        patch.succeeded_at ?? null,
        now,
        id,
      );
  } else {
    getDb()
      .prepare(
        `update payment_intents set metadata = ?, updated_at = ? where id = ?`,
      )
      .run(metaJson, now, id);
  }
}

/** After a plan child succeeds, refresh parent schedule status. */
export async function onPlanChildSucceeded(child: PaymentIntentRow) {
  const plan = readPlan(child.metadata);
  if (!plan || !plan.parent_id) return;
  const parent = await getPaymentIntentById(plan.parent_id);
  if (!parent) return;
  const parentPlan = readPlan(parent.metadata);
  if (!parentPlan || !isPlanParent(parentPlan)) return;
  const children = await getPaymentIntentsByIds(
    parentPlan.schedule.map((e) => e.child_id),
  );
  const statuses: Record<string, string> = {};
  for (const c of children) statuses[c.id] = c.status;
  statuses[child.id] = "succeeded";
  const done = planFullyPaid(parentPlan, statuses);
  const nextPlan: PlanMeta = {
    ...parentPlan,
    status: done ? "completed" : "active",
  };
  const nextMeta = { ...(parent.metadata ?? {}), plan: nextPlan };
  await updateIntentMetadataAndStatus(parent.id, {
    status: done ? "succeeded" : parent.status,
    metadata: nextMeta,
    succeeded_at: done ? new Date().toISOString() : parent.succeeded_at,
  });
  if (done) {
    const updated = (await getPaymentIntentById(parent.id))!;
    await enqueuePaymentSucceeded(updated);
    void notifyPaymentSucceeded(updated).catch((e) => {
      console.warn("[notify-succeeded] plan parent", parent.id, e);
    });
  }
}

/**
 * Record a settlement. One-shot intents → succeeded.
 * Abonos: accumulate Paid legs; status partially_paid until remaining=0.
 */
export async function markCheckoutSucceeded(
  id: string,
  txHash: string,
  opts?: {
    /** Gross crypto amount of this pay (required when abonos enabled). */
    payAmount?: string;
    net?: string;
    fee?: string;
    reseller?: string;
  },
) {
  const now = new Date().toISOString();
  const current = await getPaymentIntentById(id);
  if (!current) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  if (current.status === "succeeded") return current;

  const ledger = readAbonos(current.metadata);
  if (ledger) {
    const payAmount = opts?.payAmount ?? current.amount;
    const split = calcFeeSplit(
      parseAssetAmount(payAmount),
      current.fee_bps,
      current.reseller_fee_bps,
    );
    const applied = appendAbono(current.amount, ledger, {
      amount: formatAssetAmount(split.amount),
      amount_atomic: split.amount.toString(),
      tx_hash: txHash,
      paid_at: now,
      net: opts?.net ?? formatAssetAmount(split.net),
      fee: opts?.fee ?? formatAssetAmount(split.viaFee),
      reseller: opts?.reseller ?? formatAssetAmount(split.resellerFee),
    });
    const nextMeta = {
      ...(current.metadata ?? {}),
      abonos: applied.ledger,
    };
    const status: PaymentIntentStatus = applied.fullyPaid
      ? "succeeded"
      : "partially_paid";
    const metaJson = JSON.stringify(nextMeta);
    if (usesSupabase()) {
      const upd = await getSupabaseAdmin()
        .from("payment_intents")
        .update({
          status,
          stellar_tx_hash: txHash,
          succeeded_at: applied.fullyPaid ? now : current.succeeded_at,
          updated_at: now,
          metadata: metaJson,
        })
        .eq("id", id);
      throwSb(upd.error, "payment_intent abono update failed");
    } else {
      getDb()
        .prepare(
          `update payment_intents
           set status = ?, stellar_tx_hash = ?, succeeded_at = ?, updated_at = ?, metadata = ?
           where id = ?`,
        )
        .run(
          status,
          txHash,
          applied.fullyPaid ? now : current.succeeded_at,
          now,
          metaJson,
          id,
        );
    }
    const updated = (await getPaymentIntentById(id))!;
    if (applied.fullyPaid) {
      await enqueuePaymentSucceeded(updated);
      void notifyPaymentSucceeded(updated).catch((e) => {
        console.warn("[notify-succeeded] unhandled", id, e);
      });
    }
    return updated;
  }

  if (usesSupabase()) {
    const upd = await getSupabaseAdmin()
      .from("payment_intents")
      .update({
        status: "succeeded",
        stellar_tx_hash: txHash,
        succeeded_at: now,
        updated_at: now,
      })
      .eq("id", id);
    throwSb(upd.error, "payment_intent update failed");
  } else {
    getDb()
      .prepare(
        `update payment_intents
         set status = 'succeeded', stellar_tx_hash = ?, succeeded_at = ?, updated_at = ?
         where id = ?`,
      )
      .run(txHash, now, now, id);
  }

  const updated = (await getPaymentIntentById(id))!;
  await enqueuePaymentSucceeded(updated);
  void notifyPaymentSucceeded(updated).catch((e) => {
    console.warn("[notify-succeeded] unhandled", id, e);
  });
  const childPlan = readPlan(updated.metadata);
  if (childPlan?.parent_id) {
    try {
      await onPlanChildSucceeded(updated);
    } catch (e) {
      console.warn("[plan-child] unhandled", id, e);
    }
  }
  return updated;
}

export async function confirmCheckoutPayment(
  id: string,
  clientSecret: string,
  payer?: string,
) {
  const row = await getPaymentIntentPublic(id, clientSecret);
  if (!row) {
    throw Object.assign(new Error("Not found"), { status: 404 });
  }
  if (row.status === "succeeded") return row;
  if (row.status !== "requires_payment") {
    throw Object.assign(new Error(`Cannot confirm status=${row.status}`), {
      status: 400,
    });
  }
  if (new Date(row.expires_at).getTime() < Date.now()) {
    if (usesSupabase()) {
      await getSupabaseAdmin()
        .from("payment_intents")
        .update({ status: "expired", updated_at: new Date().toISOString() })
        .eq("id", id);
    } else {
      getDb()
        .prepare(
          `update payment_intents set status = 'expired', updated_at = ? where id = ?`,
        )
        .run(new Date().toISOString(), id);
    }
    throw Object.assign(new Error("Payment link expired"), { status: 400 });
  }

  if (process.env.STELLAR_MODE !== "simulated") {
    throw Object.assign(
      new Error("Falta la transacción firmada. Paga con wallet o escanea el QR."),
      { status: 400 },
    );
  }

  void payer;
  void getTreasuryAddress;
  const txHash = `sim_${generatePrefixedId("tx").slice(3)}`;
  return markCheckoutSucceeded(id, txHash);
}
