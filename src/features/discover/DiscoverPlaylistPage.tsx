import { ArrowLeft, ListMusic, ListPlus, Play, Shuffle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button';
import { EmptyState } from '@/components/EmptyState';
import { Spinner } from '@/components/Spinner';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { usePlayerStore } from '@/features/player/playerStore';
import { addSongs, createPlaylist } from '@/features/playlists/playlistApi';
import { PlaylistCover } from '@/features/playlists/PlaylistCover';
import { resolvePlaylistSongs, totalDurationSec } from '@/features/playlists/resolvePlaylistSongs';
import { friendlyError } from '@/lib/errors';
import { formatTotalDuration } from '@/lib/formatters';
import { DiscoverSongList } from './DiscoverSongList';
import { DISCOVER_SOURCE, type PublicSong } from './publicSongs';
import { usePublicPlaylists } from './usePublicPlaylists';
import { usePublicSongs } from './usePublicSongs';

/** A public playlist: play it, or save a copy to your own playlists. Read-only. */
export function DiscoverPlaylistPage() {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { playlists, loading: playlistsLoading } = usePublicPlaylists();
  const { songs: publicSongs, loading: songsLoading } = usePublicSongs();
  const [saving, setSaving] = useState(false);

  const playlist = playlists.find((p) => p.id === id);
  const songs = useMemo(
    () => (playlist ? (resolvePlaylistSongs(playlist.songIds, publicSongs) as PublicSong[]) : []),
    [playlist, publicSongs],
  );
  const source = { ...DISCOVER_SOURCE, name: playlist?.name ?? DISCOVER_SOURCE.name };

  if (playlistsLoading || songsLoading) {
    return (
      <div className="flex justify-center py-24">
        <Spinner label="Loading playlist" />
      </div>
    );
  }

  if (!playlist || songs.length === 0) {
    return (
      <EmptyState
        icon={<ListMusic />}
        title="This playlist isn't shared any more"
        description="Its owner made it private or deleted it."
        action={
          <Button variant="secondary" onClick={() => navigate('/discover?tab=playlists')}>
            Back to Discover
          </Button>
        }
      />
    );
  }

  const mine = playlist.ownerUid === uid;
  const play = (shuffle: boolean) => {
    const store = usePlayerStore.getState();
    if (shuffle && !store.shuffle) store.toggleShuffle();
    usePlayerStore.getState().playList(songs, 0, source);
  };

  const save = async () => {
    if (!uid) return;
    setSaving(true);
    try {
      const newId = await createPlaylist(uid, playlist.name);
      await addSongs(
        uid,
        newId,
        songs.map((s) => s.id),
      );
      toast.success(`Saved “${playlist.name}” to your playlists`);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't save the playlist. Try again."));
    } finally {
      setSaving(false);
    }
  };

  const hidden = playlist.songIds.length - songs.length;

  return (
    <>
      <div className="px-4 pt-4 md:px-8">
        <Link
          to="/discover?tab=playlists"
          className="inline-flex items-center gap-1 text-sm text-muted hover:text-fg"
        >
          <ArrowLeft className="size-4" aria-hidden />
          Discover
        </Link>
      </div>
      <header className="flex flex-col gap-5 px-4 pt-4 pb-4 md:flex-row md:items-end md:gap-8 md:px-8">
        <PlaylistCover
          coverUrl={playlist.coverUrl}
          songs={songs}
          seed={playlist.id}
          className="w-40 md:w-52"
        />
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold tracking-wider text-muted uppercase">
            Public playlist
          </p>
          <h1 className="mt-1 line-clamp-2 text-3xl font-bold break-words md:text-4xl">
            {playlist.name}
          </h1>
          <p className="mt-2 text-sm text-muted">
            {mine ? 'Shared by you' : `Shared by ${playlist.ownerName}`} · {songs.length}{' '}
            {songs.length === 1 ? 'song' : 'songs'} · {formatTotalDuration(totalDurationSec(songs))}
          </p>
          {hidden > 0 && (
            <p className="mt-1 text-xs text-muted">
              {hidden === 1
                ? '1 song is no longer public and is hidden.'
                : `${hidden} songs are no longer public and are hidden.`}
            </p>
          )}
          {playlist.description && (
            <p className="mt-2 text-sm text-muted">{playlist.description}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Button onClick={() => play(false)}>
              <Play className="size-4" aria-hidden />
              Play
            </Button>
            <Button variant="secondary" onClick={() => play(true)}>
              <Shuffle className="size-4" aria-hidden />
              Shuffle
            </Button>
            {mine ? (
              <Link
                to={`/playlist/${playlist.id}`}
                className="text-sm font-medium text-accent hover:underline"
              >
                Manage in your playlists
              </Link>
            ) : (
              <Button variant="secondary" onClick={() => void save()} disabled={saving}>
                <ListPlus className="size-4" aria-hidden />
                Save to my playlists
              </Button>
            )}
          </div>
        </div>
      </header>

      <div className="px-4 md:px-8">
        <DiscoverSongList songs={songs} source={source} />
      </div>
    </>
  );
}
