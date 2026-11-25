import { useMemo } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { ownerNameFor } from '@/features/discover/publicSongs';
import { usePublicSongs } from '@/features/discover/usePublicSongs';
import { useSongs } from '@/features/library/useSongs';
import type { SongOwner } from '@/types/song';
import { planPublicSongs, type PublishPlan } from './publicPlaylistPlan';

/** What a public playlist needs to know about the user's songs and Discover. */
export function usePublishContext(): {
  owner: SongOwner | null;
  planFor: (songIds: string[]) => PublishPlan;
} {
  const { user } = useAuth();
  const { songs: library } = useSongs();
  const { songs: publicSongs } = usePublicSongs();

  const owner = useMemo<SongOwner | null>(
    () => (user ? { uid: user.uid, name: ownerNameFor(user) } : null),
    [user],
  );
  return {
    owner,
    planFor: (songIds) => planPublicSongs(songIds, library, publicSongs),
  };
}
