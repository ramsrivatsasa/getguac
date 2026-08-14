-- Enforce the registration UI's promise that an unconfirmed handle is reserved.
-- Keep the oldest existing reservation if historical duplicates exist.
with ranked as (
  select user_id,
         row_number() over (
           partition by lower(requested_username)
           order by created_at, user_id
         ) as reservation_rank
    from public.signups
   where requested_username is not null
     and confirmed_at is null
)
update public.signups s
   set requested_username = null
  from ranked r
 where s.user_id = r.user_id
   and r.reservation_rank > 1;

create unique index if not exists signups_unconfirmed_username_unique_idx
  on public.signups (lower(requested_username))
  where requested_username is not null and confirmed_at is null;

