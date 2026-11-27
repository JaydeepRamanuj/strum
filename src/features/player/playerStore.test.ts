import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useToastStore } from '@/components/toastStore';
import type { Song } from '@/types/song';

const engine = vi.hoisted(() => ({
  listeners: [] as Array<(e: { type: string; positionSec?: number; durationSec?: number }) => void>,
  load: vi.fn(),
  play: vi.fn(),
  pause: vi.fn(),
  seek: vi.fn(),
  setVolume: vi.fn(),
  setMuted: vi.fn(),
  prefetch: vi.fn(),
  subscribe: vi.fn(),
}));

vi.mock('./audioEngine', () => {
  engine.subscribe.mockImplementation((l: (typeof engine.listeners)[number]) => {
    engine.listeners.push(l);
    return () => undefined;
  });
  return { audioEngine: engine };
});

const offline = vi.hoisted(() => ({ downloaded: new Set<string>() }));

vi.mock('@/features/offline/downloadsStore', () => ({
  isDownloaded: (id: string) => offline.downloaded.has(id),
  offlineAudioUrl: (id: string) =>
    Promise.resolve(offline.downloaded.has(id) ? `blob:offline/${id}` : null),
}));

vi.mock('@/config/cloudinary', () => ({
  streamUrl: (publicId: string) => `https://stream/${publicId}`,
}));

import { LIBRARY_SOURCE, setPlayCountedHandler, usePlayerStore } from './playerStore';

const song = (id: string, durationSec = 200): Song =>
  ({
    id,
    title: `Song ${id}`,
    artist: 'Artist',
    album: null,
    durationSec,
    cloudinaryPublicId: `pid/${id}`,
    audioUrl: '',
    format: 'mp3',
    bytes: 1,
    coverPublicId: null,
    coverUrl: null,
    searchKeywords: [],
    deleted: false,
    isPublic: false,
    dupKey: null,
    createdAt: null,
  }) as Song;

const songs = ['a', 'b', 'c', 'd'].map((id) => song(id));
const store = () => usePlayerStore.getState();
const emit = (e: { type: string; positionSec?: number; durationSec?: number }) =>
  engine.listeners.forEach((l) => l(e));
const currentId = () => store().queue[store().index]?.id;

beforeEach(() => {
  vi.clearAllMocks();
  offline.downloaded.clear();
  URL.revokeObjectURL = vi.fn();
  usePlayerStore.setState({
    queue: [],
    originalQueue: [],
    index: 0,
    isPlaying: false,
    positionSec: 0,
    durationSec: 0,
    shuffle: false,
    repeat: 'off',
    source: null,
  });
  useToastStore.setState({ toasts: [] });
});

describe('playList', () => {
  it('loads and plays the chosen song', () => {
    store().playList(songs, 2, LIBRARY_SOURCE);
    expect(currentId()).toBe('c');
    expect(engine.load).toHaveBeenLastCalledWith('https://stream/pid/c', 0);
    expect(engine.play).toHaveBeenCalled();
    expect(store().source).toEqual(LIBRARY_SOURCE);
  });

  it('ignores an empty list', () => {
    store().playList([], 0, LIBRARY_SOURCE);
    expect(store().queue).toHaveLength(0);
    expect(engine.load).not.toHaveBeenCalled();
  });
});

describe('next / prev', () => {
  it('next advances and stops at the end with repeat off', () => {
    store().playList(songs, 2, LIBRARY_SOURCE);
    store().next();
    expect(currentId()).toBe('d');
    store().next();
    expect(engine.pause).toHaveBeenCalled();
    expect(store().isPlaying).toBe(false);
    expect(currentId()).toBe('d');
  });

  it('next wraps around when repeat is all', () => {
    usePlayerStore.setState({ repeat: 'all' });
    store().playList(songs, 3, LIBRARY_SOURCE);
    store().next();
    expect(currentId()).toBe('a');
  });

  it('prev restarts a song that has played more than 3 seconds', () => {
    store().playList(songs, 1, LIBRARY_SOURCE);
    usePlayerStore.setState({ positionSec: 10 });
    store().prev();
    expect(engine.seek).toHaveBeenCalledWith(0);
    expect(currentId()).toBe('b');
  });

  it('prev goes back within the first 3 seconds', () => {
    store().playList(songs, 1, LIBRARY_SOURCE);
    store().playList(songs, 2, LIBRARY_SOURCE);
    usePlayerStore.setState({ positionSec: 1 });
    store().prev();
    expect(currentId()).toBe('b');
  });
});

