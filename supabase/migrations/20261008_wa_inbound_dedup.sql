-- Idempotency for Meta webhook retries (wamid)

create table if not exists wa_inbound_dedup (
  message_id text primary key,
  phone_e164 text,
  phone_number_id text,
  created_at timestamptz not null default now()
);
create index if not exists idx_wa_inbound_dedup_created on wa_inbound_dedup(created_at);

alter table wa_inbound_dedup enable row level security;
