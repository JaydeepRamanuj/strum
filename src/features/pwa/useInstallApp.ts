import { useEffect } from 'react';
import { toast } from '@/components/toastStore';
import { isIosDevice, isStandalone, promptInstall, useInstallStore } from './installPrompt';

const IOS_HINT_KEY = 'strum.iosInstallHint';
const IOS_HINT = 'To install Strum, tap Share, then “Add to Home Screen”.';

const onIos = () => isIosDevice(navigator.userAgent, navigator.platform, navigator.maxTouchPoints);

function showIosHint(): void {
  toast.withAction(IOS_HINT, { label: 'Got it', onClick: () => undefined }, 15000);
}

/**
 * Whether Strum can be installed from here, and how. Android and desktop browsers give us an
 * install prompt; iPhones and iPads need the Share sheet, so we show instructions instead.
 */
export function useInstallApp(): { canInstall: boolean; install: () => Promise<void> } {
  const deferred = useInstallStore((s) => s.deferred);
  const ios = onIos();
  const canInstall = !isStandalone() && (deferred !== null || ios);

  const install = async () => {
    if (deferred) await promptInstall();
    else if (ios) showIosHint();
  };
  return { canInstall, install };
}

/** Mount once in the signed-in layout: tells iPhone/iPad users how to install, one time only. */
export function useIosInstallHint(): void {
  useEffect(() => {
    if (!onIos() || isStandalone()) return;
    try {
      if (localStorage.getItem(IOS_HINT_KEY)) return;
      localStorage.setItem(IOS_HINT_KEY, '1');
    } catch {
      return; // storage blocked: don't nag on every visit
    }
    showIosHint();
  }, []);
}
