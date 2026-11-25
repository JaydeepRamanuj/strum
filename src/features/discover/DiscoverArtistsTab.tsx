import { Mic2, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { NavLink } from 'react-router-dom';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { PlaylistCover } from '@/features/playlists/PlaylistCover';
import { normalizeText } from '@/lib/keywords';
import { groupArtists } from './artists';
import { usePublicSongs } from './usePublicSongs';

const inputClass =
  'h-10 w-full rounded-full border border-border bg-surface-2 pr-4 pl-9 text-sm outline-none focus:border-accent';

/** Artists with public songs, grouped from the songs' artist tags. */
export function DiscoverArtistsTab() {
  const { songs, loading, error } = usePublicSongs();
  const [query, setQuery] = useState('');

  const artists = useMemo(() => groupArtists(songs), [songs]);
  const visible = useMemo(() => {
    const words = normalizeText(query).split(' ').filter(Boolean);
    return artists.filter((a) => words.every((w) => a.key.includes(w)));
  }, [artists, query]);

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Spinner label="Loading artists" />
      </div>
    );
  }
  if (error) {
    return (
      <EmptyState
        icon={<Mic2 />}
        title="Couldn't load artists"
        description="Check your connection. Artists will appear once you're back online."
      />
    );
  }
  if (artists.length === 0) {
    return (
      <EmptyState
        icon={<Mic2 />}
        title="No artists yet"
        description="Artists appear here once friends share songs that have an artist in their info."
      />
    );
  }

  return (
    <div className="px-4 pb-6 md:px-8">
      <label className="relative mb-3 block sm:max-w-xs">
        <span className="sr-only">Find an artist</span>
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
          aria-hidden
        />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Artist"
          className={inputClass}
        />
      </label>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted">No artists match “{query}”.</p>
      ) : (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
          {visible.map((artist) => (
            <li key={artist.key}>
              <NavLink
                to={`/discover/artist/${encodeURIComponent(artist.key)}`}
                className="block rounded-xl p-2 transition-colors hover:bg-surface-2"
              >
                <PlaylistCover
                  coverUrl={null}
                  songs={artist.songs}
                  seed={artist.key}
                  className="w-full"
                />
                <p className="mt-2 truncate text-sm font-medium">{artist.name}</p>
                <p className="truncate text-xs text-muted">
                  {artist.songs.length} {artist.songs.length === 1 ? 'song' : 'songs'}
                </p>
              </NavLink>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
