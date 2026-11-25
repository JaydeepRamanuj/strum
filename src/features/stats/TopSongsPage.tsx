import { Play, TrendingUp } from 'lucide-react';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { PageHeader } from '@/components/PageHeader';
import { Spinner } from '@/components/Spinner';
import { useAuth } from '@/features/auth/useAuth';
import { isOwnSong } from '@/features/discover/publicSongs';
import { SongRow } from '@/features/library/SongRow';
import { useSongActions } from '@/features/library/useSongActions';
import { useSongVisibility } from '@/features/library/useSongVisibility';
import { usePlayerStore } from '@/features/player/playerStore';
import type { PlaySource } from '@/types/player';
import { useTopSongs } from './useTopSongs';

const TOP_SOURCE: PlaySource = { type: 'top', name: 'Top songs' };

/** The user's 10 most played songs, with how many times each was played. */
export function TopSongsPage() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { top, loading, error } = useTopSongs();
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const actions = useSongActions();
  const { setPublic } = useSongVisibility();

  const songs = top.map((t) => t.song);
  const play = (index: number) => usePlayerStore.getState().playList(songs, index, TOP_SOURCE);

  return (
    <>
      <PageHeader
        title="Top songs"
        subtitle={loading ? 'Loading…' : 'Your most played, all time'}
        actions={
          <Button variant="secondary" disabled={songs.length === 0} onClick={() => play(0)}>
            <Play className="size-4" aria-hidden />
            Play all
          </Button>
        }
      />

      {loading && (
        <div className="flex justify-center py-16">
          <Spinner label="Loading top songs" />
        </div>
      )}

      {!loading && error && (
        <EmptyState
          icon={<TrendingUp />}
          title="Couldn't load your top songs"
          description="Check your connection and try again."
        />
      )}

      {!loading && !error && top.length === 0 && (
        <EmptyState
          icon={<TrendingUp />}
          title="No top songs yet"
          description="Play a song for 30 seconds and it starts counting. Your most played songs will show up here."
        />
      )}

      {!loading && !error && top.length > 0 && (
        <ul className="space-y-0.5 px-4 pb-4 md:px-8">
          {top.map(({ song, count }, i) => {
            const mine = isOwnSong(song, uid);
            return (
              <SongRow
                key={song.id}
                song={song}
                rank={i + 1}
                selectMode={false}
                selected={false}
                isCurrent={song.id === currentId}
                isPlaying={isPlaying}
                onToggleSelected={() => undefined}
                onPlay={() => play(i)}
                onPlayNext={() => usePlayerStore.getState().playNext(song)}
                onAddToQueue={() => usePlayerStore.getState().addToQueue(song)}
                onAddToPlaylist={() => actions.addToPlaylist([song.id])}
                onEdit={mine ? actions.editSong : undefined}
                onTogglePublic={mine ? () => void setPublic([song], !song.isPublic) : undefined}
                byline={`${count} ${count === 1 ? 'play' : 'plays'}${
                  song.owner && !mine ? ` · Shared by ${song.owner.name}` : ''
                }`}
              />
            );
          })}
        </ul>
      )}

      {actions.dialogs}
    </>
  );
}
