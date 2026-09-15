-- Restaurant Index: table + RLS policies
-- Run this in Supabase SQL Editor (or via `supabase db push`).

create extension if not exists "pgcrypto"; -- for gen_random_uuid()

create table if not exists public.restaurants (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name        text not null check (char_length(trim(name)) > 0),
  phone       text not null check (char_length(trim(phone)) > 0),
  whatsapp    text,
  address     text,
  tags        text[] not null default '{}',
  notes       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

comment on table public.restaurants is 'Per-user restaurant index entries.';

create index if not exists restaurants_user_id_idx on public.restaurants (user_id);
create index if not exists restaurants_tags_idx on public.restaurants using gin (tags);

-- Keep updated_at current on every row update.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists set_restaurants_updated_at on public.restaurants;
create trigger set_restaurants_updated_at
  before update on public.restaurants
  for each row
  execute function public.set_updated_at();

-- Row Level Security: each user only ever sees/touches their own rows.
alter table public.restaurants enable row level security;

drop policy if exists "restaurants_select_own" on public.restaurants;
create policy "restaurants_select_own"
  on public.restaurants
  for select
  to authenticated
  using (auth.uid() = user_id);

drop policy if exists "restaurants_insert_own" on public.restaurants;
create policy "restaurants_insert_own"
  on public.restaurants
  for insert
  to authenticated
  with check (auth.uid() = user_id);

drop policy if exists "restaurants_update_own" on public.restaurants;
create policy "restaurants_update_own"
  on public.restaurants
  for update
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "restaurants_delete_own" on public.restaurants;
create policy "restaurants_delete_own"
  on public.restaurants
  for delete
  to authenticated
  using (auth.uid() = user_id);
