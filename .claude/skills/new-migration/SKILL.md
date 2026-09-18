---
name: new-migration
description: Scaffold the next numbered Supabase migration in supabase/migrations.
disable-model-invocation: true
---

Create a new migration for: $ARGUMENTS

1. List `supabase/migrations/` and pick the next number (zero-padded 4 digits, following existing naming).
2. Create `supabase/migrations/NNNN_<short_snake_name>.sql`.
3. For any new table: enable RLS and add explicit policies (owner-only for personal rows; group-member access for shared rows, mirroring existing migrations). RLS is the only access barrier since the anon key ships in the client.
4. Storage buckets need policies restricting writes to the user's own folder.
5. Remind the user migrations are applied manually, in order, in the Supabase SQL Editor, and that README's migration list should be updated.
