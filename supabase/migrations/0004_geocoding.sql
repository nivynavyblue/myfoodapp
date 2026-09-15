-- Optional geocoded coordinates for a restaurant's address, used for
-- proximity/region grouping in the UI. Populated client-side (Nominatim)
-- on create, or on update when the address text changes — never required.

alter table public.restaurants
  add column if not exists lat double precision,
  add column if not exists lng double precision;
