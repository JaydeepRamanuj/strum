import { WifiOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useDownloadsStore } from '@/features/offline/downloadsStore';
import { useOnlineStatus } from './useOnlineStatus';

/** A slim bar shown while there is no connection, pointing to songs that still play. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  const downloads = useDownloadsStore((s) => Object.keys(s.entries).length);
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-surface-2 px-4 py-1.5 text-center text-xs text-muted"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      {downloads > 0 ? (
        <span>
          You're offline. Only downloaded songs can play.{' '}
          <Link to="/downloads" className="font-semibold text-accent hover:underline">
            Play downloads
          </Link>
        </span>
      ) : (
        <span>
          You're offline. Your library is still here, but songs can't play and uploads are paused.
        </span>
      )}
    </div>
  );
}
