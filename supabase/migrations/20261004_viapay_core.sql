-- ViaPay core schema (Postgres). Applied to project fcbdahduqesuotujqbez.

create table if not exists accounts (
  id text primary key,
  name text not null,
  email text not null unique,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists api_keys (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  name text not null,
  prefix text not null,
  secret_hash text not null,
  mode text not null default 'test',
  created_at timestamptz not null default now(),
  revoked_at timestamptz
);
create index if not exists idx_keys_prefix on api_keys(prefix);
create index if not exists idx_keys_account on api_keys(account_id);

create table if not exists wallets (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  address text not null,
  network text not null default 'testnet',
  verified_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_wallets_account on wallets(account_id);

create table if not exists payment_intents (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
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
  expires_at timestamptz not null,
  succeeded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_pi_account on payment_intents(account_id);
create index if not exists idx_pi_status on payment_intents(status);

create table if not exists webhook_endpoints (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  url text not null,
  secret text not null,
  status text not null default 'enabled',
  created_at timestamptz not null default now()
);
create index if not exists idx_wh_account on webhook_endpoints(account_id);

create table if not exists webhook_events (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  type text not null,
  payload text not null,
  created_at timestamptz not null default now()
);

create table if not exists webhook_deliveries (
  id text primary key,
  event_id text not null references webhook_events(id) on delete cascade,
  endpoint_id text not null references webhook_endpoints(id) on delete cascade,
  status text not null,
  attempts integer not null default 0,
  last_error text,
  next_attempt_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_wh_delivery_status on webhook_deliveries(status, next_attempt_at);

alter table accounts enable row level security;
alter table api_keys enable row level security;
alter table wallets enable row level security;
alter table payment_intents enable row level security;
alter table webhook_endpoints enable row level security;
alter table webhook_events enable row level security;
alter table webhook_deliveries enable row level security;
