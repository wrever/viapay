#!/usr/bin/env node
/**
 * Open Circle USDC trustline on the ViaPay treasury (testnet by default).
 *
 * Usage (never commit the secret):
 *   VIAPAY_TREASURY_SECRET_KEY=S… node scripts/open-treasury-usdc-trustline.mjs
 *
 * Optional:
 *   STELLAR_NETWORK=testnet|mainnet
 *   USDC_ISSUER=G…   (defaults to Circle issuer for the network)
 *   VIAPAY_TREASURY_ADDRESS=G…  (must match the secret's public key)
 *
 * Does not print the secret. Exits 0 if already trusted or after a successful submit.
 */
import {
  Asset,
  BASE_FEE,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "@stellar/stellar-sdk";

const NETWORK = (process.env.STELLAR_NETWORK ?? "testnet").trim();
const IS_MAINNET = NETWORK === "mainnet";
const HORIZON = IS_MAINNET
  ? "https://horizon.stellar.org"
  : "https://horizon-testnet.stellar.org";
const PASSPHRASE = IS_MAINNET ? Networks.PUBLIC : Networks.TESTNET;
const DEFAULT_ISSUER = IS_MAINNET
  ? "GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"
  : "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5";
const DEFAULT_TREASURY =
  "GDIN7HCR4PKKWS6MO57N7NF7VLGPO27GUQDR64TIK3CYRMPBCKUQDCT5";

function die(msg) {
  console.error(msg);
  process.exit(1);
}

const secret = process.env.VIAPAY_TREASURY_SECRET_KEY?.trim();
if (!secret) {
  die(
    "Falta VIAPAY_TREASURY_SECRET_KEY. Exportala en el shell (no la pegues en git) y reintentá.",
  );
}
if (!secret.startsWith("S") || secret.length < 56) {
  die("VIAPAY_TREASURY_SECRET_KEY no parece una secret key Stellar (S…).");
}

let kp;
try {
  kp = Keypair.fromSecret(secret);
} catch {
  die("VIAPAY_TREASURY_SECRET_KEY inválida.");
}

const expected =
  process.env.VIAPAY_TREASURY_ADDRESS?.trim() || DEFAULT_TREASURY;
if (kp.publicKey() !== expected) {
  die(
    `La secret no corresponde a la tesorería esperada (${expected.slice(0, 8)}…). Pública derivada: ${kp.publicKey().slice(0, 8)}…`,
  );
}

const issuer = process.env.USDC_ISSUER?.trim() || DEFAULT_ISSUER;
const usdc = new Asset("USDC", issuer);
const server = new Horizon.Server(HORIZON);

const account = await server.loadAccount(kp.publicKey());
const has = account.balances.some(
  (b) =>
    "asset_code" in b &&
    b.asset_code === "USDC" &&
    b.asset_issuer === issuer,
);
if (has) {
  console.log(
    `OK: ${kp.publicKey().slice(0, 8)}… ya tiene trustline USDC (${issuer.slice(0, 8)}…) en ${NETWORK}.`,
  );
  process.exit(0);
}

const tx = new TransactionBuilder(account, {
  fee: BASE_FEE,
  networkPassphrase: PASSPHRASE,
})
  .addOperation(Operation.changeTrust({ asset: usdc }))
  .setTimeout(180)
  .build();
tx.sign(kp);

try {
  const result = await server.submitTransaction(tx);
  console.log(
    `OK: trustline USDC abierta en tesorería ${kp.publicKey().slice(0, 8)}… · tx ${result.hash}`,
  );
} catch (err) {
  const detail =
    err?.response?.data?.extras?.result_codes ??
    err?.message ??
    String(err);
  die(`Falló submit: ${JSON.stringify(detail)}`);
}
