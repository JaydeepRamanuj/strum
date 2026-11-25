import { useEffect } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { setPlayCountedHandler } from '@/features/player/playerStore';
import { recordPlay } from './playStatsApi';

/**
 * Mount once inside the signed-in layout. Saves a play for the signed-in user each time the
 * player says a song has been listened to long enough. Failures (offline, rules) are ignored:
 * a missed count isn't worth interrupting the music for.
 */
export function usePlayCounting(): void {
  const { user } = useAuth();
  const uid = user?.uid ?? null;

  useEffect(() => {
    if (!uid) return;
    setPlayCountedHandler((song) => {
      recordPlay(uid, song.id).catch(() => undefined);
    });
    return () => setPlayCountedHandler(null);
  }, [uid]);
}
