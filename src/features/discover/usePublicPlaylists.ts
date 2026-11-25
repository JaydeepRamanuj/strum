import { useEffect, useState } from 'react';
import { useAuth } from '@/features/auth/useAuth';
import { subscribePublicPlaylists } from './publicPlaylistApi';
import type { PublicPlaylist } from './publicPlaylists';

export interface PublicPlaylistsState {
  playlists: PublicPlaylist[];
  loading: boolean;
  error: Error | null;
}

/** Live list of public playlists from every user (Discover). */
export function usePublicPlaylists(): PublicPlaylistsState {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const [data, setData] = useState<{ playlists: PublicPlaylist[]; error: Error | null } | null>(
    null,
  );

  useEffect(() => {
    if (!uid) return;
    return subscribePublicPlaylists(
      (playlists) => setData({ playlists, error: null }),
      (error) => setData((prev) => ({ playlists: prev?.playlists ?? [], error })),
    );
  }, [uid]);

  return {
    playlists: data?.playlists ?? [],
    error: data?.error ?? null,
    loading: data === null && !!uid,
  };
}
