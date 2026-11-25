import { useAuth } from '@/features/auth/useAuth';
import { useIsAdmin } from '@/features/invites/useIsAdmin';
import { SongRow } from '@/features/library/SongRow';
import { useSongActions } from '@/features/library/useSongActions';
import { useSongVisibility } from '@/features/library/useSongVisibility';
import { usePlayerStore } from '@/features/player/playerStore';
import type { PlaySource } from '@/types/player';
import type { PublicSong } from './publicSongs';

interface DiscoverSongListProps {
  songs: PublicSong[];
  source: PlaySource;
}

/**
 * Rows for public songs: play, queue and add to a playlist for everyone; edit and make private
 * for the owner; edit for an admin. Used by the Songs tab and by playlist and artist pages.
 */
export function DiscoverSongList({ songs, source }: DiscoverSongListProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const actions = useSongActions();
  const isAdmin = useIsAdmin() === true;
  const { setPublic } = useSongVisibility();

  return (
    <>
      <ul className="space-y-0.5 pb-4">
        {songs.map((song, i) => {
          const mine = song.owner.uid === uid;
          return (
            <SongRow
              key={song.id}
              song={song}
              selectMode={false}
              selected={false}
              isCurrent={song.id === currentId}
              isPlaying={isPlaying}
              onToggleSelected={() => undefined}
              onPlay={() => usePlayerStore.getState().playList(songs, i, source)}
              onPlayNext={() => usePlayerStore.getState().playNext(song)}
              onAddToQueue={() => usePlayerStore.getState().addToQueue(song)}
              onAddToPlaylist={() => actions.addToPlaylist([song.id])}
              onEdit={mine || isAdmin ? actions.editSong : undefined}
              onTogglePublic={mine ? () => void setPublic([song], false) : undefined}
              byline={mine ? 'Shared by you' : `Shared by ${song.owner.name}`}
            />
          );
        })}
      </ul>
      {actions.dialogs}
    </>
  );
}
