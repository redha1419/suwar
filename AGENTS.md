<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Suwar

A personal photo library: upload from camera/iPhone/scanned film, cull into
albums, share via unguessable links with no viewer accounts. Single owner,
no multi-tenancy. Full setup/commands are in `README.md` — this file is
architecture, conventions, and the things that'll bite you if you forget them.

## Stack

Next.js (App Router) + TypeScript, Postgres + Drizzle ORM, Cloudflare R2
(S3-compatible) for storage, sharp + heic-convert for image processing,
exifr for EXIF, blurhash for placeholders, iron-session for the single-owner
login, Tailwind CSS v4, archiver for zip downloads.

## Architecture map

- `app/(owner)/...` — authenticated routes (gated by `requireOwner()` in the
  layout, which redirects to `/login`). Inbox, library, albums, trash,
  raw-files, shares, photo detail.
- `app/s/[token]/...` — the **only** public route tree. No session, no owner
  chrome ever rendered here (separate component tree, not CSS-hidden). Token
  resolves to a photo/album/all scope via `lib/share/resolve.ts`.
- `app/api/...` — route handlers: upload (presign/finalize), media serving,
  RAW download, share zip download, cron.
- `lib/storage/` — `StorageProvider` interface with two implementations:
  `r2.ts` (production) and `local.ts` (dev, writes to `.data/storage/`,
  gitignored). `lib/storage/index.ts` picks R2 automatically iff
  `R2_ACCOUNT_ID` is set — **local dev intentionally leaves this blank** (see
  `.env.local`, real creds are there but commented out) so test uploads don't
  land in the real production bucket. Uncomment those lines to test the R2
  path specifically.
- `lib/media/` — `exif.ts` (extraction), `derivatives.ts` (thumb/medium/
  preview generation), `blurhash.ts`, `file-classify.ts` (RAW vs image
  detection).
- `lib/pairing/match-raw.ts` — RAW+JPEG pairing by base filename, both
  in-batch and cross-batch (queries existing photos too).
- `lib/photos/actions.ts`, `lib/albums/actions.ts`, `lib/share/actions.ts` —
  Server Actions for all mutations. Prefer these over new API routes for
  anything triggered by an authenticated owner action; API routes are for
  things that need raw HTTP semantics (uploads, media serving, cron, public
  zip download).
- `lib/db/schema.ts` — Drizzle schema. Run `npm run db:generate` after
  editing it, then `npm run db:migrate`.

## Rules that exist for non-obvious reasons

- **A photo belongs to at most one album.** Enforced at the DB level —
  `album_photos.photo_id` is the primary key, not a composite key. Assigning
  an already-albumed photo to a different album is *blocked* (not moved),
  surfaced via `AssignToAlbumResult.blocked` back to the UI. Don't add
  multi-album support without checking with the user first — this was an
  explicit, deliberate change from the original many-to-many design.
- **Trashing a photo removes it from its album immediately**
  (`trashPhotos` deletes the `album_photos` row) — otherwise the album
  detail query doesn't filter by status and a trashed photo would keep
  showing up in its old album.
- **RAW files are never decoded.** They're opaque blobs, paired by filename
  only, downloadable but never previewed/thumbnailed. Don't add a RAW
  decoder — it's out of scope by design.
- **HEIC files must go through `heic-convert` before touching `sharp`.**
  sharp's bundled libheif enforces a strict security limit on embedded image
  references (iref box) that real iPhone photos (Live Photo / portrait-matte
  / HDR gain-map variants) routinely exceed, and it hard-crashes with
  "Security limit exceeded" — this isn't a synthetic edge case, it happens on
  real photos regularly. `lib/media/derivatives.ts` already handles this;
  don't feed raw HEIC bytes into `sharp()` directly anywhere else.
- **Share links: `original` variant IS shareable, on purpose.** The owner
  explicitly chose full-quality downloads over stripping GPS/EXIF for shared
  photos — don't silently revert this. Downloads use `?download=1` on the
  media route, which sets `Content-Disposition: attachment`; for R2 this is
  passed as `ResponseContentDisposition` on the presigned URL so it survives
  the redirect (plain query params don't work through a redirect).
- **Blurhash images check `.complete` on mount, not just `onLoad`.** A
  server-rendered `<img src>` can finish loading (from cache) before React
  hydrates and attaches the `onLoad` listener — that race left photos stuck
  permanently blurred. See `components/photo-grid/blurhash-image.tsx` if you
  touch it.
- **All owner-only actions must check `requireOwner()`/`getOwnerIdForApi()`.**
  Route handlers use `getOwnerIdForApi()` (returns null, never redirects —
  redirecting breaks JSON/fetch callers). Server Components/Server Actions
  use `requireOwner()` (redirects to `/login`).

## Verification

Don't trust typecheck/lint alone for anything touching upload, sharing, or
storage — those have failed silently before (see the HEIC crash and the
blurhash hydration race, both passed typecheck fine). Actually drive the
flow in a real browser. See the `suwar-dev` skill for the concrete pattern
(dev server startup, test credentials, Playwright recipe, DB/R2 inspection
commands) and the `suwar-deploy` skill for production deployment.

## Production infra (already provisioned — don't recreate)

- **Hosting**: Vercel project `suwar/suwar`, connected to this GitHub repo —
  pushes to `main` auto-deploy.
- **Database**: Neon Postgres, project `suwar` (`damp-hat-82691929`).
- **Storage**: Cloudflare R2 bucket `suwar`, CORS allows `localhost:3000` and
  `*.vercel.app`.
- **Cron**: `vercel.json` hits `/api/cron/purge-trash` daily; Vercel
  auto-sends `Authorization: Bearer $CRON_SECRET` for cron invocations
  (matches what that route checks).
- All production secrets live in Vercel's encrypted env vars, not in this
  repo. Local dev secrets are in `.env.local` (gitignored).
