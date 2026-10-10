#!/usr/bin/env node
/**
 * Proved-style public verifier for ViaPay settlement (+ judge kit).
 * Usage:
 *   pnpm verify
 *   pnpm verify -- --network mainnet --tx 83926d93…
 *   pnpm verify -- --api https://viapay-api.vercel.app
 *   pnpm verify -- --direct   # RPC only (no API deploy needed)
 *   pnpm verify -- --parity pi_…
 *   pnpm verify -- --kit      # parity + settle-proof paid/unpaid + fake 404 + mainnet verify
 *
 * Exit 0 only if verified:true and legs parse (or parity ok / kit all green).
 *
 * Run via: node --import tsx scripts/verify.mjs
 */
import { pathToFileURL } from "node:url";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const DEFAULT_API = "https://viapay-api.vercel.app";
/** Prefer third-party merchant evidence (merchant ≠ treasury). */
const DEFAULT_TX =
  "83926d934e77d2598299d9cf59d2e597e448277b984412fdeb83047d3e03b75f";
const SELF_PAY_TX =
  "b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e";
const DEFAULT_NETWORK = "mainnet";
const EXPECTED_CONTRACT =
  "CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U";
const KIT_PARITY_ID = "pi_56fad4bc479de4f5e043065e";
const KIT_UNPAID_ID = "pi_df1327cbdea35264be5d24a9";
const KIT_FAKE_ID = "pi_does_not_exist_judge_test";

const __dirname = dirname(fileURLToPath(import.meta.url));
const STELLAR_ENTRY = join(__dirname, "../packages/stellar/src/index.ts");

function arg(flag, fallback) {
  const i = process.argv.indexOf(flag);
  if (i >= 0 && process.argv[i + 1]) return process.argv[i + 1];
  return fallback;
}

async function verifyDirect(network, tx) {
  const { verifyRouterPayTx } = await import(pathToFileURL(STELLAR_ENTRY).href);
  return verifyRouterPayTx({
    network,
    txHash: tx,
    expectedContractId:
      network === "mainnet" ? EXPECTED_CONTRACT : undefined,
  });
}

function printOk(body) {
  console.log("OK verified settlement");
  console.log(`  network     ${body.network}`);
  console.log(`  contract    ${body.contract_id}`);
  console.log(`  merchant    ${body.merchant}`);
  console.log(`  treasury    ${body.treasury}`);
  console.log(`  net         ${body.net}`);
  console.log(`  fee         ${body.fee}`);
  console.log(`  reseller    ${body.reseller_fee}`);
  console.log(`  intent_id   ${body.intent_id}`);
  console.log(`  explorer    ${body.explorer_tx}`);
  if (body.merchant && body.treasury && body.merchant !== body.treasury) {
    console.log("  note        merchant ≠ treasury (third-party merchant)");
  } else if (body.merchant && body.treasury) {
    console.log("  note        self-pay (merchant = treasury)");
  }
}

const api = arg("--api", process.env.VIAPAY_API_PUBLIC_URL || DEFAULT_API).replace(
  /\/$/,
  "",
);
const network = arg("--network", DEFAULT_NETWORK);
const tx = arg("--tx", DEFAULT_TX).toLowerCase().replace(/^0x/, "");
const forceDirect = process.argv.includes("--direct");
const parityId = arg("--parity", null);
const runKit = process.argv.includes("--kit");

async function checkParity(id) {
  const url = `${api}/v1/parity/${encodeURIComponent(id)}`;
  console.log(`  GET ${url}`);
  const res = await fetch(url, { cache: "no-store" });
  const body = await res.json().catch(() => ({}));
  return { res, body, url };
}

if (parityId) {
  console.log("ViaPay rail-parity");
  const { res, body } = await checkParity(parityId);
  if (!res.ok) {
    console.error("FAIL", res.status, body);
    process.exit(1);
  }
  console.log(`  ok         ${body.ok}`);
  console.log(`  status     ${body.status}`);
  console.log(`  schemes    ${(body.schemes || []).join(", ")}`);
  if (body.mismatches?.length) {
    console.error("FAIL mismatches", body.mismatches);
    process.exit(1);
  }
  if (!body.ok) {
    console.error("FAIL parity ok!=true", body);
    process.exit(1);
  }
  console.log("OK rail-parity");
  process.exit(0);
}

