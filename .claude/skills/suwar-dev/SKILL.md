---
name: suwar-dev
description: Use when running, testing, or verifying changes to the Suwar app locally — starting the dev server, logging in, driving the app end-to-end with Playwright, and inspecting the local Postgres DB or local file storage. Covers this repo's specific launching/driving/verification workflow.
---

# Suwar local dev workflow

## Start the app

```bash
npm run start:local
```

Idempotent — makes sure Postgres is running, creates `suwar_dev` if missing,
runs migrations, seeds/updates the owner account from `.env.local`, starts
`npm run dev`. Safe to re-run any time. Plain `npm run dev` also works if the
DB is already set up.

Login: `OWNER_EMAIL` / `OWNER_PASSWORD` from `.env.local` (defaults to
`you@example.com` / `changeme` unless changed).

## Storage: this matters for every upload-related test

Local dev uses **local disk** (`.data/storage/`, gitignored) by default —
`R2_ACCOUNT_ID` is blank in `.env.local`. Real R2 credentials for the
production bucket are *commented out* right below the blank lines in that
file — uncomment them only if you specifically need to test the R2 code
path, and re-comment them afterward. Don't leave R2 active for routine local
testing; it pollutes the real production bucket with test uploads.

## Verifying a change — the pattern used throughout this project

Don't trust typecheck/lint alone for anything touching upload, image
processing, sharing, or storage. Drive it in a real headless browser:

```bash
# from repo root, dev server already running
node -e "..." # or write a throwaway script under scripts/, run it, then delete it
```

Concrete recipe (this exact shape has been used repeatedly — copy it):

```js
import { chromium } from "playwright";

const browser = await chromium.launch({ args: ["--no-sandbox"] });
const page = await browser.newPage();
page.on("pageerror", (e) => console.log("pageerror:", String(e)));

await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
await page.fill('input[name="email"]', "you@example.com");
await page.fill('input[name="password"]', "changeme");
await page.click('button[type="submit"]');
await page.waitForURL("**/library", { timeout: 10000 });

// ... drive the actual flow: upload via page.locator('input[type="file"]').setInputFiles([...]),
// select cards via 'main .grid > div', use modifiers:["Meta"] for multi-select, etc.

await browser.close();
```

- `playwright` is already a devDependency — no install needed.
- Write throwaway test scripts to `scripts/verify-*.mjs`, run with
  `node scripts/verify-*.mjs`, **then delete them** — they're not meant to
  live in the repo permanently. If you need a synthetic test image, generate
  one with `sharp` (see any prior commit's diff for the pattern) rather than
  sourcing one from the network.
- After testing uploads/album/trash/share flows, clean up the rows you
  created (`psql` delete, see below) so the local DB doesn't accumulate test
  cruft that confuses future sessions.

## Inspecting local state

```bash
# Postgres (local dev DB)
psql "postgres://redha@localhost:5432/suwar_dev" -c "select id, original_filename, status, processing_error from photos order by uploaded_at desc limit 10;"

# Local file storage
find .data/storage -type f

# Clear all local test data and start fresh (only if you mean it)
psql "postgres://redha@localhost:5432/suwar_dev" -c "delete from share_links; delete from album_photos; delete from raw_files; delete from photos; delete from albums;"
rm -rf .data
```

## Known gotchas already fixed — don't reintroduce

- Standalone scripts (outside `npm run dev`) that import anything under
  `lib/` which transitively imports `"server-only"` will throw
  `This module cannot be imported from a Client Component module` — that
  guard only no-ops under Next's own bundler. For one-off DB scripts, either
  hit a route handler instead, or reimplement the minimal logic inline in
  the script without importing the guarded module (see how `scripts/
  seed-owner.ts` and the old reprocessing scripts did it).
- `dotenv`'s `config()` call must happen *before* any import that reads
  `process.env` at module-load time — ES import statements are hoisted, so
  `import { db } from "../lib/db"` at the top of a file runs before a
  `config()` call later in the same file. Use dynamic `import()` after
  calling `config()` if a script needs both.
