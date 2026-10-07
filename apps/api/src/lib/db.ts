import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let singleton: Database.Database | null = null;

export function getDbPath(): string {
  const raw =
    process.env.VIAPAY_DATABASE_PATH ??
    path.resolve(process.cwd(), "../../data/viapay.db");
  return path.isAbsolute(raw) ? raw : path.resolve(process.cwd(), raw);
}

export function getDb(): Database.Database {
  if (singleton) return singleton;
  const dbPath = getDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");
  singleton = db;
  return db;
}

export function migrate(db = getDb()): void {
  db.exec(`
    create table if not exists accounts (
      id text primary key,
      name text not null,
      email text not null,
      status text not null default 'active',
      created_at text not null,
      updated_at text not null
    );

    create table if not exists api_keys (
      id text primary key,
      account_id text not null references accounts(id),
      name text not null,
      prefix text not null,
      secret_hash text not null,
      mode text not null default 'test',
      created_at text not null,
      revoked_at text
    );

    create table if not exists wallets (
      id text primary key,
      account_id text not null references accounts(id),
      address text not null,
      network text not null default 'testnet',
      verified_at text,
      created_at text not null
    );

    create table if not exists payment_intents (
      id text primary key,
      account_id text not null references accounts(id),
      status text not null,
      amount text not null,
      fee_amount text not null,
      net_amount text not null,
      fee_bps integer not null,
      reseller_fee_bps integer not null default 0,
      reseller_amount text not null default '0.0000000',
      reseller_address text,
      asset_code text not null,
      merchant_wallet text not null,
      description text,
      client_secret text not null,
      success_url text,
      cancel_url text,
      stellar_tx_hash text,
      expires_at text not null,
      succeeded_at text,
      created_at text not null,
      updated_at text not null
    );

    create index if not exists idx_pi_account on payment_intents(account_id);
    create index if not exists idx_keys_prefix on api_keys(prefix);

    create table if not exists webhook_endpoints (
      id text primary key,
      account_id text not null references accounts(id),
      url text not null,
      secret text not null,
      status text not null default 'enabled',
      created_at text not null
    );

    create table if not exists webhook_events (
      id text primary key,
      account_id text not null references accounts(id),
      type text not null,
      payload text not null,
      created_at text not null
    );

    create table if not exists webhook_deliveries (
      id text primary key,
      event_id text not null references webhook_events(id),
      endpoint_id text not null references webhook_endpoints(id),
      status text not null,
      attempts integer not null default 0,
      last_error text,
      next_attempt_at text,
      created_at text not null
    );

    create index if not exists idx_wh_account on webhook_endpoints(account_id);
    create index if not exists idx_wh_delivery_status on webhook_deliveries(status, next_attempt_at);

    create table if not exists contacts (
      id text primary key,
      account_id text not null references accounts(id),
      display_name text not null,
      phone_e164 text,
      email text,
      notes text,
      created_at text not null,
      updated_at text not null
    );
    create index if not exists idx_contacts_account on contacts(account_id);

    create table if not exists wa_links (
      id text primary key,
      account_id text not null references accounts(id),
      phone_e164 text not null unique,
      status text not null default 'active',
      linked_at text not null,
      created_at text not null
    );
    create index if not exists idx_wa_links_account on wa_links(account_id);

    create table if not exists wa_link_codes (
      id text primary key,
      account_id text not null references accounts(id),
      code text not null,
      expires_at text not null,
      created_at text not null
    );
    create index if not exists idx_wa_link_codes_code on wa_link_codes(code);

    create table if not exists wa_sessions (
      phone_e164 text primary key,
      account_id text,
      state text not null default 'idle',
      draft text not null default '{}',
      updated_at text not null
    );
  `);

  addColumns(db, "payment_intents", {
    reseller_fee_bps: "integer not null default 0",
    reseller_amount: "text not null default '0.0000000'",
    reseller_address: "text",
    external_user_id: "text",
    metadata: "text",
  });
}

/** sqlite has no `add column if not exists`, so check the table first. */
function addColumns(
  db: Database.Database,
  table: string,
  columns: Record<string, string>,
): void {
  const existing = new Set(
    (db.prepare(`pragma table_info(${table})`).all() as { name: string }[]).map(
      (column) => column.name,
    ),
  );
  for (const [name, definition] of Object.entries(columns)) {
    if (existing.has(name)) continue;
    db.exec(`alter table ${table} add column ${name} ${definition}`);
  }
}
