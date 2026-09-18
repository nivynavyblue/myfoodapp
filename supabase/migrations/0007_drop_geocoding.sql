-- Location/proximity grouping was removed from the app; drop the
-- geocoded coordinates added in 0004. `address` is kept.

alter table public.restaurants
  drop column if exists lat,
  drop column if exists lng;
