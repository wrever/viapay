/**
 * Example: an AI agent paying a ViaPay cobro over HTTP 402.
 *
 * The agent never sees the dashboard. It asks for a resource, gets a 402 with
 * the payment terms, signs the envelope ViaPay prepares, and retries with an
 * `X-PAYMENT` header.
 *
 *   # merchant side, once:
 *   pnpm db:seed && pnpm dev:api
 *
 *   # agent side:
 *   VIAPAY_API_KEY=sk_test_…            # only to create the demo cobro
 *   AGENT_SECRET_KEY=S…                 # the agent's own funded testnet key
 *   ASSET=XLM                           # XLM needs no trustline; USDC is the default
 *   AMOUNT=20                           # optional, defaults to 100
 *   RESELLER_ADDRESS=G…                 # optional, to see the 3-way split
 *   RESELLER_FEE_BPS=700                # optional, defaults to 300 (3%)
 *   node examples/agent-pay.mjs
 *
 * Without AGENT_SECRET_KEY the script stops right after printing the 402, which
 * is still the interesting half: the challenge is the public contract.
 */
import { Keypair, TransactionBuilder } from "@stellar/stellar-sdk";

const API = (process.env.VIAPAY_API_URL ?? "http://localhost:3001").replace(/\/$/, "");
const apiKey = process.env.VIAPAY_API_KEY;
const agentSecret = process.env.AGENT_SECRET_KEY;
const resellerAddress = process.env.RESELLER_ADDRESS;
const asset = process.env.ASSET === "XLM" ? "XLM" : "USDC";
const amount = Number(process.env.AMOUNT ?? 100).toFixed(7);
const resellerFeeBps = Number(process.env.RESELLER_FEE_BPS ?? 300);

if (!apiKey) {
  console.error("Falta VIAPAY_API_KEY (sale de data/seed.local.json tras pnpm db:seed)");
  process.exit(1);
}

function money(share) {
  return `${share.amount.replace(/0+$/, "").replace(/\.$/, "")} (${share.share})`;
}

// 1. The merchant creates the cobro. Normally this already happened.
const createRes = await fetch(`${API}/v1/payment_intents`, {
  method: "POST",
  headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
  body: JSON.stringify({
    amount,
    asset,
    description: "Serie de precios, acceso por llamada",
    ...(resellerAddress
      ? { reseller_fee_bps: resellerFeeBps, reseller_address: resellerAddress }
      : {}),
  }),
});
const intent = await createRes.json();
if (!createRes.ok) {
  console.error("No se pudo crear el cobro:", intent.error ?? createRes.status);
  process.exit(1);
}

const resource = `${API}/v1/x402/${intent.id}?client_secret=${encodeURIComponent(
  intent.client_secret,
)}`;
console.log(`→ GET /v1/x402/${intent.id}`);

// 2. The agent asks for the resource and is told the price.
const challengeRes = await fetch(resource);
const challenge = await challengeRes.json();

if (challengeRes.status !== 402) {
  console.log(`← ${challengeRes.status}`, challenge);
  process.exit(challengeRes.ok ? 0 : 1);
}

const terms = challenge.accepts[0];
console.log(`← 402 Payment Required  (x402Version ${challenge.x402Version})`);
console.log(`  scheme   ${terms.scheme} · network ${terms.network}`);
console.log(`  total    ${challenge.viapay.amount} ${challenge.viapay.asset}`);
console.log(`  atomic   ${terms.maxAmountRequired}`);
for (const share of challenge.viapay.breakdown) {
  console.log(`  ${share.role.padEnd(16)} ${share.address.slice(0, 8)}…  ${money(share)}`);
}

if (!agentSecret) {
  console.log("\nSin AGENT_SECRET_KEY no firmo nada. Hasta acá llega la demo.");
  process.exit(0);
}

// 3. ViaPay builds the envelope with every leg of the split already in it.
const agent = Keypair.fromSecret(agentSecret);
console.log(`\n→ POST ${challenge.viapay.settle.prepare.url}`);
const prepareRes = await fetch(challenge.viapay.settle.prepare.url, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    client_secret: intent.client_secret,
    source: agent.publicKey(),
  }),
});
const prepared = await prepareRes.json();
if (!prepareRes.ok) {
  console.error("← prepare falló:", prepared.error ?? prepareRes.status);
  process.exit(1);
}
console.log(`← 200 xdr (${prepared.xdr.length} chars), trustline incluida: ${prepared.included_trustline}`);

// 4. The agent signs locally. Its key never leaves this process.
const tx = TransactionBuilder.fromXDR(prepared.xdr, prepared.network_passphrase);
tx.sign(agent);
const paymentHeader = Buffer.from(
  JSON.stringify({
    x402Version: 2,
    scheme: terms.scheme,
    network: terms.network,
    payload: { signed_xdr: tx.toXDR() },
  }),
).toString("base64");

// 5. Retry with the payment attached.
console.log(`→ POST /v1/x402/${intent.id}  + X-PAYMENT`);
const settleRes = await fetch(resource, {
  method: "POST",
  headers: { "Content-Type": "application/json", "X-PAYMENT": paymentHeader },
  body: JSON.stringify({}),
});
const settled = await settleRes.json();
if (!settleRes.ok) {
  console.error(`← ${settleRes.status}`, settled.error ?? settled);
  process.exit(1);
}

console.log(`← 200 status=${settled.status}`);
console.log(`  tx ${settled.stellar_tx_hash}`);
console.log(`  receipt ${settleRes.headers.get("x-payment-response")}`);
