-- GetGuac Migration 094 — structured bill types for recurring bills.
-- Safe to re-run. Existing rows remain valid as "other".

alter table public.bill_series
  add column if not exists bill_type text not null default 'other';

alter table public.bill_series
  drop constraint if exists bill_series_bill_type_check;

alter table public.bill_series
  add constraint bill_series_bill_type_check check (
    bill_type in ('mortgage','car_payment','utilities','rent','insurance','subscription','loan','credit_card','taxes','other')
  );

create index if not exists bill_series_user_type_idx
  on public.bill_series (user_id, bill_type, is_active);

grant select, insert, update, delete on table public.bill_series
  to authenticated, service_role;

notify pgrst, 'reload schema';
