# Handoff — Phase 7: Top songs

**Date:** 2026-11-25
**Phase doc:** docs/phase-7-top-songs.md
**Status:** Complete with deferrals
**Last commit:** fda5d28 phase-7: add play counting and Top songs page (this handoff is committed right after it)

## What was built
- `src/features/stats/playTracker.ts` (+ test): adds up real listening time from playback positions. A play counts after 30 s, or half of a song shorter than a minute. Seeks add nothing. At most once per load.
- `src/features/player/playerStore.ts`: feeds the tracker from engine `time` events, resets it on every load and when repeat-one starts the song over, and calls a handler registered with `setPlayCountedHandler`.
- `src/features/stats/usePlayCounting.ts`: registers that handler for the signed-in user (mounted in `AppLayout`) and saves each play. Failures are ignored.
- `src/features/stats/playStatsApi.ts`: `recordPlay` (`increment(1)` + server timestamp, merge) and `subscribePlayStats` (25 highest counts).
- `src/features/stats/topSongs.ts` (+ test): `resolveTopSongs` — drops songs that are deleted or no longer public, sorts by count then most recent play, keeps 10.
- `src/features/stats/useTopSongs.ts`, `TopSongsPage.tsx` at `/top`: ranked rows with "N plays", Play all, row menus (own songs can be edited or shared; friends' songs can be queued and added to playlists). Empty and error states.
- Navigation: "Top songs" in the sidebar (`navItems.ts` gets `desktopOnly`; the tab bar skips it). On mobile, Home has a "Top songs" link row. `SongRow` gets an optional `rank`; `PlaySource.type` gains `'top'`.
- `firestore.rules`: `users/{uid}/playStats/{songId}`. `docs/README.md` data model and "Top songs" paragraph.
- Tests: 197 passing (new: tracker, ranking, store play counting, `/top` route).

## Acceptance criteria
- [x] Listening past the threshold raises the count by 1, not on skips — `playTracker.test.ts`, `playerStore.test.ts` (play counting)
- [x] Top songs lists at most 10, highest first; deleted or unshared songs drop out — `topSongs.test.ts`
- [x] `/top` renders — `AppRoutes.test.tsx`
- [x] Lint, build, tests pass — lint and build clean; tests 197/197 **with dummy `VITE_*` values** (without a `.env.local`, the `/upload` route test fails, as before this phase)
- [ ] Rules: only the owner reads or writes `playStats`, and only +1 per write — needs owner verification (below). Never run: the project has no emulator.
- [ ] Top songs and the Home link look right at 320–375px, and the sidebar entry on desktop — needs owner verification (the preview needs a Google sign-in).
- [ ] A real listen is counted end to end (Firestore doc appears) — needs owner verification.

## Deviations from plan
- None. (`SongRow` got a `rank` prop rather than reusing the drag-handle slot.)

## Deferred / known issues
- **Only the top 25 are read.** If most of them were deleted or made private, fewer than 10 are shown until more songs are played. Fine for a friends' app.
- **No time ranges** ("this month") and no per-song reset; all-time counts only.
- **Counts are not decremented** when a song is deleted; a restored song keeps its count. Hard-deleted songs leave an orphan `playStats` doc (harmless; it is never shown).
- **Offline plays** are queued by the Firestore SDK only if it has offline persistence enabled; otherwise a play made offline is lost.
- Phase 8 is still to do (`docs/phase-8-public-playlists-discover.md`).

## Owner action needed (in this order)
1. **Publish the rules** (Firestore → Rules → paste `firestore.rules` → Publish). Until then plays aren't saved and `/top` shows "Couldn't load your top songs". Phase 6's rules are in the same file and still need publishing and checking (handoff 08).
2. **Rules checks** (Rules Playground, or the app plus the console):
   - Play a song for 30+ seconds → `users/{you}/playStats/{songId}` exists with `count: 1`; play it again later → `count: 2`.
   - Playground as another uid: `get`/`list` of someone else's `playStats` → **denied**.
   - Playground as yourself: `update` with `count` +2 or -1 → **denied**; `create` with `count: 5` → **denied**; adding an extra field → **denied**.
3. **Use it:** play a few songs from your library and from Discover; open **Top songs** (sidebar on desktop, Home link on a phone). Check skipping within 30 s doesn't count and a deleted song disappears from the list.
4. **Device check** at 320–375px: the Home link row and the Top songs rows (rank, play count, menu) fit.

## How to run
- `npm run dev` (needs `.env.local`), sign in, play songs, open `/top`.
- `npm run lint` · `npm run build` · `npm run test` (needs the `VITE_*` values, or one upload-route test fails).

## Next phase
- **Phase 8 — Public playlists and Discover tabs**, `docs/phase-8-public-playlists-discover.md`. Know first: it relies on Phase 6's duplicate claims (a private song that duplicates a public one is swapped for the public song in a public playlist), so Phase 6's rules must be published and checked first.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/09-phase-7-top-songs.md
4. Implement Phase 8 — Public playlists and Discover tabs as described in docs/phase-8-public-playlists-discover.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
