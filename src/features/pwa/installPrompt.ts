import { create } from 'zustand';

/** Chrome's install prompt event (not in the DOM typings). */
export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

interface InstallState {
  /** The saved prompt. It can be used once, so it is cleared after the user answers. */
  deferred: BeforeInstallPromptEvent | null;
}

export const useInstallStore = create<InstallState>(() => ({ deferred: null }));

/**
 * Starts listening for the browser's "this app can be installed" event. Call it as early as
 * possible (before React renders): the event fires once, soon after the page loads.
 * Returns a function that stops listening.
 */
export function initInstallPrompt(target: Window = window): () => void {
  const onPrompt = (e: Event) => {
    e.preventDefault(); // keep it for our own "Install app" button
    useInstallStore.setState({ deferred: e as BeforeInstallPromptEvent });
  };
  const onInstalled = () => useInstallStore.setState({ deferred: null });
  target.addEventListener('beforeinstallprompt', onPrompt);
  target.addEventListener('appinstalled', onInstalled);
  return () => {
    target.removeEventListener('beforeinstallprompt', onPrompt);
    target.removeEventListener('appinstalled', onInstalled);
  };
}

/** Shows the browser's install dialog. `unavailable` when the browser hasn't offered one. */
export async function promptInstall(): Promise<'accepted' | 'dismissed' | 'unavailable'> {
  const event = useInstallStore.getState().deferred;
  if (!event) return 'unavailable';
  await event.prompt();
  const { outcome } = await event.userChoice;
  useInstallStore.setState({ deferred: null });
  return outcome;
}

/** iPhone, iPad and iPod, including iPads that say they are Macs. They have no install prompt. */
export function isIosDevice(userAgent: string, platform: string, touchPoints: number): boolean {
  return /iphone|ipad|ipod/i.test(userAgent) || (platform === 'MacIntel' && touchPoints > 1);
}

/** True when the app was opened from the home screen rather than a browser tab. */
export function isStandalone(): boolean {
  return (
    window.matchMedia?.('(display-mode: standalone)').matches === true ||
    (navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}
