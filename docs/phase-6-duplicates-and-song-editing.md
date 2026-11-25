# Phase 6 — One public copy per song, and editing public songs

**Goal:** a song can be public only once, and admins can fix the info of any public song.

Owner decisions (confirmed): "same song" = same normalised **title + artist**; an admin may write to other users' public song documents (descriptive fields only); duplicates are blocked, not merged.

## Tasks

### 6.1 Duplicate key
- `src/lib/songKey.ts` → `songDupKey(title, artist, durationSec)`: ignores case, accents, punctuation and "feat./ft." credits; adds a 5-second duration bucket when the artist is unknown. Valid Firestore id. Unit tested.

### 6.2 Claims (`publicKeys/{dupKey}`)
- `{ songId, ownerUid, createdAt }`, created in the same batch as `publicSongs/{id}`. The rules refuse to create a claim that exists, so two people can't both share the same song, even at once.
- `setSongsPublic` checks claims first and returns `{ changed, duplicates }`. Bulk share skips duplicates and says how many. Batches are 5 songs each (rules look up other documents; Firestore caps these per batch).
- `updateSongInfo` moves the claim when a public song's title or artist changes, and refuses with `DuplicateSongError` if the new key is taken.
- Unshare, soft delete: release the claim in the same batch.

### 6.3 Admin edit
- `adminUpdateSongInfo(song, patch)`: owner's private song + public copy + claim in one batch.
- Discover rows show **Edit info** to the owner (own songs) and to admins (any song). `EditSongModal` hides the Public switch for an admin editing someone else's song and says whose library it also changes.

### 6.4 Existing public songs
- Settings → **Duplicate check** (admins only): `rebuildDuplicateIndex` claims keys for songs shared before this phase and lists copies of each other (the admin asks one owner to make theirs private).

### 6.5 Rules and docs
- `firestore.rules`: `publicKeys`, `dupKey` required on public songs, admin update paths (see the handoff for owner checks). `docs/README.md` and `AGENTS.md` updated.

## Acceptance criteria
- Making a second copy of a public song (same title and artist) public is refused with "Already in Discover, shared by …".
- Editing a public song's title/artist moves its claim; renaming into an existing public song is refused.
- An admin can edit a friend's public song from Discover; the friend's library shows the change.
- `npm run lint`, `npm run build`, `npm run test` pass.
