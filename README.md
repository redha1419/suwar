# Suwar

A personal photo library: upload from your camera/iPhone/scanned film, cull
into albums, and share a photo/album/whole library with friends via an
unguessable link — no accounts for viewers.

**Status:** Phases 0–3 are built and verified (auth, upload/processing
pipeline, organize/cull, sharing). Phase 4 (the actual VSCO-esque visual
design pass) hasn't happened yet — right now it's functional but visually
plain: dark background, default system-ish styling, no real typography/
lightbox/motion polish.

## Quick start

```bash
npm install
npm run start:local
```

That script (`scripts/start.sh`) will: make sure Postgres is running, create
the `suwar_dev` database if it doesn't exist, run migrations, seed/update the
owner account from `.env.local`, then start the dev server at
http://localhost:3000. It's idempotent — safe to re-run any time.

Log in with the `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env.local`
(defaults to `you@example.com` / `changeme` — change these).

## Prerequisites

- Node.js
- Postgres running locally (this was set up against Homebrew's
  `postgresql@14`; `scripts/start.sh` will try `brew services start
  postgresql@14` if it's not already running)

Everything else (photo storage, sessions, etc.) works out of the box with no
external accounts needed for local dev — see **Storage** below.

## Manual setup (if you don't want the one-shot script)

```bash
npm install
createdb suwar_dev                # once
npm run db:migrate                # applies lib/db/migrations
npm run seed:owner                # creates/updates the owner from .env.local
npm run dev
```

## Environment variables (`.env.local`)

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | Postgres connection string |
| `SESSION_SECRET` | Signs the owner's login cookie — 32+ chars, change before any real deployment |
| `OWNER_EMAIL` / `OWNER_PASSWORD` | The single owner account; re-run `npm run seed:owner` after changing these |
| `CRON_SECRET` | Bearer token required to hit `/api/cron/purge-trash` (the 30-day trash cleanup job) |
| `R2_ACCOUNT_ID` / `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` / `R2_BUCKET_NAME` | Cloudflare R2 credentials — leave blank for local dev |

## Storage: local disk vs. R2

There's no Cloudflare R2 bucket set up yet, so photo storage currently falls
back to a local-disk stand-in (`lib/storage/local.ts`) that lives at
`.data/storage/` (gitignored) and implements the exact same `StorageProvider`
interface R2 will use. Everything — upload, thumbnails, RAW pairing,
sharing — works fully today on local disk.

To switch to real R2 later: create a bucket, fill in the four `R2_*`
variables in `.env.local`, restart the server. `lib/storage/index.ts` picks
R2 automatically once `R2_ACCOUNT_ID` is set — no code changes needed.

## Feature tour

Owner-only (all under the authenticated `(owner)` route group):

| Route | What it does |
|---|---|
| `/inbox` | Drag-and-drop upload; grid of newly-uploaded, unsorted photos with multi-select → Add to Album / Trash |
| `/inbox/review` | One-photo-at-a-time keyboard triage — see shortcuts below |
| `/library` | All "kept" photos, albumed or not |
| `/albums`, `/albums/[slug]` | Create/rename/delete albums, manage membership, "Share Album" |
| `/raw-files` | RAW files with no matching JPEG — download or delete only, never in a grid |
| `/trash` | Restore or permanently delete; anything trashed >30 days is auto-purged (see cron below) |
| `/shares` | See/copy/revoke every share link, or create a "Share Entire Library" link |
| `/photo/[id]` | Full photo detail — EXIF, download original, download paired RAW, Share |

**`/inbox/review` keyboard shortcuts:** `→`/`k` next photo · `←`/`j` previous ·
`Enter`/`a` keep · `x`/`Delete` trash · `1`–`9` quick-assign to one of your
albums (doesn't advance, so you can multi-assign) · `Space` open the full
album picker · `z` undo.

**Sharing:** `/s/[token]` is the only public route — no login, works for
anyone with the link. Scopes: a single photo, one album, or the entire
library (which lets viewers drill into any album). Revoking a link cuts off
access immediately.

## RAW handling

Upload a RAW (`.cr2/.nef/.arw/...`) alongside a JPEG with the *same base
filename* and they merge into one photo — the JPEG is what's previewed
everywhere, the RAW becomes a "Download RAW" button on that photo's detail
page. This pairing also works cross-batch (upload the RAW later and it'll
still find the earlier JPEG). A RAW uploaded with no matching JPEG just sits
in `/raw-files`, downloadable/deletable, never previewed.

## Scheduled trash purge

Photos trashed for 30+ days are hard-deleted by hitting:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/purge-trash
```

In production this is what you'd point a scheduler (Vercel Cron, etc.) at —
not something a browser ever calls.

## Useful commands

| Command | Does |
|---|---|
| `npm run dev` | Start the dev server (assumes DB is already set up) |
| `npm run start:local` | Full one-shot local startup (see Quick start) |
| `npm run db:generate` | Generate a new Drizzle migration after editing `lib/db/schema.ts` |
| `npm run db:migrate` | Apply pending migrations |
| `npm run seed:owner` | Create/update the owner account from `.env.local` |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |
| `npm run build` | Production build |

## Tech stack

Next.js 15 (App Router) + TypeScript, Postgres + Drizzle ORM, Cloudflare R2
(S3-compatible) for storage, sharp for image processing, exifr for EXIF,
blurhash for placeholders, iron-session for the single-owner login, Tailwind
CSS v4.
