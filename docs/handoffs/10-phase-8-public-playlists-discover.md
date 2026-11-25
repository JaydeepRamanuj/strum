# Handoff — Phase 8: Public playlists and Discover tabs

**Date:** 2026-11-25
**Phase doc:** docs/phase-8-public-playlists-discover.md
**Status:** Complete with deferrals
**Last commit:** 9e9cb12 phase-8: add public playlists and Discover tabs for playlists and artists (this handoff is committed right after it)

## What was built
- **Data model** (`docs/README.md`): `users/{uid}/playlists/{id}.isPublic` and top-level `publicPlaylists/{id}` (`ownerUid`, `ownerName`, `name`, `description`, `coverUrl`, `songIds`, `sharedAt`, `updatedAt`). `AGENTS.md` wording updated.
- **Rules** (`firestore.rules`): `publicPlaylists` is readable by friends; the owner writes it only while their own playlist with the same id is public **after the batch** and has the same `name`, `description` and `songIds`. Owner-only delete. `validPlaylist` accepts `isPublic`.
- **Playlist writes** (`src/features/playlists/playlistApi.ts`): rename, description, add, remove and reorder now write the private playlist and, if it is public, its copy in one batch. New `publishPlaylist`, `unpublishPlaylist`, `applyPublishPlan`. `deletePlaylist` also deletes the copy. `toPlaylist` reads `isPublic`.
- **Publish plan** (`publicPlaylistPlan.ts`, tested): works out which songs stay (already public), which private songs must be shared, which are replaced by an existing public copy (same title and artist), and which ids are gone.
- **UI for owners:** "Make public / Make private" in the playlist menu; a confirmation dialog (`PublishSongsDialog`) lists what will be shared, replaced or removed; "Public" badge on the playlist page and a globe on playlist cards. Adding songs to a public playlist (Add to playlist dialog, Add songs dialog) goes through the same check (`useAddToPlaylist`).
- **Guard** (`songApi.ts`): a song that is in one of your public playlists can't be made private (`assertNotInPublicPlaylists`, message names the song and the playlist). Soft delete removes the song from public playlists and their copies too.
- **Discover** (`src/features/discover/`): `DiscoverPage` is now tabs (`?tab=playlists|artists`): `DiscoverSongsTab` (the old page), `DiscoverPlaylistsTab`, `DiscoverArtistsTab`. New pages `/discover/playlist/:id` (read-only; play, shuffle, **Save to my playlists**, or "Manage" for the owner) and `/discover/artist/:key`. `DiscoverSongList` is the shared row list. Helpers: `artists.ts` (`splitArtists`, `groupArtists`, `songsByArtist`), `publicPlaylists.ts`, `publicPlaylistApi.ts`, `usePublicPlaylists.ts`.
- Tests: 218 passing (new: publish plan, artists, public playlists reader, Discover tabs and gone playlist/artist routes).

## Acceptance criteria
- [x] Public playlists never show a private song — `discoverPlaylists` only resolves ids against `publicSongs` (`publicPlaylists.test.ts`); the publish plan makes songs public first (`publicPlaylistPlan.test.ts`)
- [x] Artists tab lists artists with public songs and the artist page lists their songs — `artists.test.ts`; tab and routes render — `AppRoutes.test.tsx`
- [x] Lint, build, tests pass — lint and build clean; tests 218/218 **with dummy `VITE_*` values** (without a `.env.local`, the `/upload` route test fails, as it did before)
- [ ] Only the owner can change a public playlist; friends can play and copy it — needs owner verification (rules were never run: the project has no emulator)
- [ ] Make public, add songs, make private and delete work end to end with two accounts — needs owner verification (below)
- [ ] Discover tabs, playlist page and the dialog look right at 320–375px — needs owner verification (the preview needs a Google sign-in)

## Deviations from plan
(also written into `docs/phase-8-public-playlists-discover.md`)
- A song that is replaced by the public copy is replaced in the **private playlist too**, not only in the public copy. This keeps the two lists equal, which the rules can then check. The song stays in the owner's library.
- **Deleting** a song that is in a public playlist removes it from the playlist (as it already did for private playlists) instead of blocking; only **making it private** is blocked.
- Ids that no longer resolve are removed from the playlist when it is made public.

