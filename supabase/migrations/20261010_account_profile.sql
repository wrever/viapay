-- Merchant profile fields for panel /v1/me
alter table public.accounts
  add column if not exists business_name text,
  add column if not exists phone_e164 text,
  add column if not exists notify_email_paid boolean not null default true,
  add column if not exists notify_wa_paid boolean not null default true;

comment on column public.accounts.business_name is 'Optional trade/brand name shown in profile';
comment on column public.accounts.phone_e164 is 'Optional merchant contact phone E.164';
comment on column public.accounts.notify_email_paid is 'Email merchant when a charge succeeds';
comment on column public.accounts.notify_wa_paid is 'WhatsApp merchant when a charge succeeds (if WA linked)';
