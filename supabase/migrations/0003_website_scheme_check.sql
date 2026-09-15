-- Defense-in-depth: reject non-http(s) schemes (e.g. javascript:, data:) at
-- the DB layer too, in case a row is ever written outside the app's own
-- normalizeUrl() validation (direct API/SQL access).

alter table public.restaurants
  drop constraint if exists website_scheme;

alter table public.restaurants
  add constraint website_scheme check (
    website is null or website ~* '^https?://'
  );
