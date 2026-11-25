import type { Song } from '@/types/song';
import type { PlayStat } from './playStatsApi';

/** The Top songs page shows this many. */
export const TOP_COUNT = 10;

export interface TopSong {
  song: Song;
  count: number;
}

/**
 * Most played songs that can still be played (own library plus friends' public songs): highest
 * count first, the most recently played first on a tie.
 */
export function resolveTopSongs(
  stats: PlayStat[],
  playable: Song[],
  limit: number = TOP_COUNT,
): TopSong[] {
  const byId = new Map(playable.map((s) => [s.id, s]));
  return stats
    .filter((s) => s.count > 0 && byId.has(s.songId))
    .sort((a, b) => b.count - a.count || b.lastPlayedAtMs - a.lastPlayedAtMs)
    .slice(0, limit)
    .map((s) => ({ song: byId.get(s.songId) as Song, count: s.count }));
}
