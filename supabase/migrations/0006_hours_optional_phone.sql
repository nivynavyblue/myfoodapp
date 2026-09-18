-- Phone becomes optional (some restaurants only have a website) and
-- restaurants get per-day opening hours.
--
-- opening_hours shape: { "0": {"open":"12:00","close":"23:00"}, "1": null, ... }
-- Keys are weekdays 0=Sunday..6=Saturday; missing or null = closed.
-- close < open means the range runs past midnight.

alter table public.restaurants
  alter column phone drop not null;

alter table public.restaurants
  drop constraint if exists restaurants_phone_check;

alter table public.restaurants
  add constraint restaurants_phone_check
  check (phone is null or char_length(trim(phone)) > 0);

alter table public.restaurants
  add column if not exists opening_hours jsonb;

alter table public.restaurants
  drop constraint if exists restaurants_opening_hours_object;

alter table public.restaurants
  add constraint restaurants_opening_hours_object
  check (opening_hours is null or jsonb_typeof(opening_hours) = 'object');
