# ArtSpace Gallery

A subscription platform for artists to show and sell original work — where the collection hangs in a
navigable 3D gallery room, and buyers can preview a piece on their own wall in true perspective before
they ever contact the artist.

**[Open the live demo →](https://basel29896-ctrl.github.io/artspace-gallery/)**
&nbsp;·&nbsp;
[Read the concept](https://basel29896-ctrl.github.io/artspace-gallery/concept/)

The demo is a **static export** hosted on GitHub Pages. The 3D room, artist profiles, artwork pages and
the full "View in Your Space" perspective editor all run for real — they are client-side. Anything needing
a server is absent by construction: no sign-in, no uploads, no inquiries, no analytics. Build it yourself
with `npm run build:demo`.

---

## Status

Working prototype. Not a shipped product.

| Area | State |
| --- | --- |
| 3D gallery room (scroll-driven camera, per-artwork spotlights, click-to-focus) | Built, verified in browser |
| "View in Your Space" perspective editor | Built, warp verified to 1.15e-13 px vertex error |
| Server-side watermark pipeline (sharp) | Built, verified end-to-end |
| Database schema + row-level security | Written, **not yet run against a live project** |
| Auth (email/password + Google), profiles, artist studio | Built; OAuth untested without a live Supabase project |
| Artist dashboard — upload, edit, inquiries, analytics | Built |
| Stripe subscriptions | **Not implemented** |
| Automated test suite | **None.** Verification so far is targeted scripts + browser runs |

Everything data-backed currently runs on fixture data. Connect a Supabase project to exercise the real paths.

## Running it

```bash
npm install
cp .env.example .env.local     # fill in Supabase + Stripe keys
npm run dev
```

To browse the interface without a database, add `NEXT_PUBLIC_USE_FIXTURES=1` to `.env.local`. The fixture
path is gated on that flag **and** on `NODE_ENV !== 'production'`, so it cannot serve in a production build.

### Database

Two migrations in `supabase/migrations/`, applied in order:

- `0001_init.sql` — schema, enums, RLS policies, storage buckets, likes-count trigger
- `0002_views_and_rpcs.sql` — view analytics, inquiry intake, artist stats

## Architecture notes

**Originals are never served.** On upload, `sharp` produces a watermarked rendition capped at 1600px with
EXIF stripped. The original goes to a private bucket with no client-reachable URL; only the rendition is
public. Canvas rendering and a disabled context menu add friction on top, but they are deterrence, not
protection — they do not stop a screenshot, and the code says so.

**Perspective is a real homography.** Konva's transforms are affine, so independent corner dragging is
impossible with them — an affine matrix can only ever produce a parallelogram. The warp solves the
projective transform from the four corners and renders 512 subdivided triangles, each with its own affine
approximation.

**Privileged columns are trigger-protected.** `users.role` and `users.plan` cannot be written by a user's
own session, so nobody can promote themselves to a paid plan by updating their own row.

**The room photo never leaves the browser.** It lives in an object URL, revoked on unmount.

## Known gaps

- No Stripe integration.
- No automated tests.
- Rate limiting is in-memory and therefore per-instance — near useless on serverless. Needs Redis before launch.
- No password reset flow.
- Google OAuth and email confirmation are unverified end-to-end.

## Images

See [NOTICE.md](NOTICE.md) — the sample images in this repository are third-party stock photographs and
are **not** covered by this project's licence.
