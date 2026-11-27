import { create } from 'zustand';
import { toast } from '@/components/toastStore';
import { streamUrl } from '@/config/cloudinary';
import type { Song } from '@/types/song';
import {
  audioCacheSupported,
  deleteAudio,
  getAudioObjectUrl,
  requestPersistentStorage,
  saveAudio,
  storedSongIds,
} from './audioCache';

/** One song saved on this device for offline listening. */
export interface DownloadEntry {
  /** A copy of the song's info at download time, so it can be listed and played offline. */
  song: Song;
  bytes: number;
  savedAt: number;
}

export interface DownloadsState {
  uid: string | null;
  entries: Record<string, DownloadEntry>;
  /** Songs waiting or downloading, 0..1. */
  progress: Record<string, number>;

  /** Loads the signed-in user's downloads on this device (null on sign-out). */
  init: (uid: string | null) => Promise<void>;
  download: (songs: Song[]) => Promise<void>;
  remove: (songIds: string[]) => Promise<void>;
  removeAll: () => Promise<void>;
  /** Keeps the saved song info (title, cover…) in step with the library. */
  refreshInfo: (songs: Song[]) => void;
}

const STORAGE_PREFIX = 'strum.downloads.';

/** Firestore timestamps don't survive JSON; the copy doesn't need them. */
const plainSong = (song: Song): Song => ({ ...song, createdAt: null });

export function loadEntries(uid: string): Record<string, DownloadEntry> {
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + uid);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, DownloadEntry>;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function saveEntries(uid: string, entries: Record<string, DownloadEntry>): void {
  try {
    localStorage.setItem(STORAGE_PREFIX + uid, JSON.stringify(entries));
  } catch {
    // Storage blocked: the audio is still saved, only the list won't survive a reload.
  }
}

const get = () => useDownloadsStore.getState();
const set = (partial: Partial<DownloadsState>) => useDownloadsStore.setState(partial);

function setEntries(entries: Record<string, DownloadEntry>): void {
  set({ entries });
  const { uid } = get();
  if (uid) saveEntries(uid, entries);
}

function setProgress(songId: string, value: number | null): void {
  const progress = { ...get().progress };
  if (value === null) delete progress[songId];
  else progress[songId] = value;
  set({ progress });
}

// Downloads run one at a time so a playlist doesn't open dozens of connections.
let queueTail: Promise<unknown> = Promise.resolve();
const cancelled = new Set<string>();
let askedForPersistence = false;

function isQuotaError(err: unknown): boolean {
  return err instanceof DOMException && err.name === 'QuotaExceededError';
}

async function downloadOne(uid: string, song: Song): Promise<'done' | 'skipped'> {
  if (cancelled.has(song.id) || get().uid !== uid) {
    cancelled.delete(song.id);
    setProgress(song.id, null);
    return 'skipped';
  }
  try {
    const bytes = await saveAudio(uid, song.id, streamUrl(song.cloudinaryPublicId), {
      durationSec: song.durationSec,
      onProgress: (p) => setProgress(song.id, p),
    });
    // Warm the cover-art cache (the service worker keeps Cloudinary images) for offline display.
    if (song.coverUrl) void fetch(song.coverUrl, { mode: 'no-cors' }).catch(() => undefined);

    if (cancelled.has(song.id) || get().uid !== uid) {
      cancelled.delete(song.id);
      await deleteAudio(uid, song.id);
      return 'skipped';
    }
    setEntries({
      ...get().entries,
      [song.id]: { song: plainSong(song), bytes, savedAt: Date.now() },
    });
    return 'done';
  } finally {
    setProgress(song.id, null);
  }
}

