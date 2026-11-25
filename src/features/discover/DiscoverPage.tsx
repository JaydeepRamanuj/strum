import { useSearchParams } from 'react-router-dom';
import { PageHeader } from '@/components/PageHeader';
import { DiscoverArtistsTab } from './DiscoverArtistsTab';
import { DiscoverPlaylistsTab } from './DiscoverPlaylistsTab';
import { DiscoverSongsTab } from './DiscoverSongsTab';

type Tab = 'songs' | 'playlists' | 'artists';

const TABS: { id: Tab; label: string }[] = [
  { id: 'songs', label: 'Songs' },
  { id: 'playlists', label: 'Playlists' },
  { id: 'artists', label: 'Artists' },
];

const isTab = (value: string | null): value is Tab => TABS.some((t) => t.id === value);

/** Everything friends shared: songs, playlists and artists (grouped from the songs). */
export function DiscoverPage() {
  const [params, setParams] = useSearchParams();
  const requested = params.get('tab');
  const tab: Tab = isTab(requested) ? requested : 'songs';

  return (
    <>
      <PageHeader title="Discover" subtitle="Songs, playlists and artists your friends shared" />

      <div className="px-4 pb-3 md:px-8">
        <div
          role="tablist"
          aria-label="Discover"
          className="inline-flex rounded-full bg-surface-2 p-1"
        >
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              onClick={() => setParams(id === 'songs' ? {} : { tab: id }, { replace: true })}
              className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors sm:px-4 ${
                tab === id ? 'bg-surface text-fg shadow' : 'text-muted hover:text-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div role="tabpanel">
        {tab === 'songs' && <DiscoverSongsTab />}
        {tab === 'playlists' && <DiscoverPlaylistsTab />}
        {tab === 'artists' && <DiscoverArtistsTab />}
      </div>
    </>
  );
}
