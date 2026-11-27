import { AudioLines } from 'lucide-react';
import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { Spinner } from '@/components/Spinner';
import { ProfileMenu } from '@/features/auth/ProfileMenu';
import { MiniPlayer } from '@/features/player/MiniPlayer';
import { PlayerBar } from '@/features/player/PlayerBar';
import { QueuePanel } from '@/features/player/QueuePanel';
import { usePlayerKeyboard } from '@/features/player/usePlayerKeyboard';
import { usePlayerLifecycle } from '@/features/player/usePlayerLifecycle';
import { OfflineBadge } from '@/features/offline/OfflineBadge';
import { useOfflineDownloads } from '@/features/offline/useOfflineDownloads';
import { OfflineBanner } from '@/features/pwa/OfflineBanner';
import { useIosInstallHint } from '@/features/pwa/useInstallApp';
import { usePlayCounting } from '@/features/stats/usePlayCounting';
import { BottomTabBar } from './BottomTabBar';
import { Sidebar } from './Sidebar';

/**
 * Desktop: sidebar | main, with a player bar along the bottom.
 * Mobile: slim top bar (logo + account), main, and a mini-player above the bottom tab bar.
 */
export function AppLayout() {
  usePlayerLifecycle();
  usePlayerKeyboard();
  usePlayCounting();
  useIosInstallHint();
  useOfflineDownloads();
  return (
    <div className="flex h-dvh">
      {/* min-w-0: without it, long nowrap titles widen the page past the phone screen. */}
      <div className="flex min-h-0 min-w-0 flex-1 md:pb-player">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col">
          <header className="flex items-center justify-between border-b border-border px-4 pt-[env(safe-area-inset-top)] md:hidden">
            <span className="flex h-12 items-center gap-2 font-bold">
              <AudioLines className="size-5 text-accent" aria-hidden />
              Strum
              <OfflineBadge />
            </span>
            <ProfileMenu />
          </header>
          <OfflineBanner />
          <main className="min-w-0 flex-1 overflow-y-auto pb-[calc(var(--spacing-tabbar)+env(safe-area-inset-bottom)+4.5rem)] md:pb-0">
            <Suspense
              fallback={
                <div className="flex justify-center py-24">
                  <Spinner label="Loading" />
                </div>
              }
            >
              <Outlet />
            </Suspense>
          </main>
        </div>
      </div>
      <PlayerBar />
      <MiniPlayer />
      <QueuePanel />
      <BottomTabBar />
    </div>
  );
}
