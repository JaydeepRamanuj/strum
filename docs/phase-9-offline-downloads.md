# Phase 9 — Offline downloads

**Goal:** let users save songs on their device and listen without a connection. When the network drops,
show that the app is offline and offer to play the downloaded songs.

## Owner decisions
- Downloads are per device and per account; nothing is synced or written to Firestore.
- Any song the user can play can be downloaded (own songs and friends' public songs).
- The downloaded file is the same stream the player uses (`streamUrl`, so 128 kbps MP3 by default).

## Storage
- Audio: browser **Cache Storage**, cache `strum-offline-audio`, key `/offline-audio/{uid}/{songId}`
  (`src/features/offline/audioCache.ts`). Separate from the Workbox caches, so service-worker updates
  never clear it. `navigator.storage.persist()` is requested on the first download.
- List of downloads: `localStorage['strum.downloads.{uid}']` → `{ [songId]: { song, bytes, savedAt } }`,
  a copy of the song's info so the list and player work offline. On start-up, entries whose audio the
  browser has evicted are dropped.
- **No Firestore or rules change.**

## Tasks
1. `audioCache.ts`: save (streamed fetch with progress), read as object URL, delete, list stored ids.
2. `downloadsStore.ts` (Zustand): init per uid, `download(songs)` (one at a time, progress, summary toast,
   "not enough space" message), `remove`, `removeAll`, `refreshInfo` (keeps titles/covers in step with
   library edits). Sync helpers for the player: `isDownloaded`, `offlineAudioUrl`.
3. Player: a downloaded song always plays from the device copy (even online; saves data). Offline, a
   song that isn't downloaded is skipped to the next downloaded one in the queue; with none, playback
   stops with "You're offline. Download songs while you're online…". No prefetch for downloaded songs.
4. UI:
   - Song menu (every song list): **Download** / **Downloading…** / **Remove download**; a small
     downloaded icon (or progress ring) after the title.
   - Playlist menu: **Download**. Library select mode: **Download** for the selected songs.
   - **Downloads** page (`/downloads`): play all, shuffle, remove all, storage used, progress. In the
     desktop sidebar; on phones linked from Home (the tab bar is full).
   - Offline: **Offline** badge next to the logo (mobile header and sidebar); banner links to
     Downloads; a toast "You're offline. Listen to your N downloaded songs?" with **Listen** once per
     offline spell (skipped if a downloaded song is already playing).
5. Tests: downloads store (save, offline refusal, partial failure, remove, per-user separation,
   eviction, refreshInfo) and player (plays device copy, offline skip, stale load guard).

## Acceptance criteria
- A downloaded song plays with the network off, including after closing and reopening the app.
- Going offline shows the Offline badge and the prompt; **Listen** plays the downloads.
- Removing a download frees its storage; another account on the same device doesn't see it.

## Known limits
- iOS Safari may evict website storage after weeks without use, and caps storage per site; the
  Downloads list self-corrects on next start.
- The first play of a downloaded song reads the file asynchronously; on iOS that can lose the tap's
  "user gesture", in which case the player shows its usual **Tap to play**.
