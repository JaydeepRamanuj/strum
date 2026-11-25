import { describe, expect, it } from 'vitest';
import type { Song } from '@/types/song';
import type { PlayStat } from './playStatsApi';
import { resolveTopSongs } from './topSongs';

const song = (id: string) => ({ id, title: id }) as Song;
const stat = (songId: string, count: number, lastPlayedAtMs = 0): PlayStat => ({
  songId,
  count,
  lastPlayedAtMs,
});

describe('resolveTopSongs', () => {
  it('orders by count, then by most recent play', () => {
    const top = resolveTopSongs(
      [stat('a', 3, 10), stat('b', 5, 1), stat('c', 3, 20)],
      ['a', 'b', 'c'].map(song),
    );
    expect(top.map((t) => t.song.id)).toEqual(['b', 'c', 'a']);
    expect(top.map((t) => t.count)).toEqual([5, 3, 3]);
  });

  it('drops songs that are deleted or no longer public', () => {
    const top = resolveTopSongs([stat('gone', 9), stat('a', 2)], [song('a')]);
    expect(top.map((t) => t.song.id)).toEqual(['a']);
  });

  it('fills the 10 from what is left after dropping unavailable songs', () => {
    const stats = Array.from({ length: 15 }, (_, i) => stat(`s${i}`, 100 - i));
    // The three most played are gone.
    const playable = stats.slice(3).map((s) => song(s.songId));
    const top = resolveTopSongs(stats, playable);
    expect(top).toHaveLength(10);
    expect(top[0].song.id).toBe('s3');
  });

  it('ignores zero counts', () => {
    expect(resolveTopSongs([stat('a', 0)], [song('a')])).toEqual([]);
  });
});
