-- Optional custom avatar image per restaurant, stored in Supabase Storage.
-- Objects are stored as `{user_id}/{restaurant_id}-{timestamp}.{ext}` in the
-- `restaurant-avatars` bucket; RLS on storage.objects restricts writes to the
-- owning user's own folder, mirroring the ownership check already used for
-- public.restaurants in 0001_restaurants.sql.

alter table public.restaurants
  add column if not exists avatar_url text;

insert into storage.buckets (id, name, public)
values ('restaurant-avatars', 'restaurant-avatars', true)
on conflict (id) do nothing;

drop policy if exists "restaurant_avatars_select_public" on storage.objects;
create policy "restaurant_avatars_select_public"
  on storage.objects
  for select
  to public
  using (bucket_id = 'restaurant-avatars');

drop policy if exists "restaurant_avatars_insert_own" on storage.objects;
create policy "restaurant_avatars_insert_own"
  on storage.objects
  for insert
  to authenticated
  with check (
    bucket_id = 'restaurant-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "restaurant_avatars_update_own" on storage.objects;
create policy "restaurant_avatars_update_own"
  on storage.objects
  for update
  to authenticated
  using (
    bucket_id = 'restaurant-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "restaurant_avatars_delete_own" on storage.objects;
create policy "restaurant_avatars_delete_own"
  on storage.objects
  for delete
  to authenticated
  using (
    bucket_id = 'restaurant-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
