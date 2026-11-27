import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast, useToastStore } from '@/components/toastStore';
import { useAuth } from '@/features/auth/useAuth';
import { usePlayerStore } from '@/features/player/playerStore';
import { useOnlineStatus } from '@/features/pwa/useOnlineStatus';
import { isDownloaded, useDownloadsStore } from './downloadsStore';
import { playDownloads } from './playDownloads';

const PROMPT_MS = 12_000;

/**
 * Loads this user's downloads, and when the connection drops offers to play them
 * (once per offline spell, and not if a downloaded song is already playing).
 */
export function useOfflineDownloads(): void {
  const { user } = useAuth();
  const uid = user?.uid ?? null;
  const online = useOnlineStatus();
  const count = useDownloadsStore((s) => (s.uid === uid ? Object.keys(s.entries).length : 0));
  const navigate = useNavigate();
  const prompted = useRef(false);
  const toastId = useRef<number | null>(null);

  useEffect(() => {
    void useDownloadsStore.getState().init(uid);
  }, [uid]);

  useEffect(() => {
    if (online) {
      prompted.current = false;
      if (toastId.current !== null) useToastStore.getState().dismiss(toastId.current);
      toastId.current = null;
      return;
    }
    if (prompted.current || count === 0) return;
    prompted.current = true;
    const player = usePlayerStore.getState();
    const current = player.queue[player.index];
    if (player.isPlaying && current && isDownloaded(current.id)) return;
    toastId.current = toast.withAction(
      `You're offline. Listen to your ${count} downloaded ${count === 1 ? 'song' : 'songs'}?`,
      {
        label: 'Listen',
        onClick: () => {
          playDownloads();
          navigate('/downloads');
        },
      },
      PROMPT_MS,
    );
  }, [online, count, navigate]);
}
