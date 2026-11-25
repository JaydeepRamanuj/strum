# Handoff — Phase 6: duplicate public songs and admin editing

**Date:** 2026-11-25
**Phase doc:** docs/phase-6-duplicates-and-song-editing.md
**Status:** Complete with deferrals
**Last commit:** 60f33ee phase-6: one public copy per song, and admin editing of public songs (this handoff is committed right after it)

## What was built
- `src/lib/songKey.ts` (+ test): `songDupKey` — normalised title+artist (feat. credits ignored; duration bucket when the artist is unknown).
- `publicKeys/{dupKey}` claims (`{songId, ownerUid, createdAt}`) and `dupKey` on private songs and `publicSongs` (`src/types/song.ts`, `src/features/discover/publicSongs.ts`).
- `src/features/library/songApi.ts`:
  - `setSongsPublic` now returns `{ changed, duplicates }`; checks claims first, skips duplicates (including two selected songs that are the same), writes in batches of 5.
  - `updateSongInfo` moves the claim when a public song's title/artist changes; throws `DuplicateSongError` if taken.
  - `adminUpdateSongInfo`, `rebuildDuplicateIndex` (new). `softDeleteSongs` releases claims (looked up by owner + song id).
- `useSongVisibility`: toasts "Not shared: “X”. Already in Discover, shared by Y." (or a count).
- `EditSongModal`: admin mode for someone else's public song (no Public switch). Discover rows: **Edit info** for own songs and, for admins, every song.
- `src/features/settings/DuplicateIndexSection.tsx`: admin "Duplicate check" in Settings.
- `firestore.rules`: `publicKeys`; `dupKey` required on public songs with a matching claim; admin update paths on `publicSongs` and on a public private-song (descriptive fields only).
- Docs: README data model, AGENTS.md wording (public playlists no longer "out of scope"), phase docs 6, 7, 8.
- Tests: 180 passing (new: `songKey.test.ts`, duplicate toast in `LibraryPage.test.tsx`).

## Acceptance criteria
- [x] Duplicate key rules (case, accents, feat., unknown artist) — `songKey.test.ts`
- [x] Duplicate share is reported to the user — `LibraryPage.test.tsx`
- [x] Lint, build, tests pass — lint and build clean; tests 180/180 **with dummy `VITE_*` values**. Without a `.env.local`, `AppRoutes.test.tsx` "renders /upload" fails ("Strum is missing configuration"); this also happens on the previous commit, so it is not caused by this phase.
- [ ] Rules accept and refuse the right writes — needs owner verification (below). There is no emulator, so the rules were reviewed but never run.
- [ ] Admin edit and duplicate flows with real accounts — needs owner verification (below).

## Deviations from plan
- Songs shared before this phase can't be checked until an admin runs **Settings → Duplicate check** (added; not in the first plan).
- Claims for deletes are found with a query on `publicKeys` (`ownerUid` + `songId in [...]`), not stored lists.

## Deferred / known issues
- **Rules lookup cap.** Firestore limits how many other documents the rules may read per batched write (about 20). Public writes now look up the private song and the claim, so bulk share uses batches of **5**. If bulk share fails with "Couldn't share" on many songs, lower `PUBLIC_BATCH_SIZE` in `songApi.ts`; if it works in the console checks below, it may be raised. Bulk share can partly succeed (earlier batches stay shared).
- The duration bucket for unknown artists can split a true duplicate whose durations straddle a bucket edge.
- Different versions that normalise to the same title+artist (e.g. "Halo" and "Halo!") count as duplicates by design.
- Admins editing a song also change the owner's private song; cover uploads go to the admin's own Cloudinary folder.

## Owner action needed (in this order)
1. **Publish the rules** (Firestore → Rules → paste `firestore.rules` → Publish). Until then, sharing, editing public songs and unsharing fail. *Publish before using the new app build*, since the old rules don't know `publicKeys`.
2. **Duplicate check:** as an admin, Settings → **Duplicate check** → Run. Note any listed copies and ask one owner to make theirs private.
3. **Rules / flow checks** (accounts A and B on the friends list; B or A is an admin for the last two):
   - A shares "Song X". Console shows `publicSongs/{id}` with `dupKey` and a `publicKeys/{dupKey}` doc with A's uid. B uploads the same title+artist and tries **Make public** → refused: "Already in Discover, shared by A".
   - Bulk: B selects several songs, one of them a duplicate → the others share, one toast about the skipped one. Try 20+ songs; if it fails, see the rules lookup cap above.
   - A unshares X → `publicKeys` doc is gone; B can now share it. A deletes a shared song → claim gone too.
   - A renames a public song → the old claim is gone and a new one exists. Renaming into another public song's title+artist → refused.
   - Admin edits A's public song from Discover (title) → Discover and A's Library both show the new title; as a non-admin the **Edit info** item is absent on others' songs.
   - Rules Playground (as B's uid): `create` of `publicKeys/{existingKey}` → **denied**; `update` of `publicSongs/{A's id}` changing `ownerUid` or `audioUrl` as an admin → **denied**; `update` of A's private song as an admin changing `isPublic` → **denied**; as a non-admin, any update of A's `publicSongs` or private song → **denied**.
4. Phase 5 is not closed out (no handoff 08 for it existed): finish its device checks and write its handoff if you want it recorded separately. Open owner checks from handoffs 05–07 may still be pending.

## How to run
- Create `.env.local` from your Firebase and Cloudinary values, `npm run dev`.
- `npm run lint` · `npm run build` · `npm run test` (needs the `VITE_*` values, or one upload-route test fails).

## Next phase
- **Phase 7 — Top songs**, `docs/phase-7-top-songs.md`, then **Phase 8** (`docs/phase-8-public-playlists-discover.md`). Phase 8 relies on this phase's claims (a private song that duplicates a public one is swapped for the public song in a public playlist).

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/08-phase-6-duplicates-admin-edit.md
4. Implement Phase 7 — Top songs as described in docs/phase-7-top-songs.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
