import { Compass, Search } from 'lucide-react';
import { useMemo, useState } from 'react';
import { EmptyState } from '@/components/EmptyState';
import { Select } from '@/components/Select';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { DiscoverSongList } from './DiscoverSongList';
import {
  DISCOVER_SORT_LABELS,
  DISCOVER_SOURCE,
  discoverSongs,
  type DiscoverFilter,
  type DiscoverSort,
} from './publicSongs';
import { usePublicSongs } from './usePublicSongs';

const FILTER_LABELS: Record<DiscoverFilter, string> = {
  everyone: 'Everyone',
  others: 'Friends',
  mine: 'Mine',
};

const inputClass =
  'h-10 rounded-full border border-border bg-surface-2 text-sm outline-none focus:border-accent';

/**
 * Songs that any Strum user made public. Anyone can play, queue and add them to their own
 * playlists. The owner can edit it or make it private again; an admin can edit anyone's.
 */
export function DiscoverSongsTab() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { songs, loading, error } = usePublicSongs();

  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<DiscoverSort>('recent');
  const [filter, setFilter] = useState<DiscoverFilter>('everyone');

  const visible = useMemo(
    () => discoverSongs(songs, { query, sort, filter, uid }),
    [songs, query, sort, filter, uid],
  );

  return (
    <>
      {loading && (
        <div className="flex justify-center py-16">
          <Spinner label="Loading shared songs" />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={<Compass />}
          title="Couldn't load Discover"
          description="Check your connection. Shared songs will appear once you're back online."
        />
      )}

      {!loading && !error && songs.length === 0 && (
        <EmptyState
          icon={<Compass />}
          title="Nothing shared yet"
          description="Make a song public from your Library (⋮ → Make public) and your friends can find it here."
        />
      )}

      {!loading && !error && songs.length > 0 && (
        <div className="px-4 md:px-8">
          <p className="mb-3 text-sm text-muted">
            {songs.length} {songs.length === 1 ? 'song' : 'songs'} shared by friends
          </p>
          <div
            role="group"
            aria-label="Shared by"
            className="mb-3 inline-flex rounded-full bg-surface-2 p-1"
          >
            {(Object.keys(FILTER_LABELS) as DiscoverFilter[]).map((key) => (
              <button
                key={key}
                type="button"
                aria-pressed={filter === key}
                onClick={() => setFilter(key)}
                className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                  filter === key ? 'bg-surface text-fg shadow' : 'text-muted hover:text-fg'
                }`}
              >
                {FILTER_LABELS[key]}
              </button>
            ))}
          </div>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <label className="relative min-w-0 flex-1 sm:max-w-xs">
              <span className="sr-only">Filter shared songs</span>
              <Search
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Song, artist or friend"
                className={`${inputClass} w-full pr-4 pl-9`}
              />
            </label>
            <Select
              pill
              label="Sort by"
              value={sort}
              onChange={setSort}
              options={(Object.keys(DISCOVER_SORT_LABELS) as DiscoverSort[]).map((key) => ({
                value: key,
                label: DISCOVER_SORT_LABELS[key],
              }))}
            />
          </div>

          {visible.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted">
              {query ? `No shared songs match “${query}”.` : 'No songs here yet.'}
            </p>
          ) : (
            <DiscoverSongList songs={visible} source={DISCOVER_SOURCE} />
          )}
        </div>
      )}
    </>
  );
}
