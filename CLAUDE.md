# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands
- `npm run lint` is only `tsc --noEmit` (type-check); `npm run lint:eslint` runs ESLint (flat config, `eslint.config.js`). No Prettier, tests, or CI exist.
- `npm run build` runs `tsc -b && vite build`.

## Setup
- `cp .env.example .env`. `.env.example` holds real Supabase project values on purpose; the anon key is public, so RLS is the only access barrier.
- No Supabase CLI. Apply `supabase/migrations/0001..0007` manually, in order, in the Supabase SQL Editor. README lists 0001-0007.

## Conventions
- UI strings are hardcoded pt-BR (no i18n library). Write new UI text in pt-BR.
- Commit straight to `main`; informal messages (optional `Fix:` prefix).

## Security
- Render any stored URL only via `src/lib/url.ts` (`normalizeUrl`, `isSafeHttpUrl`). Only http(s) allowed (stored-XSS fix in 1434e52; DB also enforces it on `website`).
- Build `tel:`/`wa.me` links via `src/lib/phone.ts` (`telHref` keeps leading `+`, `whatsappHref` digits only).
- Group join codes and RLS policies are security-critical; changes to migrations need SQL review.
