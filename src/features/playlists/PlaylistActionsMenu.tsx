import {
  CopyPlus,
  EllipsisVertical,
  FolderInput,
  Globe,
  Lock,
  Pencil,
  Play,
  Shuffle,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';
import { ConfirmModal } from '@/components/ConfirmModal';
import { IconButton } from '@/components/IconButton';
import { Menu } from '@/components/Menu';
import { NamePromptModal } from '@/components/NamePromptModal';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { useFolders } from '@/features/folders/useFolders';
import { MoveToDialog } from '@/features/folders/MoveToDialog';
import { usePlayableSongs } from '@/features/discover/usePublicSongs';
import { friendlyError } from '@/lib/errors';
import type { Playlist } from '@/types/playlist';
import {
  applyPublishPlan,
  deletePlaylist,
  duplicatePlaylist,
  movePlaylist,
  publishPlaylist,
  renamePlaylist,
  unpublishPlaylist,
} from './playlistApi';
import { planIsClean, type PublishPlan } from './publicPlaylistPlan';
import { PublishSongsDialog } from './PublishSongsDialog';
import { usePublishContext } from './usePublishContext';
import { playPlaylist } from './playPlaylist';
import { resolvePlaylistSongs } from './resolvePlaylistSongs';

type Dialog = 'rename' | 'move' | 'delete';

interface PlaylistActionsMenuProps {
  playlist: Playlist;
  /** Called after the playlist is deleted (e.g. to leave its page). */
  onDeleted?: () => void;
  triggerClassName?: string;
}

/** Play, shuffle, rename, move, share, duplicate and delete for one playlist. */
export function PlaylistActionsMenu({
  playlist,
  onDeleted,
  triggerClassName,
}: PlaylistActionsMenuProps) {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { songs: library } = usePlayableSongs();
  const { folders } = useFolders();
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const { owner, planFor } = usePublishContext();
  const [publishPlan, setPublishPlan] = useState<PublishPlan | null>(null);

  const songs = () => resolvePlaylistSongs(playlist.songIds, library);

  const duplicate = async () => {
    if (!uid) return;
    try {
      await duplicatePlaylist(uid, playlist);
      toast.success(`Copied “${playlist.name}”`);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't copy the playlist. Try again."));
    }
  };

  const publish = async (plan: PublishPlan) => {
    if (!owner) return;
    await applyPublishPlan(owner, plan);
    await publishPlaylist(owner, playlist, plan.songIds);
    toast.success(`“${playlist.name}” is public`);
  };

  const makePublic = async () => {
    if (playlist.songIds.length === 0) {
      toast.info('Add some songs first, then share the playlist.');
      return;
    }
    const plan = planFor(playlist.songIds);
    if (plan.songIds.length === 0) {
      toast.error("None of this playlist's songs can be made public.");
      return;
    }
    if (!planIsClean(plan)) {
      setPublishPlan(plan);
      return;
    }
    try {
      await publish(plan);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't share the playlist. Try again."));
    }
  };

  const makePrivate = async () => {
    if (!uid) return;
    try {
      await unpublishPlaylist(uid, playlist.id);
      toast.success(`“${playlist.name}” is private again`);
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't make the playlist private. Try again."));
    }
  };

  return (
    <>
      <Menu
        align="end"
        trigger={({ toggle }) => (
          <IconButton
            label={`More options for ${playlist.name}`}
            icon={<EllipsisVertical className="size-5" />}
            size="sm"
            onClick={toggle}
            className={triggerClassName}
          />
        )}
        items={[
          { label: 'Play', icon: <Play />, onSelect: () => playPlaylist(playlist, songs()) },
          {
            label: 'Shuffle play',
            icon: <Shuffle />,
            onSelect: () => playPlaylist(playlist, songs(), { shuffle: true }),
          },
          { label: 'Rename', icon: <Pencil />, onSelect: () => setDialog('rename') },
          { label: 'Move to…', icon: <FolderInput />, onSelect: () => setDialog('move') },
          playlist.isPublic
            ? { label: 'Make private', icon: <Lock />, onSelect: makePrivate }
            : { label: 'Make public', icon: <Globe />, onSelect: makePublic },
          { label: 'Duplicate', icon: <CopyPlus />, onSelect: duplicate },
          { label: 'Delete', icon: <Trash2 />, danger: true, onSelect: () => setDialog('delete') },
        ]}
      />

      {publishPlan && (
        <PublishSongsDialog
          title={`Make “${playlist.name}” public`}
          confirmLabel="Make public"
          plan={publishPlan}
          onClose={() => setPublishPlan(null)}
          onConfirm={() => publish(publishPlan)}
        />
      )}

      {dialog === 'rename' && uid && (
        <NamePromptModal
          open
          onClose={() => setDialog(null)}
          title="Rename playlist"
          label="Playlist name"
          initialValue={playlist.name}
          submitLabel="Save"
          onSubmit={(name) => renamePlaylist(uid, playlist.id, name)}
        />
      )}

      {dialog === 'move' && uid && (
        <MoveToDialog
          title={`Move “${playlist.name}”`}
          folders={folders}
          currentFolderId={playlist.folderId}
          onMove={(target) => movePlaylist(uid, playlist.id, target)}
          onClose={() => setDialog(null)}
        />
      )}

      {dialog === 'delete' && uid && (
        <ConfirmModal
          open
          onClose={() => setDialog(null)}
          title={`Delete “${playlist.name}”?`}
          description="The playlist is removed. Its songs stay in your library."
          confirmLabel="Delete playlist"
          onConfirm={async () => {
            await deletePlaylist(uid, playlist.id);
            toast.success(`Deleted “${playlist.name}”`);
            onDeleted?.();
          }}
        />
      )}
    </>
  );
}
