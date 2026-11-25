import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { usePlayableSongs } from '@/features/discover/usePublicSongs';
import { subscribePlayStats, type PlayStat } from './playStatsApi';
import { resolveTopSongs, type TopSong } from './topSongs';

export interface TopSongsState {
  top: TopSong[];
  loading: boolean;
  error: Error | null;
}

/** The signed-in user's most played songs that can still be played. */
export function useTopSongs(): TopSongsState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { songs: playable, loading: songsLoading } = usePlayableSongs();
  const [data, setData] = useState<{ stats: PlayStat[]; error: Error | null } | null>(null);

  useEffect(() => {
    if (!uid) return;
    return subscribePlayStats(
      uid,
      (stats) => setData({ stats, error: null }),
      (error) => setData((prev) => ({ stats: prev?.stats ?? [], error })),
    );
  }, [uid]);

  const top = useMemo(() => resolveTopSongs(data?.stats ?? [], playable), [data, playable]);
  return {
    top,
    error: data?.error ?? null,
    loading: (data === null && !!uid) || songsLoading,
  };
}
