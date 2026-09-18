-- Comments and thumbs up/down votes on group restaurants.
--
--   * Any member of the restaurant's group can read and write comments.
--   * Comments are 1-200 characters; only the author can delete (no edits).
--   * Members vote on comments of others (not their own); one vote per user.
-- Group membership is resolved through the restaurant's *current* group_id
-- (no denormalized copy), so moving/unlinking a restaurant is handled.

-- ============================================================
-- Helpers
-- ============================================================
create or replace function public.can_access_restaurant_comments(p_restaurant_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.restaurants r
    where r.id = p_restaurant_id
      and r.group_id is not null
      and public.is_group_member(r.group_id)
  );
$$;

revoke execute on function public.can_access_restaurant_comments(uuid) from public, anon;
grant execute on function public.can_access_restaurant_comments(uuid) to authenticated;

-- ============================================================
-- Tables
-- ============================================================
create table if not exists public.restaurant_comments (
  id            uuid primary key default gen_random_uuid(),
  restaurant_id uuid not null references public.restaurants(id) on delete cascade,
  user_id       uuid not null default auth.uid() references auth.users(id) on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now(),
  constraint restaurant_comments_body_len
    check (char_length(btrim(body)) between 1 and 200)
);

create index if not exists restaurant_comments_restaurant_idx
  on public.restaurant_comments (restaurant_id);

create table if not exists public.comment_votes (
  comment_id uuid not null references public.restaurant_comments(id) on delete cascade,
  user_id    uuid not null default auth.uid() references auth.users(id) on delete cascade,
  value      smallint not null check (value in (1, -1)),
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);

-- True when the caller may vote on the comment: member of the group and not
-- the comment's author. Defined after the tables (SQL bodies are validated).
create or replace function public.can_vote_comment(p_comment_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.restaurant_comments c
    where c.id = p_comment_id
      and c.user_id <> auth.uid()
      and public.can_access_restaurant_comments(c.restaurant_id)
  );
$$;

revoke execute on function public.can_vote_comment(uuid) from public, anon;
grant execute on function public.can_vote_comment(uuid) to authenticated;

-- ============================================================
-- RLS
-- ============================================================
alter table public.restaurant_comments enable row level security;
alter table public.comment_votes enable row level security;

drop policy if exists "restaurant_comments_select_group" on public.restaurant_comments;
create policy "restaurant_comments_select_group"
  on public.restaurant_comments for select to authenticated
  using (public.can_access_restaurant_comments(restaurant_id));

drop policy if exists "restaurant_comments_insert_member" on public.restaurant_comments;
create policy "restaurant_comments_insert_member"
  on public.restaurant_comments for insert to authenticated
  with check (
    user_id = auth.uid()
    and public.can_access_restaurant_comments(restaurant_id)
  );

drop policy if exists "restaurant_comments_delete_own" on public.restaurant_comments;
create policy "restaurant_comments_delete_own"
  on public.restaurant_comments for delete to authenticated
  using (user_id = auth.uid());

-- Votes are visible wherever the comment is (the subquery is filtered by the
-- comments SELECT policy).
drop policy if exists "comment_votes_select_group" on public.comment_votes;
create policy "comment_votes_select_group"
  on public.comment_votes for select to authenticated
  using (
    exists (select 1 from public.restaurant_comments c where c.id = comment_id)
  );

drop policy if exists "comment_votes_insert_own" on public.comment_votes;
create policy "comment_votes_insert_own"
  on public.comment_votes for insert to authenticated
  with check (user_id = auth.uid() and public.can_vote_comment(comment_id));

drop policy if exists "comment_votes_update_own" on public.comment_votes;
create policy "comment_votes_update_own"
  on public.comment_votes for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid() and public.can_vote_comment(comment_id));

drop policy if exists "comment_votes_delete_own" on public.comment_votes;
create policy "comment_votes_delete_own"
  on public.comment_votes for delete to authenticated
  using (user_id = auth.uid());

-- ============================================================
-- Per-restaurant comment counts (respects the caller's RLS)
-- ============================================================
create or replace view public.restaurant_comment_counts
  with (security_invoker = true) as
  select restaurant_id, count(*)::int as comment_count
  from public.restaurant_comments
  group by restaurant_id;

revoke all on public.restaurant_comment_counts from public, anon;
grant select on public.restaurant_comment_counts to authenticated;
