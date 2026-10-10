#!/usr/bin/env node
/**
 * Minimal MCP-style stdio tool server for ViaPay rails (Local402-inspired discovery).
 * Tools: viapay_rails, viapay_verify, viapay_parity, viapay_health.
 *
 * Run: node scripts/mcp-viapay.mjs
 * Or wire in Cursor MCP config pointing at this script.
 *
 * Protocol: simplified JSON-RPC over stdin/stdout (tools/list + tools/call).
 */
import { createInterface } from "node:readline";

const API = (
  process.env.VIAPAY_API_PUBLIC_URL || "https://viapay-api.vercel.app"
).replace(/\/$/, "");

const TOOLS = [
  {
    name: "viapay_rails",
    description: "Fetch ViaPay settlement infrastructure manifest (GET /v1/rails)",
    inputSchema: { type: "object", properties: {} },
  },
  {
    name: "viapay_verify",
    description:
      "Verify a Soroban payment-router pay() transaction (GET /v1/verify)",
    inputSchema: {
      type: "object",
      properties: {
        tx_hash: { type: "string" },
        network: { type: "string", enum: ["testnet", "mainnet"] },
      },
      required: ["tx_hash"],
    },
  },
  {
    name: "viapay_parity",
    description:
      "Check rail-parity for a payment_intent (intent ≡ x402 ≡ Paid)",
    inputSchema: {
      type: "object",
      properties: {
        payment_intent_id: { type: "string" },
      },
      required: ["payment_intent_id"],
    },
  },
  {
    name: "viapay_health",
    description: "Public ViaPay health JSON (networks, seps, evidence)",
    inputSchema: { type: "object", properties: {} },
  },
];

const FALLBACK_RAILS = {
  product: "ViaPay",
  role: "settlement_infrastructure",
  primitive: "payment_intent",
  note: "API /v1/rails not deployed yet — bundled discovery fallback",
  verify: {
    cli: "pnpm verify",
    url: `${API}/v1/verify`,
    example: `${API}/v1/verify?network=mainnet&tx_hash=b28aafbdce81e0b01e9cb3d2e3d0c037d3f5742a4d7a1b557612d6e12028380e`,
  },
  onchain: {
    settlement: "payment-router",
    function: "pay",
    event: "Paid",
    networks: {
      mainnet: {
        payment_router:
          "CA4FJAYS6WBH2JWGLIOT4PBV3FDCPWUYMPDRY2SKD5UYJYRGGZP7LQ2U",
      },
      testnet: {
        payment_router:
          "CDI6XC5QTHOYUQQ2EU542OLA2ZB7ZP4PB5ANNX5YZO3FMBDPIAV7LPRT",
      },
    },
  },
  evidence_page: "https://viapay.vercel.app/evidence",
  health: `${API}/v1/health`,
};

async function callTool(name, args = {}) {
  if (name === "viapay_rails") {
    const res = await fetch(`${API}/v1/rails`);
    if (!res.ok) return FALLBACK_RAILS;
    return await res.json();
  }
  if (name === "viapay_health") {
    const res = await fetch(`${API}/v1/health`);
    return await res.json();
  }
  if (name === "viapay_verify") {
    const network = args.network || "mainnet";
    const tx = String(args.tx_hash || "").toLowerCase();
    const res = await fetch(
      `${API}/v1/verify?network=${encodeURIComponent(network)}&tx_hash=${encodeURIComponent(tx)}`,
    );
    if (res.ok) return await res.json();
    return {
      error: "verify_endpoint_unavailable",
      hint: "Run: pnpm verify -- --direct --tx <hash> --network " + network,
      status: res.status,
      tx_hash: tx,
      network,
    };
  }
  if (name === "viapay_parity") {
    const id = String(args.payment_intent_id || "");
    const res = await fetch(`${API}/v1/parity/${encodeURIComponent(id)}`);
    return await res.json();
  }
  throw new Error(`Unknown tool: ${name}`);
}

function reply(id, result) {
  process.stdout.write(JSON.stringify({ jsonrpc: "2.0", id, result }) + "\n");
}

function replyError(id, message) {
  process.stdout.write(
    JSON.stringify({
      jsonrpc: "2.0",
      id,
      error: { code: -32000, message },
    }) + "\n",
  );
}

const rl = createInterface({ input: process.stdin, crlfDelay: Infinity });

rl.on("line", async (line) => {
  let msg;
  try {
    msg = JSON.parse(line);
  } catch {
    return;
  }
  const { id, method, params } = msg;
  try {
    if (method === "initialize") {
      reply(id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: {} },
        serverInfo: { name: "viapay", version: "0.1.0" },
      });
      return;
    }
    if (method === "tools/list") {
      reply(id, { tools: TOOLS });
      return;
    }
    if (method === "tools/call") {
      const name = params?.name;
      const args = params?.arguments ?? {};
      const data = await callTool(name, args);
      reply(id, {
        content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      });
      return;
    }
    if (method === "notifications/initialized" || method === "ping") {
      if (id != null) reply(id, {});
      return;
    }
    replyError(id, `Unsupported method: ${method}`);
  } catch (e) {
    replyError(id, e instanceof Error ? e.message : String(e));
  }
});
