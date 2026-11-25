import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  initInstallPrompt,
  isIosDevice,
  promptInstall,
  useInstallStore,
  type BeforeInstallPromptEvent,
} from './installPrompt';

afterEach(() => useInstallStore.setState({ deferred: null }));

function fakePromptEvent(outcome: 'accepted' | 'dismissed') {
  const event = new Event('beforeinstallprompt', { cancelable: true }) as BeforeInstallPromptEvent;
  event.prompt = vi.fn(() => Promise.resolve());
  event.userChoice = Promise.resolve({ outcome });
  return event;
}

describe('isIosDevice', () => {
  it('recognises iPhone, iPad and iPads that report as Macs', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)', 'iPhone', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (iPad; CPU OS 17_0)', 'iPad', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Macintosh)', 'MacIntel', 5)).toBe(true);
  });

  it('is false for Android and desktop', () => {
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 14)', 'Linux armv8l', 5)).toBe(false);
    expect(isIosDevice('Mozilla/5.0 (Macintosh)', 'MacIntel', 0)).toBe(false);
    expect(isIosDevice('Mozilla/5.0 (Windows NT 10.0)', 'Win32', 0)).toBe(false);
  });
});

describe('install prompt', () => {
  it('keeps the browser event instead of showing its own banner', () => {
    const stop = initInstallPrompt(window);
    const event = fakePromptEvent('accepted');
    window.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(useInstallStore.getState().deferred).toBe(event);
    stop();
  });

  it('shows the dialog once and forgets the event afterwards', async () => {
    const stop = initInstallPrompt(window);
    const event = fakePromptEvent('accepted');
    window.dispatchEvent(event);

    expect(await promptInstall()).toBe('accepted');
    expect(event.prompt).toHaveBeenCalledTimes(1);
    expect(useInstallStore.getState().deferred).toBeNull();
    expect(await promptInstall()).toBe('unavailable');
    stop();
  });

  it('clears the event when the app gets installed', () => {
    const stop = initInstallPrompt(window);
    window.dispatchEvent(fakePromptEvent('accepted'));
    window.dispatchEvent(new Event('appinstalled'));
    expect(useInstallStore.getState().deferred).toBeNull();
    stop();
  });

  it('stops listening when told to', () => {
    const stop = initInstallPrompt(window);
    stop();
    window.dispatchEvent(fakePromptEvent('accepted'));
    expect(useInstallStore.getState().deferred).toBeNull();
  });
});
