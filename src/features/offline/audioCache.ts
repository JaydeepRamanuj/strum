/**
 * Downloaded songs live in the browser's Cache Storage (not in the service worker's caches, which
 * Workbox manages). Each user's copies are kept under their own uid so two accounts on one device
 * don't share or delete each other's downloads.
 */

const CACHE_NAME = 'strum-offline-audio';

/** 128 kbps ≈ 16 000 bytes a second; used for progress when the server sends no length. */
const BYTES_PER_SEC_128K = 16_000;

export function audioCacheSupported(): boolean {
  return typeof caches !== 'undefined' && typeof fetch !== 'undefined';
}

function keyFor(uid: string, songId: string): string {
  return new URL(
    `/offline-audio/${encodeURIComponent(uid)}/${encodeURIComponent(songId)}`,
    location.origin,
  ).href;
}

export interface FetchAudioOptions {
  /** Size to report progress against when the response has no Content-Length. */
  expectedBytes?: number;
  durationSec?: number;
  onProgress?: (fraction: number) => void;
}

/** Downloads `url` and stores it for `songId`. Returns the stored size in bytes. */
export async function saveAudio(
  uid: string,
  songId: string,
  url: string,
  { expectedBytes, durationSec, onProgress }: FetchAudioOptions = {},
): Promise<number> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed (${res.status})`);
  const type = res.headers.get('content-type') || 'audio/mpeg';
  const total =
    Number(res.headers.get('content-length')) ||
    expectedBytes ||
    (durationSec ? durationSec * BYTES_PER_SEC_128K : 0);

  let blob: Blob;
  if (res.body && onProgress) {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.byteLength;
      if (total > 0) onProgress(Math.min(0.99, received / total));
    }
    blob = new Blob(chunks as BlobPart[], { type });
  } else {
    blob = await res.blob();
  }

  const cache = await caches.open(CACHE_NAME);
  await cache.put(
    keyFor(uid, songId),
    new Response(blob, {
      headers: { 'content-type': blob.type || type, 'content-length': String(blob.size) },
    }),
  );
  onProgress?.(1);
  return blob.size;
}

/** An object URL for the stored copy, or null if it isn't on this device. Revoke it when done. */
export async function getAudioObjectUrl(uid: string, songId: string): Promise<string | null> {
  if (!audioCacheSupported()) return null;
  const cache = await caches.open(CACHE_NAME);
  const res = await cache.match(keyFor(uid, songId));
  if (!res) return null;
  return URL.createObjectURL(await res.blob());
}

export async function deleteAudio(uid: string, songId: string): Promise<void> {
  if (!audioCacheSupported()) return;
  const cache = await caches.open(CACHE_NAME);
  await cache.delete(keyFor(uid, songId));
}

/** Song ids that still have a stored copy (the browser may clear storage when space runs low). */
export async function storedSongIds(uid: string): Promise<Set<string>> {
  const ids = new Set<string>();
  if (!audioCacheSupported()) return ids;
  const cache = await caches.open(CACHE_NAME);
  const prefix = `/offline-audio/${encodeURIComponent(uid)}/`;
  for (const req of await cache.keys()) {
    const path = new URL(req.url).pathname;
    if (path.startsWith(prefix)) ids.add(decodeURIComponent(path.slice(prefix.length)));
  }
  return ids;
}

/** Asks the browser not to clear downloads when space runs low. Best effort; ignored if refused. */
export async function requestPersistentStorage(): Promise<void> {
  try {
    if (navigator.storage?.persisted && (await navigator.storage.persisted())) return;
    await navigator.storage?.persist?.();
  } catch {
    // Not supported: downloads still work, the browser may just evict them under pressure.
  }
}
