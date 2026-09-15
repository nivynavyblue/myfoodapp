# Restaurant Index

Mobile-first PWA to keep a list of restaurants — call, WhatsApp, order online,
or copy their number in one tap — personal or shared with a group. React +
Vite + TypeScript, Tailwind + shadcn/ui, Supabase for auth/data, deployed on
Vercel. UI text is in Brazilian Portuguese (pt-BR); no i18n library, since
it's a single-language app.

## Stack

- **Frontend**: React 18 + Vite + TypeScript, Tailwind CSS + shadcn/ui components, `@heroicons/react` icons, installable PWA via `vite-plugin-pwa`.
- **Backend**: Supabase (Auth + Postgres + Row Level Security). No custom server — the frontend talks to Supabase directly with `@supabase/supabase-js`.
- **Hosting**: Vercel.

## 1. Create and configure the Supabase project

1. Go to [supabase.com](https://supabase.com) → **New project** (free tier is enough).
2. **Authentication → Providers**: make sure **Email** is enabled.
3. **Authentication → Settings**: under "Email Auth", turn **off** "Confirm email" if you want signup to log you straight in (simplest for solo use on your phone). Leave it on if you'd rather verify via email first.
4. **Authentication → URL Configuration**: set **Site URL** to your future Vercel URL (e.g. `https://your-app.vercel.app`), and add both that URL and `http://localhost:5173` under **Redirect URLs**.
5. **SQL Editor**: run the migrations **in order**:
   - [`supabase/migrations/0001_restaurants.sql`](./supabase/migrations/0001_restaurants.sql) — creates the `restaurants` table, an `updated_at` trigger, and RLS scoped to `auth.uid() = user_id`.
   - [`supabase/migrations/0002_groups_and_sharing.sql`](./supabase/migrations/0002_groups_and_sharing.sql) — adds `profiles` (auto-synced with `auth.users` via trigger), `groups`/`group_members` + join-by-code RPCs, a `website` column, and an append-only `restaurant_activity` audit log, then rewrites the `restaurants` RLS policies to allow group-shared access.
6. **Authentication → Policies**: sanity-check `restaurants`, `groups`, `group_members`, `profiles` and `restaurant_activity` all show RLS **enabled**.
7. **Project Settings → API**: copy the **Project URL** and **anon public** key — you'll need them next.

## 2. Configure the frontend

```bash
cp .env.example .env
```

Edit `.env`:

```
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

Install deps and run:

```bash
npm install
npm run dev
```

Open the printed local URL (default `http://localhost:5173`), sign up with an
email/password, and start adding restaurants.

## 3. Deploy to Vercel

1. Push this repo to GitHub (or any git provider Vercel supports).
2. In Vercel: **Add New Project** → import the repo. Framework preset: **Vite** (auto-detected).
3. Under **Environment Variables**, add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy. `vercel.json` already contains the SPA rewrite so client-side routes don't 404 on refresh.
5. Back in Supabase → **Authentication → URL Configuration**, double-check your real Vercel URL is set as Site URL / Redirect URL (step 4 above).
6. On your phone, open the deployed URL in the browser and use **"Add to Home Screen"** (or the browser's install prompt) to install it as a standalone PWA.

## Project structure

```
src/
  lib/            supabaseClient, restaurants/groups CRUD, phone/WhatsApp/URL helpers
  context/        AuthContext, GroupsContext (React Context, no Redux)
  components/     AuthScreen, RestaurantList, RestaurantCard, RestaurantForm,
                  ConfirmDialog, GroupsScreen (create/join/manage groups)
  components/ui/  shadcn/ui primitives (button, input, select, dialog, alert-dialog, card, badge, ...)
supabase/
  migrations/     SQL for tables, RLS policies, and RPCs
```

## Notes on data model

Each restaurant row belongs to exactly one `user_id`, and optionally to one
`group_id`. RLS policies enforce all access in Postgres (not just the UI):

- A **personal** restaurant (`group_id` null) is visible/editable only by its `user_id`.
- A **shared** restaurant (`group_id` set) is visible/editable by any member of that group. Every create/update/delete on it is recorded in `restaurant_activity` (who did what, when) — visible in the group's screen.
- **Groups**: created via the `create_group` RPC (owner). Others join via a short **join code** (`join_group_by_code` RPC) — no email invites needed. The owner can regenerate the code, remove members, rename, or delete the group; members can leave.
- **Call**: `tel:` link built from the stored phone number (kept as typed, digits + optional leading `+`).
- **WhatsApp**: `https://wa.me/<digits>` — the number is stripped to digits only (no `+`, no spaces) as required by wa.me, falling back to the phone number when the WhatsApp field is left blank. Enter it with country code, e.g. `+55 11 91234 5678`.
- **Website**: an optional "order online" link — `https://` is added automatically if you type a bare domain.
- **Copy**: uses `navigator.clipboard.writeText` on the phone field.
- **Search**: client-side filter over name and tags (table is expected to stay small — a few hundred rows at most for personal/small-group use).

## Offline behavior

The PWA precaches the app shell (HTML/JS/CSS) so it opens instantly and
installs like a native app. Supabase REST reads are cached with a
network-first strategy, so the list still renders from cache if you're
briefly offline — but adding/editing/deleting requires a connection (no
offline write queue, kept out of scope for simplicity).

## Icons

`public/icons/pwa-192.png` and `pwa-512.png` are plain placeholder icons.
Swap them for your own artwork (same filenames/sizes, or update
`vite.config.ts`'s `manifest.icons` if you rename them).
