-- Group roles (owner / editor / member) and editable user profiles.
--
--   * owner  : full control of the group (also edits restaurants).
--   * editor : may add / edit / delete the group's shared restaurants.
--   * member : read-only.
-- Existing 'member' rows become 'editor' to preserve current behaviour (every
-- member could edit before); new joiners still land as 'member'.

-- ============================================================
-- Roles
-- ============================================================
alter table public.group_members
  drop constraint if exists group_members_role_check;

update public.group_members set role = 'editor' where role = 'member';

alter table public.group_members
  add constraint group_members_role_check
  check (role in ('owner', 'editor', 'member'));

create or replace function public.can_edit_group(p_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.group_members gm
    where gm.group_id = p_group_id
      and gm.user_id = auth.uid()
      and gm.role in ('owner', 'editor')
  );
$$;

revoke execute on function public.can_edit_group(uuid) from public, anon;
grant execute on function public.can_edit_group(uuid) to authenticated;

-- Owner-only role changes. Membership rows still have no client update policy.
create or replace function public.set_member_role(
  p_group_id uuid,
  p_user_id uuid,
  p_role text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_role not in ('editor', 'member') then
    raise exception 'Invalid role.';
  end if;

  if not exists (
    select 1 from public.groups g
    where g.id = p_group_id and g.owner_id = auth.uid()
  ) then
    raise exception 'Only the group owner can change roles.';
  end if;

  update public.group_members
  set role = p_role
  where group_id = p_group_id
    and user_id = p_user_id
    and role <> 'owner';

  if not found then
    raise exception 'Member not found.';
  end if;
end;
$$;

revoke execute on function public.set_member_role(uuid, uuid, text) from public, anon;
grant execute on function public.set_member_role(uuid, uuid, text) to authenticated;

-- ============================================================
-- restaurants: writes require edit rights on the group
-- (select policy is unchanged: any member can read)
-- ============================================================
drop policy if exists "restaurants_insert_own_or_shared" on public.restaurants;
create policy "restaurants_insert_own_or_shared"
  on public.restaurants
  for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and (group_id is null or public.can_edit_group(group_id))
  );

drop policy if exists "restaurants_update_own_or_shared" on public.restaurants;
create policy "restaurants_update_own_or_shared"
  on public.restaurants
  for update
  to authenticated
  using (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and public.can_edit_group(group_id))
  )
  with check (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and public.can_edit_group(group_id))
  );

drop policy if exists "restaurants_delete_own_or_shared" on public.restaurants;
create policy "restaurants_delete_own_or_shared"
  on public.restaurants
  for delete
  to authenticated
  using (
    (group_id is null and auth.uid() = user_id)
    or (group_id is not null and public.can_edit_group(group_id))
  );

-- The creator must stay the creator: an editor could otherwise reassign
-- user_id (the update policy no longer pins it to the caller).
create or replace function public.prevent_user_id_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.user_id is distinct from old.user_id then
    raise exception 'user_id cannot be changed.';
  end if;
  return new;
end;
$$;

drop trigger if exists restaurants_prevent_user_id_change on public.restaurants;
create trigger restaurants_prevent_user_id_change
  before update on public.restaurants
  for each row
  execute function public.prevent_user_id_change();

-- ============================================================
-- Profiles: name, avatar, bio
-- ============================================================
alter table public.profiles
  add column if not exists display_name text,
  add column if not exists avatar_url text,
  add column if not exists bio text;

alter table public.profiles
  drop constraint if exists profiles_display_name_len,
  drop constraint if exists profiles_bio_len,
  drop constraint if exists profiles_avatar_url_scheme;

alter table public.profiles
  add constraint profiles_display_name_len check (char_length(display_name) <= 60),
  add constraint profiles_bio_len check (char_length(bio) <= 280),
  -- avatar_url is user-writable; only http(s) may ever be stored (see 0003).
  add constraint profiles_avatar_url_scheme check (avatar_url is null or avatar_url ~* '^https?://');

-- Default name for existing accounts: the part of the email before the @.
update public.profiles
set display_name = left(split_part(email, '@', 1), 60)
where display_name is null or trim(display_name) = '';

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name, bio)
  values (
    new.id,
    new.email,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        split_part(new.email, '@', 1)
      ),
      60
    ),
    left(nullif(trim(new.raw_user_meta_data ->> 'bio'), ''), 280)
  );
  return new;
end;
$$;

-- Users may edit only their own row, and only these columns (never email/id).
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self"
  on public.profiles
  for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

revoke update on public.profiles from authenticated, anon;
grant update (display_name, avatar_url, bio) on public.profiles to authenticated;

-- ============================================================
-- user-avatars bucket (same model as restaurant-avatars, see 0005 / 0008)
-- Objects: `{user_id}/avatar-{timestamp}.{ext}`
-- ============================================================
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-avatars',
  'user-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

drop policy if exists "user_avatars_select_own" on storage.objects;
create policy "user_avatars_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_avatars_insert_own" on storage.objects;
create policy "user_avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_avatars_update_own" on storage.objects;
create policy "user_avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "user_avatars_delete_own" on storage.objects;
create policy "user_avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'user-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
