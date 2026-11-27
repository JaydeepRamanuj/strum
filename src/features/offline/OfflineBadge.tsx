import clsx from 'clsx';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '@/features/pwa/useOnlineStatus';

/** "Offline" pill next to the logo while there is no connection. */
export function OfflineBadge({ className }: { className?: string }) {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <span
      role="status"
      className={clsx(
        'inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-2 py-0.5 text-[11px] font-semibold text-amber-400',
        className,
      )}
    >
      <WifiOff className="size-3" aria-hidden />
      Offline
    </span>
  );
}
