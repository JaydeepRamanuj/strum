import { CloudOff, Download, Play, Shuffle, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Button } from '@/components/Button';
import { ConfirmModal } from '@/components/ConfirmModal';
import { EmptyState } from '@/components/EmptyState';
import { useAuth } from '@/features/auth/useAuth';
import { isOwnSong } from '@/features/discover/publicSongs';
import { SongRow } from '@/features/library/SongRow';
import { useSongActions } from '@/features/library/useSongActions';
import { usePlayerStore } from '@/features/player/playerStore';
import { useOnlineStatus } from '@/features/pwa/useOnlineStatus';
import { formatBytes } from '@/lib/formatters';
import { downloadedBytes, downloadedSongs, useDownloadsStore } from './downloadsStore';
import { playDownloads } from './playDownloads';

/** Library's Downloads view: songs saved on this device. They play without a connection. */
export function DownloadsList() {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const online = useOnlineStatus();
  const entries = useDownloadsStore((s) => s.entries);
  const activeCount = useDownloadsStore((s) => Object.keys(s.progress).length);
  const songs = useMemo(() => downloadedSongs(entries), [entries]);
  const bytes = useMemo(() => downloadedBytes(entries), [entries]);
  const currentId = usePlayerStore((s) => s.queue[s.index]?.id);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const actions = useSongActions();
  const [confirmClear, setConfirmClear] = useState(false);

  return (
    <>
      {activeCount > 0 && (
        <p role="status" className="mx-4 mb-3 flex items-center gap-2 text-sm text-muted md:mx-8">
          <Download className="size-4 animate-pulse text-accent" aria-hidden />
          Downloading {activeCount} {activeCount === 1 ? 'song' : 'songs'}…
        </p>
      )}

      {songs.length === 0 ? (
        <EmptyState
          icon={online ? <Download /> : <CloudOff />}
          title="No downloads yet"
          description={
            online
              ? 'Open a song’s menu and tap Download, or download a whole playlist from its menu. Downloads stay on this device and play offline.'
              : 'You’re offline. Next time you’re connected, download songs from their menu to listen without a connection.'
          }
        />
      ) : (
        <div className="px-4 pb-4 md:px-8">
          <p className="mb-3 text-sm text-muted">
            {songs.length} {songs.length === 1 ? 'song' : 'songs'} · {formatBytes(bytes)} on this
            device. They play without a connection.
          </p>
          <div className="mb-3 flex flex-wrap gap-2">
            <Button onClick={() => playDownloads({ shuffle: false })}>
              <Play className="size-4" aria-hidden />
              Play all
            </Button>
            <Button variant="secondary" onClick={() => playDownloads({ shuffle: true })}>
              <Shuffle className="size-4" aria-hidden />
              Shuffle
            </Button>
            <Button variant="ghost" onClick={() => setConfirmClear(true)}>
              <Trash2 className="size-4" aria-hidden />
              Remove all
            </Button>
          </div>

          <ul className="space-y-0.5">
            {songs.map((song, i) => {
              const mine = isOwnSong(song, uid);
              return (
                <SongRow
                  key={song.id}
                  song={song}
                  selectMode={false}
                  selected={false}
                  isCurrent={song.id === currentId}
                  isPlaying={isPlaying}
                  onToggleSelected={() => undefined}
                  onPlay={() => playDownloads({ startIndex: i })}
                  onPlayNext={() => usePlayerStore.getState().playNext(song)}
                  onAddToQueue={() => usePlayerStore.getState().addToQueue(song)}
                  onAddToPlaylist={() => actions.addToPlaylist([song.id])}
                  byline={song.owner && !mine ? `Shared by ${song.owner.name}` : undefined}
                />
              );
            })}
          </ul>
        </div>
      )}

      <ConfirmModal
        open={confirmClear}
        onClose={() => setConfirmClear(false)}
        title="Remove all downloads?"
        description="The songs stay in your library; only the copies on this device are removed. You'll need a connection to play them again."
        confirmLabel="Remove all"
        onConfirm={() => useDownloadsStore.getState().removeAll()}
      />
      {actions.dialogs}
    </>
  );
}
