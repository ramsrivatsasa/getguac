-- Public reading, authenticated submissions, server-only moderation and writes.
begin;
create table if not exists public.article_reactions (
 article_slug text not null check (length(article_slug) between 1 and 180),
 user_id uuid not null references auth.users(id) on delete cascade,
 reaction smallint not null check (reaction in (-1, 1)),
 updated_at timestamptz not null default now(),
 primary key(article_slug, user_id)
);
create table if not exists public.article_comments (
 id uuid primary key default gen_random_uuid(),
 article_slug text not null check (length(article_slug) between 1 and 180),
 user_id uuid not null references auth.users(id) on delete cascade,
 display_name text not null default 'Reader' check (length(display_name) between 1 and 40),
 body text not null check (length(body) between 2 and 2000),
 status text not null default 'pending' check (status in ('pending','approved','rejected')),
 created_at timestamptz not null default now(),
 moderated_at timestamptz,
 moderated_by uuid references auth.users(id) on delete set null
);
create index if not exists article_comments_page_status on public.article_comments(article_slug,status,created_at desc);
alter table public.article_reactions enable row level security;
alter table public.article_comments enable row level security;
-- All API writes use service role after validated getUser(); no direct client
-- write policies allow bypassing status, rate limits or permitted article IDs.
revoke all on public.article_reactions, public.article_comments from anon, authenticated;
grant all on public.article_reactions, public.article_comments to service_role;
commit;
notify pgrst, 'reload schema';
