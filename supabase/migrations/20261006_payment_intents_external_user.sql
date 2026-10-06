-- Link payment intents to the merchant's own end-customer ids.
alter table payment_intents add column if not exists external_user_id text;
alter table payment_intents add column if not exists metadata text;
create index if not exists idx_pi_external_user on payment_intents(account_id, external_user_id);
