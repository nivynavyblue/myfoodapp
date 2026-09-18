-- Fixes Supabase database linter warnings:
--   0011 function_search_path_mutable
--   0028 anon_security_definer_function_executable
--   0025 public_bucket_allows_listing
--
-- Remaining `authenticated_security_definer_function_executable` warnings for
-- create_group / join_group_by_code / regenerate_join_code (called via rpc)
-- and is_group_member / shares_group_with (needed by RLS policies, which run
-- as the caller) are intentional.

-- 1. Pin search_path on the trigger function (body only uses now()/new).
alter function public.set_updated_at() set search_path = '';

-- 2. Functions default to EXECUTE for PUBLIC; signed-out callers must not
--    reach the SECURITY DEFINER helpers/RPCs.
revoke execute on function
  public.create_group(text),
  public.handle_new_user(),
  public.is_group_member(uuid),
  public.join_group_by_code(text),
  public.regenerate_join_code(uuid),
  public.shares_group_with(uuid)
from public, anon;

-- 3. handle_new_user is trigger-only; nobody needs to call it via rpc.
revoke execute on function public.handle_new_user() from authenticated;

-- 4. Public bucket URLs work without a SELECT policy; drop the broad one so
--    clients can't list every object. Keep an owner-scoped SELECT because
--    upload(upsert) and remove() need to see the user's own rows.
drop policy if exists "restaurant_avatars_select_public" on storage.objects;
drop policy if exists "restaurant_avatars_select_own" on storage.objects;
create policy "restaurant_avatars_select_own"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'restaurant-avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
