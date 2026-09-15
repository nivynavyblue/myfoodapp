-- Shared groups: profiles, groups, membership, join-by-code RPCs,
-- restaurant sharing, and an append-only activity log.
-- Run this in Supabase SQL Editor after 0001_restaurants.sql.

-- ============================================================
-- profiles — mirrors auth.users(id, email) so the client can
-- show member emails / activity actors without querying auth.users
-- directly (blocked for the authenticated role).
-- ============================================================
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  email       text not null,
  created_at  timestamptz not null default now()
);

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email);
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();

-- Backfill profiles for any users that already existed before this migration.
insert into public.profiles (id, email)
select id, email from auth.users
on conflict (id) do nothing;

-- ============================================================
-- groups + group_members
-- ============================================================
create table if not exists public.groups (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(trim(name)) > 0),
  owner_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  join_code   text not null unique default upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8)),
  created_at  timestamptz not null default now()
);

create table if not exists public.group_members (
  group_id   uuid not null references public.groups (id) on delete cascade,
  user_id    uuid not null references auth.users (id) on delete cascade,
  role       text not null default 'member' check (role in ('owner', 'member')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);

create index if not exists group_members_user_id_idx on public.group_members (user_id);

-- SECURITY DEFINER helpers — used inside RLS policies to avoid the table
-- recursively evaluating its own policy against itself.
create or replace function public.is_group_member(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id and gm.user_id = auth.uid()
  );
$$;

grant execute on function public.is_group_member(uuid) to authenticated;

create or replace function public.shares_group_with(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm1
    join public.group_members gm2 on gm1.group_id = gm2.group_id
    where gm1.user_id = auth.uid() and gm2.user_id = p_user_id
  );
$$;

grant execute on function public.shares_group_with(uuid) to authenticated;

-- ============================================================
-- profiles RLS (declared after shares_group_with exists)
-- ============================================================
alter table public.profiles enable row level security;

drop policy if exists "profiles_select_self_or_groupmate" on public.profiles;
create policy "profiles_select_self_or_groupmate"
  on public.profiles
  for select
  to authenticated
  using (id = auth.uid() or public.shares_group_with(id));

-- ============================================================
-- RPCs that create membership rows — the ONLY way group_members
-- rows get inserted (there is no direct client insert policy).
-- ============================================================
create or replace function public.create_group(p_name text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  new_group public.groups;
begin
  insert into public.groups (name, owner_id)
  values (trim(p_name), auth.uid())
  returning * into new_group;

  insert into public.group_members (group_id, user_id, role)
  values (new_group.id, auth.uid(), 'owner');

  return new_group;
end;
$$;

grant execute on function public.create_group(text) to authenticated;

create or replace function public.join_group_by_code(p_code text)
returns public.groups
language plpgsql
security definer
set search_path = public
as $$
declare
  target_group public.groups;
begin
  select * into target_group
  from public.groups
  where join_code = upper(trim(p_code));

  if target_group.id is null then
    raise exception 'Invalid join code.';
  end if;

  insert into public.group_members (group_id, user_id, role)
  values (target_group.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;

  return target_group;
end;
$$;

grant execute on function public.join_group_by_code(text) to authenticated;

create or replace function public.regenerate_join_code(p_group_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if not exists (
    select 1 from public.groups where id = p_group_id and owner_id = auth.uid()
  ) then
    raise exception 'Only the group owner can regenerate the join code.';
  end if;

  new_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  update public.groups set join_code = new_code where id = p_group_id;
  return new_code;
end;
$$;

grant execute on function public.regenerate_join_code(uuid) to authenticated;

-- ============================================================
-- groups / group_members RLS
-- ============================================================
alter table public.groups enable row level security;

drop policy if exists "groups_select_member" on public.groups;
create policy "groups_select_member"
  on public.groups
  for select
  to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id));

drop policy if exists "groups_update_owner" on public.groups;
create policy "groups_update_owner"
  on public.groups
  for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "groups_delete_owner" on public.groups;
create policy "groups_delete_owner"
  on public.groups
  for delete
  to authenticated
  using (owner_id = auth.uid());

-- No insert policy: groups are only created via create_group().

alter table public.group_members enable row level security;

drop policy if exists "group_members_select_member" on public.group_members;
create policy "group_members_select_member"
  on public.group_members
  for select
  to authenticated
  using (public.is_group_member(group_id));

drop policy if exists "group_members_delete_self_or_owner" on public.group_members;
create policy "group_members_delete_self_or_owner"
  on public.group_members
  for delete
  to authenticated
  using (
    (user_id = auth.uid() and role <> 'owner')
    or exists (
      select 1 from public.groups g
      where g.id = group_members.group_id and g.owner_id = auth.uid()
    )
  );

-- No insert/update policy: membership rows are only ever created by the
-- SECURITY DEFINER RPCs above, and roles never change after creation.

-- ============================================================
-- restaurants: add sharing + rewrite RLS
-- ============================================================
alter table public.restaurants
  add column if not exists group_id uuid references public.groups (id) on delete set null;

alter table public.restaurants
  add column if not exists website text;

create index if not exists restaurants_group_id_idx on public.restaurants (group_id);

drop policy if exists "restaurants_select_own" on public.restaurants;
create policy "restaurants_select_own_or_shared"
  on public.restaurants
  for select
  to authenticated
  using (
    auth.uid() = user_id
    or (group_id is not null and public.is_group_member(group_id))
  );

drop policy if exists "restaurants_insert_own" on public.restaurants;
create policy "restaurants_insert_own_or_shared"
  on public.restaurants
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (group_id is null or public.is_group_member(group_id))
  );

drop policy if exists "restaurants_update_own" on public.restaurants;
create policy "restaurants_update_own_or_shared"
  on public.restaurants
  for update
  to authenticated
  using (
    auth.uid() = user_id
    or (group_id is not null and public.is_group_member(group_id))
  )
  with check (
    group_id is null or public.is_group_member(group_id)
  );

drop policy if exists "restaurants_delete_own" on public.restaurants;
create policy "restaurants_delete_own_or_shared"
  on public.restaurants
  for delete
  to authenticated
  using (
    auth.uid() = user_id
    or (group_id is not null and public.is_group_member(group_id))
  );

-- ============================================================
-- restaurant_activity — append-only audit log
-- ============================================================
create table if not exists public.restaurant_activity (
  id              uuid primary key default gen_random_uuid(),
  restaurant_id   uuid not null,
  group_id        uuid references public.groups (id) on delete cascade,
  restaurant_name text not null,
  action          text not null check (action in ('created', 'updated', 'deleted')),
  actor_id        uuid not null default auth.uid() references auth.users (id) on delete cascade,
  created_at      timestamptz not null default now()
);

create index if not exists restaurant_activity_group_id_idx on public.restaurant_activity (group_id, created_at desc);

alter table public.restaurant_activity enable row level security;

drop policy if exists "restaurant_activity_select_member" on public.restaurant_activity;
create policy "restaurant_activity_select_member"
  on public.restaurant_activity
  for select
  to authenticated
  using (group_id is not null and public.is_group_member(group_id));

drop policy if exists "restaurant_activity_insert_actor" on public.restaurant_activity;
create policy "restaurant_activity_insert_actor"
  on public.restaurant_activity
  for insert
  to authenticated
  with check (actor_id = auth.uid());

-- No update/delete policy anywhere: the log is immutable.

create or replace function public.log_restaurant_activity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if TG_OP = 'INSERT' then
    insert into public.restaurant_activity (restaurant_id, group_id, restaurant_name, action, actor_id)
    values (new.id, new.group_id, new.name, 'created', auth.uid());
    return new;
  elsif TG_OP = 'UPDATE' then
    insert into public.restaurant_activity (restaurant_id, group_id, restaurant_name, action, actor_id)
    values (new.id, new.group_id, new.name, 'updated', auth.uid());
    return new;
  elsif TG_OP = 'DELETE' then
    insert into public.restaurant_activity (restaurant_id, group_id, restaurant_name, action, actor_id)
    values (old.id, old.group_id, old.name, 'deleted', auth.uid());
    return old;
  end if;
  return null;
end;
$$;

drop trigger if exists log_restaurant_activity on public.restaurants;
create trigger log_restaurant_activity
  after insert or update or delete on public.restaurants
  for each row
  execute function public.log_restaurant_activity();
