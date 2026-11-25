# Phase 7 — Top songs

**Goal:** each user sees their own 10 most listened songs.

## Data
`users/{uid}/playStats/{songId}` → `{ count: number, lastPlayedAt: timestamp }`. Only that user can read or write it (new rules block; nothing under `users/{uid}` covers new subcollections automatically). Update `docs/README.md` and `firestore.rules` together.

## Tasks
1. **Counting.** In `playerStore`, count a play once per load after 30 seconds or 50% of the song has actually played (add up the `time` events; seeking can't inflate it). Call `playStatsApi.recordPlay(uid, songId)` (`setDoc` with `increment(1)` and a server timestamp, errors ignored). Songs from friends count too (the id is stored under the listener).
2. **Page.** `src/features/stats/TopSongsPage.tsx` at `/top`: query `orderBy('count','desc')`, `limit(25)`, resolve with `usePlayableSongs()`, show the first 10 that still exist with play counts and a play-all button. Empty state when nothing played yet.
3. **Navigation.** "Top songs" in the sidebar. The bottom bar already has 5 tabs at 320px, so on mobile it is a section on Home (add a `desktopOnly` flag to `navItems`).
4. **Tests.** Play counting logic (threshold, seek, repeat-one), ranking and filtering of unavailable songs, page render.

## Acceptance criteria
- Listening to a song past the threshold raises its count by 1 (not on skips).
- Top songs lists at most 10, highest first; deleted or unshared friends' songs drop out.
- Rules: another user can't read or write my `playStats` (owner check).
