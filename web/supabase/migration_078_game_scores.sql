-- Guac Arcade high scores for signed-in players.
-- Games stay fully playable logged-out (localStorage best); when a session
-- exists the client also records each finished game here, best-effort.
create table if not exists public.game_scores (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  game text not null,
  score integer not null default 0,
  level integer,
  created_at timestamptz not null default now()
);

create index if not exists game_scores_user_game_idx
  on public.game_scores (user_id, game, score desc);

alter table public.game_scores enable row level security;

drop policy if exists "game_scores select own" on public.game_scores;
create policy "game_scores select own" on public.game_scores
  for select using (auth.uid() = user_id);

drop policy if exists "game_scores insert own" on public.game_scores;
create policy "game_scores insert own" on public.game_scores
  for insert with check (auth.uid() = user_id);

-- Arcade GuacMoney: the first finished round of each game each day earns
-- GuacMoney (client shows +50 per gameScores.js GM_PER_FIRST_PLAY).
-- This aggregate returns how many (game, day) firsts the caller has banked;
-- guacMoney.js multiplies by the per-day award client-side.
create or replace function public.arcade_gm_days()
returns integer
language sql stable
as $$
  select coalesce(count(distinct (game, created_at::date)), 0)::int
  from public.game_scores
  where user_id = auth.uid()
$$;

grant execute on function public.arcade_gm_days() to authenticated;
