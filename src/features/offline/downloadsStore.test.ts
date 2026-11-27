import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/components/toastStore';
import type { Song } from '@/types/song';

const cache = vi.hoisted(() => ({
  stored: new Map<string, number>(),
  fail: new Set<string>(),
}));

vi.mock('./audioCache', () => ({
  audioCacheSupported: () => true,
  requestPersistentStorage: () => Promise.resolve(),
  saveAudio: async (
    uid: string,
    id: string,
    _url: string,
    opts: { onProgress?: (p: number) => void },
  ) => {
    if (cache.fail.has(id)) throw new Error('network');
    opts.onProgress?.(0.5);
    cache.stored.set(`${uid}/${id}`, 1000);
    return 1000;
  },
  deleteAudio: async (uid: string, id: string) => {
    cache.stored.delete(`${uid}/${id}`);
  },
  getAudioObjectUrl: async (uid: string, id: string) =>
    cache.stored.has(`${uid}/${id}`) ? `blob:${id}` : null,
  storedSongIds: async (uid: string) =>
    new Set(
      [...cache.stored.keys()].filter((k) => k.startsWith(`${uid}/`)).map((k) => k.split('/')[1]),
    ),
}));

vi.mock('@/config/cloudinary', () => ({ streamUrl: (id: string) => `https://stream/${id}` }));

import {
  downloadedBytes,
  downloadedSongs,
  isDownloaded,
  loadEntries,
  offlineAudioUrl,
  useDownloadsStore,
} from './downloadsStore';

const song = (id: string, title = `Song ${id}`): Song =>
  ({
    id,
    title,
    artist: 'Artist',
    album: null,
    durationSec: 100,
    cloudinaryPublicId: `pid/${id}`,
    coverUrl: null,
    createdAt: null,
  }) as Song;

const store = () => useDownloadsStore.getState();
const messages = () => useToastStore.getState().toasts.map((t) => t.message);

beforeEach(async () => {
  cache.stored.clear();
  cache.fail.clear();
  localStorage.clear();
  useToastStore.setState({ toasts: [] });
  useDownloadsStore.setState({ uid: null, entries: {}, progress: {} });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  await store().init('u1');
});

describe('download', () => {
  it('saves songs, remembers them on this device and reports done', async () => {
    await store().download([song('a'), song('b')]);
    expect(isDownloaded('a')).toBe(true);
    expect(isDownloaded('b')).toBe(true);
    expect(store().progress).toEqual({});
    expect(Object.keys(loadEntries('u1'))).toEqual(expect.arrayContaining(['a', 'b']));
    expect(downloadedBytes(store().entries)).toBe(2000);
    expect(messages()).toContain('Downloaded 2 songs');
    expect(await offlineAudioUrl('a')).toBe('blob:a');
  });

  it('refuses while offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    await store().download([song('a')]);
    expect(isDownloaded('a')).toBe(false);
    expect(messages()[0]).toMatch(/offline/i);
  });

  it('reports failures and keeps the songs that worked', async () => {
    cache.fail.add('b');
    await store().download([song('a'), song('b')]);
    expect(isDownloaded('a')).toBe(true);
    expect(isDownloaded('b')).toBe(false);
    expect(messages()).toContain("Couldn't download 1 of 2 songs. Try again.");
  });

  it('skips songs that are already downloaded', async () => {
    await store().download([song('a')]);
    useToastStore.setState({ toasts: [] });
    await store().download([song('a')]);
    expect(messages()).toEqual(['Already downloaded.']);
  });
});

describe('remove', () => {
  it('deletes the stored copy and the entry', async () => {
    await store().download([song('a'), song('b')]);
    await store().remove(['a']);
    expect(isDownloaded('a')).toBe(false);
    expect(cache.stored.has('u1/a')).toBe(false);
    expect(Object.keys(loadEntries('u1'))).toEqual(['b']);
    await store().removeAll();
    expect(store().entries).toEqual({});
  });
});

describe('init', () => {
  it('keeps each user’s downloads separate', async () => {
    await store().download([song('a')]);
    await store().init('u2');
    expect(isDownloaded('a')).toBe(false);
    await store().init('u1');
    expect(isDownloaded('a')).toBe(true);
  });

  it('drops entries whose audio the browser cleared', async () => {
    await store().download([song('a'), song('b')]);
    cache.stored.delete('u1/b');
    await store().init(null);
    await store().init('u1');
    expect(Object.keys(store().entries)).toEqual(['a']);
  });
});

describe('helpers', () => {
  it('refreshInfo updates saved song details', async () => {
    await store().download([song('a')]);
    store().refreshInfo([song('a', 'Renamed')]);
    expect(store().entries.a.song.title).toBe('Renamed');
  });

  it('lists newest downloads first', () => {
    const entries = {
      a: { song: song('a'), bytes: 1, savedAt: 1 },
      b: { song: song('b'), bytes: 2, savedAt: 2 },
    };
    expect(downloadedSongs(entries).map((s) => s.id)).toEqual(['b', 'a']);
  });
});
