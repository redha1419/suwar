---
name: suwar-deploy
description: Use when deploying Suwar to production, changing production environment variables, running migrations against the production database, or managing the production Cloudflare R2 bucket. Covers Vercel/Neon/R2 CLI commands and gotchas specific to this project's infra.
---

# Suwar production deployment

Infra is already provisioned — this is about *operating* it, not recreating
it. Never hardcode real credentials into any file that gets committed; the
commands below always fetch secrets fresh rather than storing them.

## What's provisioned

| Piece | Identifier | CLI |
|---|---|---|
| Hosting | Vercel project `suwar/suwar` | `vercel` |
| Database | Neon project `suwar` (id `damp-hat-82691929`) | `neonctl` |
| Storage | Cloudflare R2 bucket `suwar`, account `03b0287c6bdaeb4ededf172fee00a68f` | `wrangler` |

All three CLIs are installed globally (`vercel`, `wrangler`, `neonctl`) and
already authenticated on this machine. If a fresh machine needs them:
`npm install -g vercel wrangler neonctl`, then `vercel login` / `wrangler
login` / `neonctl auth` (all interactive — the user has to run these
themselves, you can't complete browser OAuth on their behalf).

## Deploying

Pushing to `main` on GitHub auto-deploys (Vercel's Git integration is
connected). To deploy the current working tree directly without a git push:

```bash
vercel --prod
```

## Production database migrations

Get a fresh connection string (don't hardcode the old one — it may have
been rotated):

```bash
neonctl connection-string --project-id damp-hat-82691929
```

Then apply pending migrations against it:

```bash
DATABASE_URL="<connection string>" npx drizzle-kit migrate
```

## Changing production env vars

```bash
vercel env ls production                              # see what's set (values shown as "Encrypted", never printed)
echo "new-value" | vercel env add VAR_NAME production  # add or rotate (prompts to remove existing if present)
vercel env rm VAR_NAME production                      # remove
```

Current production vars: `DATABASE_URL`, `SESSION_SECRET`, `CRON_SECRET`,
`OWNER_EMAIL`, `OWNER_PASSWORD`, `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`,
`R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`. Generate new random secrets with
`openssl rand -hex 32` (session-style) or `openssl rand -hex 24` (shorter
tokens) — never reuse the local dev placeholder values.

## R2 bucket management

**Critical gotcha**: `wrangler r2 object` commands (get/put/delete) default
to a *local simulated* R2 store, not the real bucket, unless you pass
`--remote`. `wrangler r2 bucket` commands (create/list/cors) do hit the real
API by default. This inconsistency has silently no-op'd cleanup before —
always pass `--remote` for object-level operations:

```bash
wrangler r2 object delete "suwar/photos/<id>/original.jpg" --remote
```

To list what's actually in the bucket (wrangler has no object-list command;
use the S3 API directly via a throwaway script with `@aws-sdk/client-s3`'s
`ListObjectsV2Command`, credentials from `.env.local`'s commented-out R2_*
lines).

CORS is already configured for `http://localhost:3000` and
`https://*.vercel.app`. If you ever get CORS errors on presigned uploads,
check `wrangler r2 bucket cors list suwar` — the config format for
`wrangler r2 bucket cors set` is `{"rules":[{"allowed":{"origins":[...],
"methods":[...],"headers":["*"]},"maxAgeSeconds":3600}]}`, **not** plain S3
CORS JSON (`AllowedOrigins`/`AllowedMethods` — that shape gets rejected).

## Verifying a production deploy

Same Playwright pattern as local dev (see `suwar-dev` skill) but against
`https://suwar-bay.vercel.app`, logging in with the real production owner
credentials (ask the user if you don't have them in context — never guess
or reuse the local dev placeholder). **Always clean up test data you create
in production** — delete the R2 objects (`--remote`, see above) and the
Postgres rows (via the fresh Neon connection string) once verification is
done. Test data has been left behind before; check for it if picking up a
deploy task someone else started.
