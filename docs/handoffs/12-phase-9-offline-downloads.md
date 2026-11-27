# Handoff — Phase 9: Offline downloads

**Date:** 2026-11-27
**Phase doc:** docs/phase-9-offline-downloads.md
**Status:** Complete
**Last commit:** 9742064 phase-9: add offline song downloads, Downloads page and offline prompt (this handoff is committed right after it)

## What was built
- **Storage** (`src/features/offline/audioCache.ts`): songs are saved in the browser's Cache Storage (`strum-offline-audio`, keyed per uid and song), separate from the service worker's caches. Persistent storage is requested on the first download.
- **Downloads store** (`downloadsStore.ts`): per-user list in `localStorage` (`strum.downloads.{uid}`), downloads one at a time with progress, summary and "not enough space" toasts, remove / remove all, drops entries the browser evicted, keeps saved titles and covers in step with library edits (`LibraryPage`).
- **Player** (`playerStore.ts`): a downloaded song always plays from the device (also online, saving data). Offline, songs that aren't downloaded are skipped to the next downloaded one; with none, it stops with a clear message. Tapping play offline on a non-downloaded song does the same.
- **UI:**
  - Song menu everywhere: **Download** / **Downloading…** / **Remove download**; downloaded icon or progress ring after the title (`SongRow.tsx`, `DownloadMark.tsx`).
  - Playlist menu → **Download**; Library select mode → **Download** (`PlaylistActionsMenu.tsx`, `LibraryPage.tsx`).
  - **Downloads** page `/downloads` (`DownloadsPage.tsx`): play all, shuffle, remove all, storage used. Sidebar link on desktop; Home card on phones.
  - Offline: **Offline** badge next to the logo (`OfflineBadge.tsx`), banner links to Downloads (`OfflineBanner.tsx`), and a toast "You're offline. Listen to your N downloaded songs?" with **Listen** (`useOfflineDownloads.ts`).
- Docs: `docs/phase-9-offline-downloads.md`, `docs/README.md` (documents table, folder structure, out-of-scope list), root `README.md` (offline section), Phase 5 "After launch" table.
- Tests: 241 passing (13 new: `downloadsStore.test.ts`, offline and downloaded-song cases in `playerStore.test.ts`).

## Acceptance criteria
- [x] Saving, reading back, per-user separation and deleting a stored song — checked in Chromium against the real Cache API via the dev server; the stored copy loads into an `<audio>` element with the right duration.
- [x] Player uses the device copy and skips to downloaded songs offline — `playerStore.test.ts`
- [x] Removing a download deletes the stored audio; other accounts don't see it — `downloadsStore.test.ts`
- [x] Lint, build, tests pass (tests with dummy `VITE_*` values, as before)
- [ ] A downloaded song plays in airplane mode on a real phone, also after reopening the app — needs owner verification
- [ ] Going offline shows the Offline badge and the prompt; **Listen** plays downloads — needs owner verification (turn on airplane mode with the app open)
- [ ] Downloading from Cloudinary works on the live site (it needs Cloudinary's CORS headers, which the player already relies on) — needs owner verification

## Deviations from plan
- None. (No Firestore data or rules change.)

## Deferred / known issues
- iOS may clear website storage after long non-use and limits space per site; the Downloads list corrects itself on the next start.
- First play of a downloaded song reads the file asynchronously; on iOS this may show **Tap to play** once.
- A song deleted from the library stays downloaded until removed from Downloads (intentional; it may be a friend's public song).
- No "download quality" option; downloads use the same stream setting as playback.

## Owner action needed
- Test on a phone: download a few songs and a playlist, turn on airplane mode, check the badge, the prompt and playback, then reopen the app offline.
- Pending owner actions from handoff 11 (publish `firestore.rules`, deploy, install checks, Lighthouse, Cloudinary check) still apply.

## How to run
- `npm run dev` (downloads work in dev too). Offline checks: DevTools → Network → Offline, or a built app via `npm run build && npm run preview`.
- `npm run lint` · `npm run build` · `npm run test`

## Next phase
- None planned. Remaining ideas are under "After launch" in `docs/phase-5-pwa-deploy.md`.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/12-phase-9-offline-downloads.md
4. All planned phases are built. Work on the owner's next request. If it is a new feature, write a phase doc under docs/ first.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the work is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
