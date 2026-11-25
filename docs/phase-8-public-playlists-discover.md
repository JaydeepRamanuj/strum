# Phase 8 — Public playlists and Discover tabs

**Goal:** share playlists, and browse Discover by songs, playlists and artists.

## Data
- `users/{uid}/playlists/{id}.isPublic?: boolean`.
- `publicPlaylists/{id}` (same id): `ownerUid`, `ownerName`, `name`, `description`, `coverUrl`, `songIds`, `sharedAt`, `updatedAt`. Written in one batch with the private playlist, like songs. Rules: readable by friends; written by the owner only while their playlist is public after the batch. Rules can't loop over `songIds`, so "every song is public" is enforced in the client, and Discover hides songs that aren't public.
- Update `docs/README.md` (data model, "Out of scope") and `firestore.rules` together.

## Rules for contents (owner decisions)
- A public playlist may hold only public songs.
- On **Make public**: songs already public are kept; a private song that has a public duplicate owned by someone else (Phase 6) is swapped for that public song, in the public copy only; any other private song prompts "Make N songs public too?" and shares them through the Phase 6 flow.
- A song in one of your public playlists can't be made private or deleted until it is removed or the playlist is made private ("Make *X* private first").
- Adding a private song to a public playlist prompts to make it public. Playlist edits update the public copy.

## Tasks
1. `playlistApi`: `setPlaylistPublic`, public-copy updates on edit/reorder/add/remove. Menu item and a globe on public playlists.
2. Discover tabs: **Songs** (existing), **Playlists** (card grid → `/discover/playlist/:id`, read-only, play / queue / "Save to my playlists"), **Artists** (grouped client-side by normalised artist; split on commas, `feat.`, `ft.`; not on `&`; cover mosaic and count → `/discover/artist/:name` with play-all).
3. Tests: grouping and splitting artists, public-playlist content rules (swap, prompt, block), page renders.

## Known limit
Discover loads the newest 1000 public songs, so artist counts are exact only within that window.

## Acceptance criteria
- Only the owner can change a public playlist; friends can play and copy it.
- A public playlist never shows a private song.
- Artists tab lists every artist with public songs and opens their songs.
