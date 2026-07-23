# Deploying ArtSpace to Heroku

This app currently runs on **Supabase** (auth + Postgres + storage). The plan is
to move to **Heroku Postgres** and rebuild auth (NextAuth) and image storage
(S3/Cloudinary). This document is the readiness checklist and the migration TODO.

The GitHub Pages build (`npm run build:demo`) is unaffected — it stays a static
marketing/demo site with a localStorage-backed studio (`/studio`).

---

## What's already in place

- `Procfile` — `web: npm run start -- -p $PORT` (Next.js production server).
- `package.json` → `engines.node: 20.x` so Heroku picks the right stack.
- `.env.example` — every config var, grouped.
- `db/schema.sql` — standalone Postgres DDL (no Supabase, no RLS). You run this
  by hand against the database.

## What still needs building (the migration)

These are **not done yet**. The current code paths use Supabase; swapping them:

1. **Auth → NextAuth.** Replace `src/lib/supabase/{client,server}.ts` sessions and
   `src/app/auth/actions.ts` with NextAuth (Credentials + optionally Google).
   Users live in `users` (`password_hash`). Gate the studio on `is_approved`.
2. **Data → Postgres.** Replace the Supabase queries in `src/lib/artworks/queries.ts`
   and the API routes with a Postgres client (`pg` / Prisma / Drizzle) reading
   `DATABASE_URL`. The `db/schema.sql` shapes match the existing query columns.
3. **Storage → S3/Cloudinary.** Replace Supabase Storage uploads (originals/display/
   avatars) with object storage; keep only the URL/key in the DB.
4. **Request access → DB (optional).** Point `/request-access` at an
   `access_requests` insert in addition to the Web3Forms email.

The localStorage demo store (`src/lib/demo-store/`) is already written as a thin
repository, so it doubles as the interface these adapters should match.

---

## First deploy (once the migration above is done)

```bash
# 1. Create the app + database
heroku create your-artspace
heroku addons:create heroku-postgresql:essential-0 --app your-artspace

# 2. Load the schema manually (you run this — not automated)
heroku pg:psql --app your-artspace < db/schema.sql

# 3. Config vars (see .env.example for the full list)
heroku config:set --app your-artspace \
  NEXT_PUBLIC_SITE_URL=https://your-artspace.herokuapp.com \
  NEXTAUTH_URL=https://your-artspace.herokuapp.com \
  NEXTAUTH_SECRET="$(openssl rand -base64 32)" \
  NEXT_PUBLIC_WEB3FORMS_KEY=c9750553-5880-459c-83c6-265a08f8a808
# + S3/Cloudinary creds

# 4. Ship
git push heroku main
heroku open --app your-artspace
```

`DATABASE_URL` is injected automatically by the Postgres add-on — do not set it
by hand.

## Creating a paid user manually (until online payment works in Jordan)

```sql
-- After you've arranged payment out-of-band:
update users set role = 'artist', is_approved = true where email = 'them@example.com';
```

Or insert the row directly with a hashed password if they don't self-register.

## Notes

- `next.config` uses static-export settings **only** under the demo build env
  (`NEXT_PUBLIC_STATIC_DEMO=1`). A normal `next build` on Heroku produces the
  full server app — no change needed.
- Heroku's filesystem is ephemeral: never store uploaded images on the dyno.
  That is why storage must be S3/Cloudinary, not local disk.
