import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from './useOnlineStatus';

/** A slim bar shown while there is no connection. */
export function OfflineBanner() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div
      role="status"
      className="flex items-center justify-center gap-2 bg-surface-2 px-4 py-1.5 text-center text-xs text-muted"
    >
      <WifiOff className="size-3.5 shrink-0" aria-hidden />
      You're offline. Your library is still here, but songs can't play and uploads are paused.
    </div>
  );
}
