-- Per-charge Stellar network (testnet | mainnet | local). Checkout/prepare/submit use this, not only STELLAR_NETWORK env.
alter table payment_intents
  add column if not exists network text not null default 'testnet';

create index if not exists idx_pi_network on payment_intents(network);
