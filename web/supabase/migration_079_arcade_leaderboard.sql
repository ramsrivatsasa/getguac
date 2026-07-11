-- Public arcade leaderboard: top score per player per game.
-- game_scores is RLS-locked to its owner (migration_078); this SECURITY
-- DEFINER aggregate is the one sanctioned window into other players' bests,
-- exposing only a display handle + score — viewable logged-out too, so the
-- board doubles as a sign-in nudge on the game pages.
create or replace function public.arcade_leaderboard(p_game text, p_limit int default 10)
returns table (handle text, best int, plays bigint)
language sql stable security definer set search_path = public
as $$
  select coalesce(nullif(p.email_alias, ''), 'guac-' || left(s.user_id::text, 4)) as handle,
         max(s.score)::int as best,
         count(*) as plays
  from game_scores s
  left join profiles p on p.id = s.user_id
  where s.game = p_game
  group by s.user_id, p.email_alias
  order by best desc
  limit least(greatest(coalesce(p_limit, 10), 1), 50)
$$;

grant execute on function public.arcade_leaderboard(text, int) to anon, authenticated;
