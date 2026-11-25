# Handoff — Phase 5: PWA, polish and handover

**Date:** 2026-11-25
**Phase doc:** docs/phase-5-pwa-deploy.md
**Status:** Complete with deferrals
**Last commit:** 472c773 phase-5: add PWA install, offline handling, code splitting and handover docs (this handoff is committed right after it)

## What was built
- **PWA** (`vite.config.ts`, `index.html`, `public/icons/`): web app manifest (standalone, dark theme and background colour), icons 192, 512, maskable 512 and an Apple touch icon (rendered from `public/favicon.svg`), iOS meta tags. Service worker (Workbox, `registerType: 'prompt'`): precaches the app shell, serves `index.html` for navigations offline, caches Cloudinary **cover art** (`CacheFirst`, 500 entries, 30 days). **Audio is never cached.** The tag-reader chunks for uploads are not precached.
- **Updates** (`src/features/pwa/registerPwa.ts`): "A new version of Strum is ready. **Reload**" toast that stays until answered; never reloads by itself. Open apps check for a new version every hour.
- **Install** (`installPrompt.ts`, `useInstallApp.ts`): the browser's install event is captured at start-up (`main.tsx`). **Install app** appears in the profile menu on Android and desktop. On iPhone/iPad it shows "tap Share, then Add to Home Screen" instead, once on first visit and on demand from the same menu item.
- **Offline** (`useOnlineStatus.ts`, `OfflineBanner.tsx`): banner while offline; Upload's file picker and upload button are disabled with a message; if a song can't load while offline, playback stops with "You're offline. Connect to the internet to play songs." instead of skipping through the queue (`playerStore.ts`). The library and playlists already work offline from Firestore's local cache (Phase 0).
- **Speed and resilience:** every page except Home loads on demand (`AppRoutes.tsx`, with a spinner while a page loads); `ErrorBoundary` shows "Something went wrong" with a Reload button (also covers a page file missing after a new deploy).
- **Settings:** new Account section (name, email, sign out, storage used by songs, plus space still held by deleted files). `formatBytes` now handles GB.
- **Docs and config:** root `README.md` (local setup, scripts, rules, friends, deploying, installing, Cloudinary clean-up, free-tier limits), the missing `.env.example`, Phase 5 doc deviations.
- **Index question:** no new composite indexes are needed. The only one is the existing `songs` index. The claim lookup in `songApi.ts` now queries `songId in […]` alone and filters by owner in code.
- Tests: 228 passing (new: install prompt and iOS detection, error boundary, offline playback, GB formatting; route tests now wait for lazy pages).

## Acceptance criteria
- [x] Manifest, icons and service worker are served; the service worker activates — checked in Chromium against the production build (`vite preview`)
- [x] Offline: the app shell and a deep link (`/library`) load with the network off — same Chromium check, no page errors
- [x] "New version" prompt — wired to the service worker's update event; shown when a new build is deployed (needs the owner's deploy to see it)
- [x] Offline messaging — banner, disabled upload, offline playback message (`playerStore.test.ts`)
- [x] Lint, build, tests pass — lint and build clean; tests 228/228 **with dummy `VITE_*` values** (without a `.env.local`, the `/upload` route test fails, as before)
- [ ] App installs to the home screen on Android and iPhone, opens standalone with the right icon and splash colour — needs owner verification
- [ ] "New version" toast appears in an open app after a second deploy, and **Reload** switches to it — needs owner verification
- [ ] Library and playlists are visible offline on a real phone — needs owner verification
- [ ] Lighthouse: installable, Performance ≥ 85 on mobile, Accessibility ≥ 90 — needs owner verification (Lighthouse and real devices weren't available here)
- [ ] Live on your host; you and a friend can sign in, upload and play — needs owner verification

## Deviations from plan
(also written into `docs/phase-5-pwa-deploy.md`)
- **No `npm run deploy` or Firebase CLI**: `AGENTS.md` forbids `firebase-tools`, and the app is also set up for Netlify. The README explains both deploy routes.
- **Skipped** (nothing depends on them): loading skeletons, a full accessibility pass, smaller Cloudinary cover sizes, a streaming-quality toggle (still an env setting), and the Cloudinary hardening check (5.6, a console task).
- `.env.example` was missing and is added.

## Deferred / known issues
- **Loading skeletons** and an **accessibility pass** (focus outlines, contrast, menu keyboard use) — a later polish round.
- **Cover sizes:** covers load at full size; Cloudinary `w_64` / `w_512` URLs would save data (they must also be allowed by the Cloudinary preset or strict-transformations settings).
- **Playing offline** isn't possible by design (audio isn't cached). Offline song downloads are listed under "After launch" in the phase doc.
- **Offline writes:** playlist edits first read the playlist from Firestore's local copy, so they work offline once it was loaded; a brand-new offline device can't edit until the first load.
- The `publicSongs` listener is still opened by several screens (the Firestore SDK shares them); a shared store would be cleaner.
- iOS PWAs can pause background audio on lock or app switch; this is an iOS limitation (see the README of `docs/`, "Key constraints").

## Owner action needed (in this order)
1. **Publish `firestore.rules`** (Firestore → Rules → paste → Publish). It holds the rules for Phases 6, 7 and 8 and none of them is live until you do.
2. **Add your deploy host's domain** to Firebase console → Authentication → Settings → **Authorized domains**, then deploy (see the README, "Deploying"). Set the `VITE_*` variables on the host.
3. **Install it:** open the live site on an Android phone (profile menu → Install app) and an iPhone (Safari → Share → Add to Home Screen). Check the icon, that it opens full screen, and that the library shows with the phone in airplane mode.
4. **Update prompt:** with the app open on a phone, deploy a small change; within about an hour (or after reopening it) the "new version" toast should appear. **Reload** switches to it.
5. **Lighthouse** (Chrome DevTools → Lighthouse, mobile, on the live site): installable ✓, Performance ≥ 85, Accessibility ≥ 90. Fix anything it flags and tell me.
6. **Cloudinary check** (console): the unsigned upload preset is restricted (audio and image formats, a size limit, a fixed folder, overwrite off); optionally enable strict transformations. Note the usage dashboard URL in the README.
7. The manual checks from handoffs 05 to 10 (Phases 4 to 8) may still be pending, notably the two-account rules checks for duplicates, Top songs and public playlists.

## How to run
- `npm run dev` for development. The service worker only runs in a build: `npm run build` then `npm run preview`, open `http://localhost:4173`, and look at DevTools → Application (Manifest, Service Workers).
- `npm run lint` · `npm run build` · `npm run test` (needs the `VITE_*` values, or one upload-route test fails).

## Next phase
- None planned. All phases in `docs/` are built. Open owner checks are listed above and in handoffs 05 to 10. Ideas are under "After launch" in `docs/phase-5-pwa-deploy.md` (real Cloudinary deletes, offline downloads, native iOS wrapper, lyrics, equaliser).

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/11-phase-5-pwa-polish.md
4. All planned phases are built. Work on the owner's next request. If it is a new feature, write a phase doc under docs/ first.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the work is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