describe('engine events', () => {
  it('repeat one replays the same song when it ends', () => {
    usePlayerStore.setState({ repeat: 'one' });
    store().playList(songs, 0, LIBRARY_SOURCE);
    vi.clearAllMocks();
    emit({ type: 'ended' });
    expect(engine.seek).toHaveBeenCalledWith(0);
    expect(engine.play).toHaveBeenCalled();
    expect(currentId()).toBe('a');
  });

  it('advances to the next song when one ends', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'ended' });
    expect(currentId()).toBe('b');
  });

  it('stops after the last song when repeat is off', () => {
    store().playList(songs, 3, LIBRARY_SOURCE);
    emit({ type: 'ended' });
    expect(store().isPlaying).toBe(false);
  });

  it('marks playback blocked by the browser so the UI can ask for a tap', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'blocked' });
    expect(store().needsTap).toBe(true);
    expect(store().isPlaying).toBe(false);
  });

  it('skips an unplayable song with a toast', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'error' });
    expect(currentId()).toBe('b');
    expect(useToastStore.getState().toasts[0].message).toMatch(/Song a/);
  });

  it('prefetches the next song near the end', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'time', positionSec: 195, durationSec: 200 });
    expect(engine.prefetch).toHaveBeenCalledWith('https://stream/pid/b');
  });
});

describe('shuffle', () => {
  it('keeps the current song first and restores order when turned off', () => {
    store().playList(songs, 2, LIBRARY_SOURCE);
    store().toggleShuffle();
    expect(store().queue[0].id).toBe('c');
    expect(store().index).toBe(0);
    expect(
      store()
        .queue.map((s) => s.id)
        .sort(),
    ).toEqual(['a', 'b', 'c', 'd']);

    store().toggleShuffle();
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(currentId()).toBe('c');
  });
});

describe('queue operations', () => {
  it('playNext inserts directly after the current song', () => {
    store().playList(songs.slice(0, 2), 0, LIBRARY_SOURCE);
    store().playNext(song('x'));
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'x', 'b']);
  });

  it('addToQueue appends to the end', () => {
    store().playList(songs.slice(0, 2), 0, LIBRARY_SOURCE);
    store().addToQueue(song('x'));
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b', 'x']);
  });

  it('removes only upcoming songs', () => {
    store().playList(songs.slice(0, 3), 0, LIBRARY_SOURCE);
    store().removeFromQueue(0);
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b', 'c']);
    store().removeFromQueue(1);
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'c']);
  });

  it('moves upcoming songs and never ahead of the current one', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    store().moveInQueue(3, 1);
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'd', 'b', 'c']);
    store().moveInQueue(2, 0);
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b', 'd', 'c']);
  });

  it('clearQueue keeps the current song and what came before it', () => {
    store().playList(songs, 1, LIBRARY_SOURCE);
    store().clearQueue();
    expect(store().queue.map((s) => s.id)).toEqual(['a', 'b']);
  });
});

describe('repeat and volume', () => {
  it('cycles repeat off → all → one → off', () => {
    store().cycleRepeat();
    expect(store().repeat).toBe('all');
    store().cycleRepeat();
    expect(store().repeat).toBe('one');
    store().cycleRepeat();
    expect(store().repeat).toBe('off');
  });

  it('clamps volume to 0–1 and passes it to the engine', () => {
    store().setVolume(1.7);
    expect(store().volume).toBe(1);
    expect(engine.setVolume).toHaveBeenLastCalledWith(1);
  });
});

describe('restore', () => {
  it('puts a saved queue back paused at its position', () => {
    store().restore({
      songs: songs.slice(0, 2),
      index: 1,
      positionSec: 42,
      source: LIBRARY_SOURCE,
    });
    expect(currentId()).toBe('b');
    expect(store().positionSec).toBe(42);
    expect(engine.load).toHaveBeenLastCalledWith('https://stream/pid/b', 42);
    expect(engine.play).not.toHaveBeenCalled();
  });
});

