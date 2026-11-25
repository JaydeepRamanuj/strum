import { ArrowLeft, Mic2, Play, Shuffle } from 'lucide-react';
import { useMemo } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { usePlayerStore } from '@/features/player/playerStore';
import { groupArtists, songsByArtist } from './artists';
import { DiscoverSongList } from './DiscoverSongList';
import { DISCOVER_SOURCE } from './publicSongs';
import { usePublicSongs } from './usePublicSongs';

/** All public songs by one artist (matched on the artist tag). */
export function DiscoverArtistPage() {
  const { key: encoded = '' } = useParams<{ key: string }>();
  const key = decodeURIComponent(encoded);
  const navigate = useNavigate();
  const { songs: publicSongs, loading } = usePublicSongs();

  const songs = useMemo(() => songsByArtist(key, publicSongs), [key, publicSongs]);
  const name = useMemo(
    () => groupArtists(songs).find((a) => a.key === key)?.name ?? key,
    [songs, key],
  );
  const source = { ...DISCOVER_SOURCE, name };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading artist" />
      </div>
    );
  }

  if (songs.length === 0) {
    return (
      <EmptyState
        icon={<Mic2 />}
        title="No public songs by this artist"
        description="Their songs may have been made private."
        action={
          <Button variant="secondary" onClick={() => navigate('/discover?tab=artists')}>
            Back to Discover
          </Button>
        }
      />
    );
  }

  const play = (shuffle: boolean) => {
    const store = usePlayerStore.getState();
    if (shuffle && !store.shuffle) store.toggleShuffle();
    usePlayerStore.getState().playList(songs, 0, source);
  };

  return (
    <>
      <div className="px-4 pt-4 md:px-8">
        <Link
          to="/discover?tab=artists"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Discover
        </Link>
      </div>
      <PageHeader
        title={name}
        subtitle={`${songs.length} ${songs.length === 1 ? 'song' : 'songs'} shared by friends`}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => play(false)}>
              <Play className="size-4" aria-hidden />
              Play
            </Button>
            <Button variant="secondary" onClick={() => play(true)}>
              <Shuffle className="size-4" aria-hidden />
              Shuffle
            </Button>
          </div>
        }
      />
      <div className="px-4 md:px-8">
        <DiscoverSongList songs={songs} source={source} />
      </div>
    </>
  );
}
