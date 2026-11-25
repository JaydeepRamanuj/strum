import { ListMusic, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { PlaylistCover } from '@/features/playlists/PlaylistCover';
import { discoverPlaylists } from './publicPlaylists';
import { usePublicPlaylists } from './usePublicPlaylists';
import { usePublicSongs } from './usePublicSongs';

const inputClass =
  'h-10 w-full rounded-full border border-border bg-surface-2 pr-4 pl-9 text-sm outline-none focus:border-accent';

/** Playlists friends made public, newest first. */
export function DiscoverPlaylistsTab() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { playlists, loading: playlistsLoading, error } = usePublicPlaylists();
  const { songs, loading: songsLoading } = usePublicSongs();
  const [query, setQuery] = useState('');

  const visible = useMemo(
    () => discoverPlaylists(playlists, songs, { query, filter: 'everyone', uid }),
    [playlists, songs, query, uid],
  );
  const loading = playlistsLoading || songsLoading;

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading shared playlists" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        icon={<ListMusic />}
        title="Couldn't load shared playlists"
        description="Check your connection. Shared playlists will appear once you're back online."
      />
    );
  }
  if (playlists.length === 0) {
    return (
      <EmptyState
        icon={<ListMusic />}
        title="No public playlists yet"
        description="Open one of your playlists, choose ⋮ → Make public, and your friends can find it here."
      />
    );
  }

  return (
    <div className="px-4 pb-6 md:px-8">
      <label className="relative mb-3 block sm:max-w-xs">
        <span className="sr-only">Find a shared playlist</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Playlist or friend"
          className={inputClass}
        />
      </label>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">
          {query ? `No shared playlists match “${query}”.` : 'No playlists here yet.'}
        </p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {visible.map(({ playlist, songs: playable }) => (
            <li key={playlist.id}>
              <NavLink
                to={`/discover/playlist/${playlist.id}`}
                className="block rounded-xl p-2 transition-colors hover:bg-surface-2"
              >
                <PlaylistCover
                  coverUrl={playlist.coverUrl}
                  songs={playable}
                  seed={playlist.id}
                  className="w-full"
                />
                <p className="mt-2 truncate text-sm font-medium">{playlist.name}</p>
                <p className="truncate text-xs text-muted">
                  {playlist.ownerUid === uid ? 'You' : playlist.ownerName} · {playable.length}{' '}
                  {playable.length === 1 ? 'song' : 'songs'}
                </p>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
