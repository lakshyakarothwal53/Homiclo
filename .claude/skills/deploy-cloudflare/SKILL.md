---
name: deploy-cloudflare
description: >-
  Build and deploy the HOMIQLO admin app (this repo) to its live Cloudflare
  Worker. Use this whenever the user says "deploy it to cloudflare", "deploy
  to cloudflare", "push this live", "ship this branch", "deploy the app", or
  any variant asking to put the current branch's code on Cloudflare — even if
  they misspell "cloudflare" (e.g. "cloud falre", "cf deploy"). This is a
  TanStack Start app built with the Lovable Nitro/Cloudflare preset; do not
  hand-roll a `wrangler deploy` or improvise the build/deploy sequence —
  follow the exact steps here, since the config is auto-generated at build
  time and easy to get wrong (wrong cwd, stale build, wrong worker).
---

# Deploy to Cloudflare (HOMIQLO)

## What this deploys

This repo builds to a Cloudflare Worker via Nitro's `cloudflare-module` preset
(configured through `@lovable.dev/vite-tanstack-config` in `vite.config.ts`).
There is **no committed `wrangler.toml`** — the Worker config is generated fresh
on every build at `.output/server/wrangler.json`, and `.wrangler/deploy/config.json`
redirects a plain `wrangler deploy` to that generated file. This means:

- The Worker name (`lakshyakarothwal53-homiclo`) and live URL
  (`https://lakshyakarothwal53-homiclo.homiqlo.workers.dev`) come from the build
  output, not a config file you can read before building.
- You must run the build immediately before deploying — an old `.output/`
  will deploy stale code even if the git working tree has since changed.
- `wrangler deploy` must run from the project root (`Homiclo/`), not from
  inside `.output/`, so it picks up the redirect file.

## Steps

1. **Confirm the working directory is the project root** (`Homiclo/`, the one
   containing `package.json`, `vite.config.ts`, `.wrangler/`) — not the parent
   folder (which only holds a loose `.env` and this directory) and not `.output/`.

2. **Check git state** — run `git branch --show-current` and `git status`.
   Surface the branch name and whether the tree is clean in your update to the
   user. A dirty tree isn't necessarily blocking (Cloudflare deploys whatever
   is on disk, not what's committed), but the user should know they're
   deploying uncommitted changes if that's the case.

3. **Build**: `npm run build` (this project uses npm here — see
   `CLAUDE.local.md` for why `bun` from the root `CLAUDE.md` was swapped for
   npm on this machine; either works, but confirm which one has a lockfile
   actually in use before switching). Watch for the build to actually finish
   with `[nitro] ✔ You can deploy this build` — don't proceed on a failed or
   truncated build. This step also regenerates `.output/server/wrangler.json`
   and `.wrangler/deploy/config.json`, which the deploy step depends on.

4. **Stop and confirm with the user before deploying.** This pushes straight
   to the live, publicly-reachable Worker — there's no staging environment in
   this setup, and the previous live version is overwritten with no built-in
   rollback UI (only `wrangler deployments list` / `wrangler rollback` after
   the fact). State plainly: which branch, which commit, and that this will
   replace what's currently live at the Worker URL. Only proceed once the user
   says go — do not skip this even if they said "deploy it to cloudflare"
   directly, since that phrase names the destination but doesn't itself waive
   the "are you sure" check for a production push.

5. **Deploy**: `npx wrangler deploy`, run from the project root. Confirm the
   output shows `Using redirected Wrangler configuration` pointing at
   `.output/server/wrangler.json` — if it instead says
   `<no user config found>` with no redirect, the build step above didn't run
   or didn't complete; re-run step 3 rather than forcing the deploy.

6. **Report back**: the live URL, the Worker name, the `Current Version ID`
   from the deploy output, and which branch/commit went out. If the user
   wants to double check it worked, suggest opening the live URL rather than
   assuming success from the CLI output alone.

## Troubleshooting

- **`wrangler whoami` shows no login / wrong account** — this machine is
  normally already authenticated (OAuth token, account
  `piyush.novavision@gmail.com` / account ID
  `226f8dfdb1605d9a8019a9c63a320254`). If that's missing, the user needs to
  run `npx wrangler login` interactively — you cannot complete an OAuth flow
  for them.
- **Env vars look missing at runtime** — `VITE_SUPABASE_URL` /
  `VITE_SUPABASE_ANON_KEY` are inlined into the client bundle at *build* time
  by Vite, read from `.env` in the project root. If they're wrong post-deploy,
  the fix is to correct `.env` and rebuild+redeploy, not to set a Cloudflare
  secret (there's no server-side runtime lookup for these in the current
  setup).
- **Deploy uploads but the site 404s / looks stale** — almost always a stale
  `.output/` from skipping step 3, or running `wrangler deploy` from the wrong
  directory so it can't find the redirect config. Re-run from the project root
  after a fresh build.
