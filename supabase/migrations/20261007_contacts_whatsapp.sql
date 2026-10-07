-- Contacts + WhatsApp assistant (Twilio sandbox)

create table if not exists contacts (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  display_name text not null,
  phone_e164 text,
  email text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_contacts_account on contacts(account_id);

create table if not exists wa_links (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  phone_e164 text not null unique,
  status text not null default 'active',
  linked_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
create index if not exists idx_wa_links_account on wa_links(account_id);

create table if not exists wa_link_codes (
  id text primary key,
  account_id text not null references accounts(id) on delete cascade,
  code text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists idx_wa_link_codes_code on wa_link_codes(code);

create table if not exists wa_sessions (
  phone_e164 text primary key,
  account_id text references accounts(id) on delete set null,
  state text not null default 'idle',
  draft text not null default '{}',
  updated_at timestamptz not null default now()
);

alter table contacts enable row level security;
alter table wa_links enable row level security;
alter table wa_link_codes enable row level security;
alter table wa_sessions enable row level security;
