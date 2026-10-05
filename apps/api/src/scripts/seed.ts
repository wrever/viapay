import fs from "node:fs";
import path from "node:path";
import { generatePrefixedId } from "@viapay/shared";
import { generateApiKey } from "../lib/auth";
import { getDb, migrate } from "../lib/db";

const MERCHANT_WALLET =
  process.env.SEED_MERCHANT_WALLET ??
  "GAXLJHCMV6ZATLOI4SWBONOCS27KSBY55DGFNLWEM35NCU256OPBJMRS";

function main() {
  migrate(getDb());
  const db = getDb();
  const now = new Date().toISOString();

  const existing = db
    .prepare(`select id from accounts where email = ?`)
    .get("merchant@viapay.dev") as { id: string } | undefined;

  let accountId = existing?.id;
  if (!accountId) {
    accountId = generatePrefixedId("acct");
    db.prepare(
      `insert into accounts (id, name, email, status, created_at, updated_at)
       values (?, ?, ?, 'active', ?, ?)`,
    ).run(accountId, "Demo Merchant", "merchant@viapay.dev", now, now);
  }

  const wallet = db
    .prepare(`select id from wallets where account_id = ?`)
    .get(accountId) as { id: string } | undefined;
  if (!wallet) {
    db.prepare(
      `insert into wallets (id, account_id, address, network, verified_at, created_at)
       values (?, ?, ?, 'testnet', ?, ?)`,
    ).run(generatePrefixedId("wlt"), accountId, MERCHANT_WALLET, now, now);
  } else {
    db.prepare(
      `update wallets set address = ?, verified_at = ? where account_id = ?`,
    ).run(MERCHANT_WALLET, now, accountId);
  }

  // revoke old demo keys and mint fresh
  db.prepare(
    `update api_keys set revoked_at = ? where account_id = ? and revoked_at is null`,
  ).run(now, accountId);

  const key = generateApiKey("test");
  db.prepare(
    `insert into api_keys (id, account_id, name, prefix, secret_hash, mode, created_at)
     values (?, ?, 'Demo dashboard key', ?, ?, 'test', ?)`,
  ).run(key.id, accountId, key.prefix, key.secretHash, now);

  const out = {
    account_id: accountId,
    merchant_wallet: MERCHANT_WALLET,
    api_key: key.secret,
    note: "Local seed — regenera con pnpm db:seed",
  };

  const dataDir = path.resolve(process.cwd(), "../../data");
  fs.mkdirSync(dataDir, { recursive: true });
  fs.writeFileSync(
    path.join(dataDir, "seed.local.json"),
    JSON.stringify(out, null, 2),
  );
  console.log(JSON.stringify(out, null, 2));
}

main();
