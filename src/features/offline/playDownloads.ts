import { usePlayerStore } from '@/features/player/playerStore';
import type { PlaySource } from '@/types/player';
import { downloadedSongs, useDownloadsStore } from './downloadsStore';

export const DOWNLOADS_SOURCE: PlaySource = { type: 'downloads', name: 'Downloads' };

/** Plays every downloaded song, newest download first (or shuffled). */
export function playDownloads(options: { shuffle?: boolean; startIndex?: number } = {}): void {
  const songs = downloadedSongs(useDownloadsStore.getState().entries);
  if (songs.length === 0) return;
  const player = usePlayerStore.getState();
  if (options.shuffle !== undefined && player.shuffle !== options.shuffle) player.toggleShuffle();
  usePlayerStore.getState().playList(songs, options.startIndex ?? 0, DOWNLOADS_SOURCE);
}