## Deferred / known issues
- **Rules can't see inside `songIds`**, so "every song is public" is guaranteed by the app, not the rules. A modified client could put a private song id in a public playlist; friends still can't play it (they can't read it), and Discover hides it. Fine for a friends' app.
- **Playlist edits need a connection.** They read the playlist first to see whether it is public, so they fail offline (they used to be queued).
- **Partial progress:** making a playlist public shares its private songs first, then publishes. If the second step fails, the songs stay public and the playlist stays private.
- **Same song shared by a friend later:** if a friend later shares a song your public playlist already holds as your own copy, nothing changes (your copy keeps the claim). Only the first to share holds it.
- **Discover limits:** the newest 1000 public songs and 200 public playlists are loaded; artist counts are exact only within that window. Artist grouping is by the artist tag text only (no merging of "Beyoncé" and "Beyonce Knowles").
- Public playlist covers are the owner's custom cover or a mosaic of public songs. There is still no way to upload a playlist cover (not part of this phase).
- Folders and Search don't show public playlists from friends.

## Owner action needed (in this order)
1. **Publish the rules** (Firestore → Rules → paste `firestore.rules` → Publish). This file also holds Phase 6 and 7 rules, which still need publishing and their checks (handoffs 08 and 09). Until then, making a playlist public fails with "Couldn't share" and the Playlists tab shows "Couldn't load shared playlists".
2. **Rules checks** (accounts A and B on the friends list; Rules Playground for the last ones):
   - A: playlist ⋮ → **Make public** with a mix of public and private songs → the dialog lists the private ones → confirm. Console: `publicPlaylists/{id}` with A's uid and name; the playlist has `isPublic: true`; the private songs are now public.
   - A has a private song with the same title and artist as one of B's public songs → it is listed as "Already in Discover" and replaced in the playlist by B's song.
   - B: **Discover → Playlists** lists it ("A · N songs"); open it, play it, **Save to my playlists** → B has a private copy.
   - A: rename the playlist, add a song, reorder, remove a song → the public copy follows each change (B sees it after reopening). Adding a private song to the public playlist shows the dialog.
   - A: try **Make private** on a song that is in the public playlist → refused with a message naming the playlist. Delete that song → it disappears from the playlist and the public copy.
   - A: playlist **Make private** → gone from B's Discover and the `publicPlaylists` doc is deleted. Make public again, then **Delete** the playlist → the copy is deleted too.
   - **Artists tab:** artists appear with counts; open one → its songs; a song with "X feat. Y" appears under both.
   - Playground (as B's uid): `update` or `delete` of A's `publicPlaylists/{id}` → **denied**. As A: `update` of the public copy with a different `songIds` than A's playlist (not in the same batch) → **denied**. `create` of `publicPlaylists/{x}` with no matching public playlist under `users/A/playlists/x` → **denied**. `get`/`list` as an account not in `allowedUsers` → **denied**.
3. **Device check** at 320–375px: the Discover tab bar (three tabs), the playlist and artist grids, the playlist page header with "Save to my playlists", and the publish dialog.
4. Handoffs 05–09 owner checks may still be pending, including Phase 6's duplicate-check rules, which this phase relies on.

## How to run
- `npm run dev` (needs `.env.local`), sign in, open a playlist → ⋮ → Make public, then **Discover**.
- `npm run lint` · `npm run build` · `npm run test` (needs the `VITE_*` values, or one upload-route test fails).

## Next phase
- Phase 5 (PWA, polish, deploy) is the one still open: `docs/phase-5-pwa-deploy.md`. Know first: Discover now has two more listeners (`publicPlaylists`), and any service-worker caching of Firestore must not hide that songs or playlists were unshared. A shared store for the `publicSongs` listener (noted in handoff 07) would be a good polish item.

## Continuation prompt
```text
You are continuing the Strum project in this repository.

1. Read AGENTS.md and follow it.
2. Read docs/README.md.
3. Read the latest handoff: docs/handoffs/10-phase-8-public-playlists-discover.md
4. Implement Phase 5 — PWA, Polish & Deploy as described in docs/phase-5-pwa-deploy.md.

Before coding, confirm the repo state matches the handoff and list any owner actions from the handoff that are still pending. When the phase is complete, follow the "Definition of done" in AGENTS.md: write the next handoff file, commit, and give me the next continuation prompt.
```
