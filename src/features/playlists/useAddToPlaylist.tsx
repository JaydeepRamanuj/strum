import { useState, type ReactNode } from 'react';
import { toast } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { friendlyError } from '@/lib/errors';
import type { Playlist } from '@/types/playlist';
import { planIsClean, type PublishPlan } from './publicPlaylistPlan';
import { applyPublishPlan, addSongs } from './playlistApi';
import { PublishSongsDialog } from './PublishSongsDialog';
import { usePublishContext } from './usePublishContext';

interface Options {
  successMessage: string;
  fallbackError: string;
  /** Called after the songs were added (close the dialog that started this). */
  onDone: () => void;
}

interface Pending {
  playlist: Playlist;
  songIds: string[];
  plan: PublishPlan;
  options: Options;
}

/**
 * Adds songs to a playlist. A public playlist can only hold public songs, so for one the songs
 * are checked first: private songs are made public (after the user confirms) and songs that
 * already have a public copy use that copy. Render `dialog` next to the caller.
 */
export function useAddToPlaylist(): {
  addTo: (playlist: Playlist, songIds: string[], options: Options) => Promise<void>;
  dialog: ReactNode;
} {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const { owner, planFor } = usePublishContext();
  const [pending, setPending] = useState<Pending | null>(null);

  const run = async (playlist: Playlist, songIds: string[], plan: PublishPlan | null) => {
    if (!uid || !owner) return;
    if (plan) await applyPublishPlan(owner, plan);
    await addSongs(uid, playlist.id, plan ? plan.songIds : songIds);
  };

  const addTo = async (playlist: Playlist, songIds: string[], options: Options) => {
    if (!uid || !owner) return;
    const plan = playlist.isPublic ? planFor(songIds) : null;
    if (plan && plan.songIds.length === 0) {
      toast.error("Those songs can't go into a public playlist.");
      return;
    }
    if (plan && !planIsClean(plan)) {
      setPending({ playlist, songIds, plan, options });
      return;
    }
    try {
      await run(playlist, songIds, plan);
      toast.success(options.successMessage);
      options.onDone();
    } catch (err) {
      toast.error(friendlyError(err, options.fallbackError));
    }
  };

  const dialog = pending ? (
    <PublishSongsDialog
      title={`Add to “${pending.playlist.name}”`}
      confirmLabel="Make public and add"
      plan={pending.plan}
      onClose={() => setPending(null)}
      onConfirm={async () => {
        await run(pending.playlist, pending.songIds, pending.plan);
        toast.success(pending.options.successMessage);
        pending.options.onDone();
      }}
    />
  ) : null;

  return { addTo, dialog };
}