export const useDownloadsStore = create<DownloadsState>(() => ({
  uid: null,
  entries: {},
  progress: {},

  init: async (uid) => {
    if (get().uid === uid) return;
    set({ uid, entries: uid ? loadEntries(uid) : {}, progress: {} });
    if (!uid || !audioCacheSupported()) return;
    // Drop entries whose audio the browser has cleared.
    try {
      const stored = await storedSongIds(uid);
      if (get().uid !== uid) return;
      const entries = get().entries;
      const kept = Object.fromEntries(Object.entries(entries).filter(([id]) => stored.has(id)));
      if (Object.keys(kept).length !== Object.keys(entries).length) setEntries(kept);
    } catch {
      // Cache unreadable: keep the list; playing a missing copy falls back to streaming.
    }
  },

  download: async (songs) => {
    const { uid, entries, progress } = get();
    if (!uid) return;
    if (!audioCacheSupported()) {
      toast.error("This browser can't save songs for offline listening.");
      return;
    }
    if (!navigator.onLine) {
      toast.error("You're offline. Connect to the internet to download songs.");
      return;
    }
    const todo = songs.filter((s) => !entries[s.id] && progress[s.id] === undefined);
    if (todo.length === 0) {
      if (songs.length > 0)
        toast.info(
          songs.length === 1 ? 'Already downloaded.' : 'All of these are already downloaded.',
        );
      return;
    }
    if (!askedForPersistence) {
      askedForPersistence = true;
      void requestPersistentStorage();
    }
    for (const s of todo) {
      cancelled.delete(s.id);
      setProgress(s.id, 0);
    }
    if (todo.length > 1) toast.info(`Downloading ${todo.length} songs…`);

    const results = todo.map((song) => {
      const job = queueTail.then(() => downloadOne(uid, song));
      queueTail = job.catch(() => undefined);
      return job;
    });
    const settled = await Promise.allSettled(results);

    const done = settled.filter((r) => r.status === 'fulfilled' && r.value === 'done').length;
    const failures = settled.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failures.some((f) => isQuotaError(f.reason))) {
      toast.error('Not enough space on this device. Remove some downloads and try again.');
    } else if (failures.length > 0) {
      toast.error(
        todo.length === 1
          ? `Couldn't download "${todo[0].title}". Try again.`
          : `Couldn't download ${failures.length} of ${todo.length} songs. Try again.`,
      );
    }
    if (done > 0 && failures.length === 0) {
      toast.success(
        todo.length === 1 ? `Downloaded "${todo[0].title}"` : `Downloaded ${done} songs`,
      );
    }
  },

  remove: async (songIds) => {
    const { uid, entries, progress } = get();
    if (!uid) return;
    for (const id of songIds) if (progress[id] !== undefined) cancelled.add(id);
    const next = { ...entries };
    for (const id of songIds) delete next[id];
    setEntries(next);
    await Promise.all(songIds.map((id) => deleteAudio(uid, id).catch(() => undefined)));
  },

  removeAll: async () => {
    await get().remove([...Object.keys(get().entries), ...Object.keys(get().progress)]);
  },

  refreshInfo: (songs) => {
    const entries = get().entries;
    let changed = false;
    const next = { ...entries };
    for (const song of songs) {
      const entry = entries[song.id];
      if (!entry) continue;
      const fresh = plainSong(song);
      if (JSON.stringify(fresh) === JSON.stringify(entry.song)) continue;
      next[song.id] = { ...entry, song: fresh };
      changed = true;
    }
    if (changed) setEntries(next);
  },
}));

// ---- used by the player (outside React) ------------------------------------------------

export function isDownloaded(songId: string): boolean {
  return Boolean(get().entries[songId]);
}

/** Object URL of the downloaded copy, or null to stream instead. */
export async function offlineAudioUrl(songId: string): Promise<string | null> {
  const { uid } = get();
  if (!uid || !isDownloaded(songId)) return null;
  try {
    return await getAudioObjectUrl(uid, songId);
  } catch {
    return null;
  }
}

/** Downloaded songs, newest download first. */
export function downloadedSongs(entries: Record<string, DownloadEntry>): Song[] {
  return Object.values(entries)
    .sort((a, b) => b.savedAt - a.savedAt)
    .map((e) => e.song);
}

export function downloadedBytes(entries: Record<string, DownloadEntry>): number {
  return Object.values(entries).reduce((sum, e) => sum + e.bytes, 0);
}