if (runKit) {
  console.log("ViaPay judge kit (Proved-style public checks)");
  let failed = 0;

  // 1) parity real
  {
    const { res, body } = await checkParity(KIT_PARITY_ID);
    const surfaces = Object.keys(body.surfaces || {});
    const ok =
      res.ok &&
      body.ok === true &&
      Array.isArray(body.mismatches) &&
      body.mismatches.length === 0 &&
      surfaces.includes("intent") &&
      surfaces.includes("x402") &&
      surfaces.includes("paid");
    console.log(
      ok
        ? `OK parity ${KIT_PARITY_ID} surfaces=${surfaces.join(",")}`
        : `FAIL parity ${KIT_PARITY_ID}`,
      body.mismatches ?? body.error ?? "",
    );
    if (!ok) failed++;
  }

  // 2) fake id → 404 (not ok:true)
  {
    const { res, body } = await checkParity(KIT_FAKE_ID);
    const ok = res.status === 404;
    console.log(
      ok
        ? `OK fake parity id → 404`
        : `FAIL fake parity expected 404 got ${res.status}`,
      body,
    );
    if (!ok) failed++;
  }

  // 3) settle-proof paid → 200 + hash
  {
    const url = `${api}/v1/settle-proof/${KIT_PARITY_ID}`;
    console.log(`  GET ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    const hash =
      body.body?.stellar_tx_hash ||
      body.stellar_tx_hash ||
      body.proof?.stellar_tx_hash;
    const networkPaid = body.body?.network || body.network;
    const ok =
      res.ok &&
      typeof hash === "string" &&
      hash.length > 8 &&
      networkPaid === "testnet";
    console.log(
      ok
        ? `OK settle-proof paid hash=${hash.slice(0, 12)}… network=testnet`
        : `FAIL settle-proof paid`,
      res.status,
    );
    if (!ok) failed++;
  }

  // 4) settle-proof unpaid → 409
  {
    const url = `${api}/v1/settle-proof/${KIT_UNPAID_ID}`;
    console.log(`  GET ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    const ok = res.status === 409 && body.status === "unpaid";
    console.log(
      ok ? `OK settle-proof unpaid → 409` : `FAIL unpaid settle-proof`,
      res.status,
      body.status,
    );
    if (!ok) failed++;
  }

  // 5) mainnet third-party merchant
  {
    const url = `${api}/v1/verify?network=mainnet&tx_hash=${DEFAULT_TX}`;
    console.log(`  GET ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    const ok =
      res.ok &&
      body.verified === true &&
      body.event === "Paid" &&
      body.merchant &&
      body.treasury &&
      body.merchant !== body.treasury;
    console.log(
      ok
        ? `OK mainnet third-party merchant≠treasury`
        : `FAIL mainnet third-party`,
      body.merchant,
      body.treasury,
    );
    if (!ok) failed++;
  }

  // 6) self-pay still verifies (existence proof)
  {
    const url = `${api}/v1/verify?network=mainnet&tx_hash=${SELF_PAY_TX}`;
    console.log(`  GET ${url}`);
    const res = await fetch(url, { cache: "no-store" });
    const body = await res.json().catch(() => ({}));
    const ok = res.ok && body.verified === true && body.event === "Paid";
    console.log(ok ? `OK mainnet self-pay still verifies` : `FAIL self-pay`);
    if (!ok) failed++;
  }

  if (failed) {
    console.error(`FAIL judge kit: ${failed} check(s) failed`);
    process.exit(1);
  }
  console.log("OK judge kit — all checks green");
  process.exit(0);
}

console.log("ViaPay verify");

let body;
if (forceDirect) {
  console.log("  mode       direct (RPC via @viapay/stellar)");
  body = await verifyDirect(network, tx);
} else {
  const url = `${api}/v1/verify?network=${encodeURIComponent(network)}&tx_hash=${encodeURIComponent(tx)}`;
  console.log(`  GET ${url}`);
  const res = await fetch(url, { cache: "no-store" });
  body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.warn(
      `  API ${res.status} — falling back to direct RPC (deploy /v1/verify for HTTP path)`,
    );
    console.log("  mode       direct (RPC via @viapay/stellar)");
    try {
      body = await verifyDirect(network, tx);
    } catch (e) {
      console.error("FAIL", res.status, body.error ?? body);
      console.error("Direct RPC also failed:", e?.message ?? e);
      process.exit(1);
    }
  }
}

if (!body.verified) {
  console.error("FAIL: verified != true", body);
  process.exit(1);
}

if (
  network === "mainnet" &&
  body.contract_id &&
  body.contract_id !== EXPECTED_CONTRACT
) {
  console.error(
    "FAIL: unexpected contract",
    body.contract_id,
    "want",
    EXPECTED_CONTRACT,
  );
  process.exit(1);
}

printOk(body);
process.exit(0);
