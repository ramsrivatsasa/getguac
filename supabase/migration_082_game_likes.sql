-- migration_082 — game likes
--
-- Real like counts for the arcade. Every number the tiles show comes from an
-- actual person pressing the button; nothing is seeded, backfilled or
-- synthesised. A game with no likes shows no count.
--
-- Works for our own games AND partner games: a like is about the card, not the
-- engine, so it's the one signal that can cover every game in the catalog
-- (partner games run cross-origin, so plays and scores are unobservable there).

create table if not exists public.game_likes (
  -- Slug from gamesList (href minus /games/). Deliberately NOT a foreign key:
  -- partner games live in a committed JSON catalog, not in the database, and
  -- the catalog is re-synced from the provider feeds.
  game        text        not null,
  user_id     uuid        not null references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now(),
  -- One like per person per game. Makes the toggle idempotent and stops the
  -- count being inflated by repeat presses.
  primary key (game, user_id)
);

create index if not exists game_likes_game_idx on public.game_likes (game);

alter table public.game_likes enable row level security;

-- Owner-only on the raw rows. A signed-in user may read, add and remove THEIR
-- OWN like and nothing else — who liked what is nobody else's business.
drop policy if exists "game_likes select own" on public.game_likes;
create policy "game_likes select own" on public.game_likes
  for select using (auth.uid() = user_id);

drop policy if exists "game_likes insert own" on public.game_likes;
create policy "game_likes insert own" on public.game_likes
  for insert with check (auth.uid() = user_id);

drop policy if exists "game_likes delete own" on public.game_likes;
create policy "game_likes delete own" on public.game_likes
  for delete using (auth.uid() = user_id);

-- Public counts. SECURITY DEFINER so it can see past the owner-only policy
-- above, but it returns ONLY (game, likes) — never a user_id — so it cannot
-- leak who liked what. This is the same shape as arcade_leaderboard.
--
-- search_path is pinned: a SECURITY DEFINER function without it can be
-- hijacked by a caller-controlled search_path.
create or replace function public.game_like_counts()
returns table (game text, likes bigint)
language sql
stable
security definer
set search_path = public
as $$
  select gl.game, count(*)::bigint as likes
  from public.game_likes gl
  group by gl.game
$$;

grant execute on function public.game_like_counts() to anon, authenticated;

-- Count for a single game, for the game page.
create or replace function public.game_like_count(p_game text)
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::bigint from public.game_likes where game = p_game
$$;

grant execute on function public.game_like_count(text) to anon, authenticated;
