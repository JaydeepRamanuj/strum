import { registerSW } from 'virtual:pwa-register';
import { toast } from '@/components/toastStore';

const UPDATE_CHECK_MS = 60 * 60 * 1000;

/**
 * Registers the service worker. When a new version has been deployed, asks the user to reload
 * (never reloads by itself, so music doesn't cut out). Open apps re-check for updates hourly.
 */
export function registerPwa(): void {
  const updateServiceWorker = registerSW({
    onNeedRefresh() {
      toast.withAction(
        'A new version of Strum is ready.',
        { label: 'Reload', onClick: () => void updateServiceWorker(true) },
        0, // stays until the user answers
      );
    },
    onRegisteredSW(_url, registration) {
      if (registration) setInterval(() => void registration.update(), UPDATE_CHECK_MS);
    },
  });
}
