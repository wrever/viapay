-- Short cobro codes VP-XXXX → payment_intent (estado WA / /c/[code])
create table if not exists public.payment_codes (
  code text primary key,
  payment_intent_id text not null references public.payment_intents(id) on delete cascade,
  created_at timestamptz not null default now()
);

create index if not exists idx_payment_codes_intent
  on public.payment_codes(payment_intent_id);

alter table public.payment_codes enable row level security;
