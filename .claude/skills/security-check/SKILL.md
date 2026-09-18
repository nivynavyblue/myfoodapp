---
name: security-check
description: Security checklist for pending changes (stored URLs, XSS, RLS, storage). Use before committing changes touching rendering of stored data or supabase/migrations.
---

Review `git diff` against this checklist and report violations:

- Stored URLs rendered only after `normalizeUrl` / `isSafeHttpUrl` (`src/lib/url.ts`); no `javascript:` or other non-http(s) schemes.
- No `dangerouslySetInnerHTML` or unescaped user data in HTML.
- Links with `target="_blank"` have `rel="noreferrer"`.
- `tel:` / `wa.me` links built via `src/lib/phone.ts`.
- Migrations: new tables have RLS enabled with owner/group-member policies; storage policies restrict writes to the user's own folder; `create_group` / `join_group_by_code` RPCs not weakened.
- No secrets beyond the public anon key committed.