describe('play counting (Top songs)', () => {
  const counted: string[] = [];
  beforeEach(() => {
    counted.length = 0;
    setPlayCountedHandler((song) => counted.push(song.id));
  });

  /** Plays the loaded song from `from` to `to` in half-second steps. */
  const listen = (from: number, to: number) => {
    for (let t = from; t <= to; t += 0.5) emit({ type: 'time', positionSec: t, durationSec: 200 });
  };

  it('counts a song once after 30 seconds of listening', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    listen(0, 25);
    expect(counted).toEqual([]);
    listen(25.5, 60);
    expect(counted).toEqual(['a']);
  });

  it('does not count a song that was skipped early', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    listen(0, 10);
    store().next();
    listen(0, 10);
    expect(counted).toEqual([]);
  });

  it('counts each song in the queue separately', () => {
    store().playList(songs, 0, LIBRARY_SOURCE);
    listen(0, 31);
    store().next();
    listen(0, 31);
    expect(counted).toEqual(['a', 'b']);
  });

  it('counts again when repeat one starts the song over', () => {
    usePlayerStore.setState({ repeat: 'one' });
    store().playList(songs, 0, LIBRARY_SOURCE);
    listen(0, 31);
    emit({ type: 'ended' });
    listen(0, 31);
    expect(counted).toEqual(['a', 'a']);
  });

  it('counts nothing once the handler is removed', () => {
    setPlayCountedHandler(null);
    store().playList(songs, 0, LIBRARY_SOURCE);
    listen(0, 40);
    expect(counted).toEqual([]);
  });
});

describe('playing while offline', () => {
  it('stops with an offline message when nothing is downloaded', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    store().playList(songs, 0, LIBRARY_SOURCE);

    expect(currentId()).toBe('a'); // did not skip ahead
    expect(store().isPlaying).toBe(false);
    expect(engine.load).not.toHaveBeenCalled();
    expect(engine.pause).toHaveBeenCalled();
    expect(useToastStore.getState().toasts.map((t) => t.message)).toContain(
      "You're offline. Download songs while you're online to listen without a connection.",
    );
    vi.restoreAllMocks();
  });

  it('skips to the next downloaded song', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    offline.downloaded.add('c');
    store().playList(songs, 0, LIBRARY_SOURCE);
    expect(currentId()).toBe('c');
    await vi.waitFor(() => expect(engine.load).toHaveBeenCalledWith('blob:offline/c', 0));
    expect(engine.play).toHaveBeenCalled();
    vi.restoreAllMocks();
  });

  it('moves on to a downloaded song when streaming fails offline', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    offline.downloaded.add('d');
    store().playList(songs, 0, LIBRARY_SOURCE);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    emit({ type: 'error' });
    expect(currentId()).toBe('d');
    await vi.waitFor(() => expect(engine.load).toHaveBeenLastCalledWith('blob:offline/d', 0));
    vi.restoreAllMocks();
  });

  it('still skips an unplayable song when online', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    store().playList(songs, 0, LIBRARY_SOURCE);
    emit({ type: 'error' });
    expect(currentId()).toBe('b');
    vi.restoreAllMocks();
  });
});

describe('downloaded songs', () => {
  it('plays the copy on this device instead of streaming, even online', async () => {
    offline.downloaded.add('b');
    store().playList(songs, 1, LIBRARY_SOURCE);
    await vi.waitFor(() => expect(engine.load).toHaveBeenCalledWith('blob:offline/b', 0));
    expect(engine.load).not.toHaveBeenCalledWith('https://stream/pid/b', 0);
  });

  it('a slow offline read does not load over a newer song', async () => {
    offline.downloaded.add('a');
    store().playList(songs, 0, LIBRARY_SOURCE);
    store().next(); // b streams right away
    await Promise.resolve();
    await Promise.resolve();
    expect(engine.load).toHaveBeenLastCalledWith('https://stream/pid/b', 0);
    expect(engine.load).not.toHaveBeenCalledWith('blob:offline/a', 0);
  });
});
