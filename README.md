# Strum

A private music player for a small group of friends. Sign in with Google, upload your own songs,
organise them into playlists and folders, share songs and playlists in **Discover**, and play them in
the browser. It installs to the home screen like an app (PWA).

There is no backend server: the browser talks directly to **Firebase** (sign-in, database) and
**Cloudinary** (audio and cover storage). Vite + React + TypeScript, Tailwind, Zustand, Vitest.

The full design is in [`docs/README.md`](docs/README.md) (start there). Rules for AI coding agents are in
[`AGENTS.md`](AGENTS.md); per-phase notes and what to check by hand are in [`docs/handoffs/`](docs/handoffs/).

## Run it locally

1. `npm install`
2. `cp .env.example .env.local` and fill it in (Firebase web config, Cloudinary cloud name and unsigned
   upload preset). What you need and where to find it: [`docs/00-what-you-need-to-provide.md`](docs/00-what-you-need-to-provide.md).
3. `npm run dev`

| Script | What it does |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Type-check and build to `dist/` (also writes the service worker and manifest) |
| `npm run preview` | Serve the built app locally (the service worker only runs in a build) |
| `npm run test` | Unit and component tests. They need the `VITE_*` variables, or one upload-route test fails; any dummy values work |
| `npm run lint` | ESLint and Prettier check |

## Firestore rules

The rules in [`firestore.rules`](firestore.rules) are the app's security. There is no Firebase CLI in this
project: paste the file into **Firebase console → Firestore Database → Rules → Publish** after every
change. Nothing is automated, so each handoff lists checks to run by hand. The only composite index is
in [`firestore.indexes.json`](firestore.indexes.json) (library songs); create it in the console if the
Library asks for it.

## Adding friends

Only emails in `allowedUsers` can use Strum. Admins make **invite codes** in **Settings → Invites**; a
friend enters the code after signing in. You can also add a document by hand in the console. To become an
admin, add a document to `admins` with your lowercase Google email as the id. Details:
[`docs/README.md` → Adding friends](docs/README.md#adding-friends).

## Deploying

`npm run build` produces a static site in `dist/`. Host it anywhere that serves static files and falls back
to `index.html` for unknown paths (so links like `/playlist/abc` survive a reload):

- **Netlify:** `public/_redirects` already does this. Connect the repo (build `npm run build`, publish
  `dist`), or drag the `dist` folder in. Set the `VITE_*` variables in the site settings.
- **Firebase Hosting:** [`firebase.json`](firebase.json) is set up (public `dist`, rewrite to `index.html`).
  Run `npx firebase-tools deploy --only hosting` from your own machine after `firebase login`. The CLI is not
  a project dependency.

After the first deploy, add the site's domain to **Firebase console → Authentication → Settings →
Authorized domains**, or Google sign-in will be refused.

**New versions:** open apps notice a new deploy within about an hour and show *"A new version of Strum is
ready. Reload"*. Nothing reloads by itself, so music doesn't cut out.

## Installing on a phone or computer

- **Android / desktop Chrome or Edge:** profile menu → **Install app** (or the browser's install icon).
- **iPhone / iPad (Safari):** Share → **Add to Home Screen**. Strum shows this hint once.

Offline, the app opens and your library and playlists are visible (Firestore keeps a local copy). Only
**downloaded** songs play offline: use **Download** in a song's menu, a playlist's menu, or Library's select
mode, and find them under **Downloads** (sidebar, or Home on a phone). When the connection drops, an
**Offline** badge shows and Strum offers to play your downloads. Downloads live in the browser's storage on
that device only (per account); streamed songs are still not cached. Uploads are paused offline. Cover art
is cached for 30 days.

## Cleaning up deleted songs

The app can't delete files from Cloudinary (that needs the API secret). **Settings → Deleted files** lists
songs you deleted and copies their Cloudinary ids; delete those in the Cloudinary **Media Library**, then
purge them in the app.

## Free-tier limits

- **Cloudinary (free):** about 25 credits a month, shared between storage, bandwidth and transformations
  (roughly 1 GB of storage *or* 1 GB of streaming per credit). Streaming a 128 kbps copy
  (`VITE_STREAM_QUALITY=128k`) keeps bandwidth down. Watch usage on the Cloudinary dashboard.
- **Firebase (Spark):** generous for a few friends: 50k reads and 20k writes a day on Firestore. Each play
  adds one small write for **Top songs**.
- Uploads use an unsigned preset: anyone who finds its name could upload to your account. Keep the preset
  restricted (audio and image formats, a size limit, a fixed folder, no overwrite) and rename it if it leaks.

## App icons

`public/icons/` holds the home-screen icons (192, 512, a maskable 512 and the Apple touch icon). They were
rendered from `public/favicon.svg`; replace the PNGs to change the icon.
