import { songDupKey } from '@/lib/songKey';
import type { Song } from '@/types/song';

/** What it takes to put songs into a public playlist (where every song must be public). */
export interface PublishPlan {
  /** The song ids the playlist ends up with, in order, without repeats. */
  songIds: string[];
  /** The user's own private songs that must be made public first. */
  toShare: Song[];
  /**
   * The user's own songs that are already in Discover as a different copy (same title and artist),
   * so the public copy is used instead of theirs.
   */
  replaced: { from: Song; to: Song }[];
  /** Ids that can't be played any more (deleted, or made private by their owner); left out. */
  dropped: string[];
}

/** True when nothing needs the user's attention: every song is already public. */
export function planIsClean(plan: PublishPlan): boolean {
  return plan.toShare.length === 0 && plan.replaced.length === 0 && plan.dropped.length === 0;
}

/**
 * Works out how `songIds` can go into a public playlist.
 * - A song that is public (anyone's) stays.
 * - A private song of the user's whose title and artist is already public from another song is
 *   replaced by that public song (only one copy of a song can be public).
 * - Any other private song of the user's is listed in `toShare`.
 * - An id that matches nothing playable is dropped.
 * `library` is the user's own songs; `publicSongs` is everything in Discover.
 */
export function planPublicSongs(
  songIds: string[],
  library: Song[],
  publicSongs: Song[],
): PublishPlan {
  const publicById = new Map(publicSongs.map((s) => [s.id, s]));
  const libraryById = new Map(library.filter((s) => !s.deleted).map((s) => [s.id, s]));
  const publicByKey = new Map<string, Song>();
  for (const s of publicSongs) {
    publicByKey.set(s.dupKey ?? songDupKey(s.title, s.artist, s.durationSec), s);
  }

  const ids: string[] = [];
  const toShare: Song[] = [];
  const replaced: PublishPlan['replaced'] = [];
  const dropped: string[] = [];
  const sharedByKey = new Map<string, Song>();

  for (const id of songIds) {
    const pub = publicById.get(id);
    if (pub) {
      ids.push(id);
      continue;
    }
    const own = libraryById.get(id);
    if (!own) {
      dropped.push(id);
      continue;
    }
    if (own.isPublic) {
      ids.push(id);
      continue;
    }
    const key = songDupKey(own.title, own.artist, own.durationSec);
    const existing = publicByKey.get(key) ?? sharedByKey.get(key);
    if (existing) {
      replaced.push({ from: own, to: existing });
      ids.push(existing.id);
    } else {
      sharedByKey.set(key, own);
      toShare.push(own);
      ids.push(id);
    }
  }

  return { songIds: [...new Set(ids)], toShare, replaced, dropped };
}
