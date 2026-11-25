import {
  collection,
  doc,
  increment,
  limit,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from 'firebase/firestore';
import { db } from '@/config/firebase';

/** `users/{uid}/playStats/{songId}` (docs/README.md → Data model). */
export interface PlayStat {
  songId: string;
  count: number;
  lastPlayedAtMs: number;
}

/**
 * Stats are read this many at a time. Songs that were deleted or made private are filtered out
 * afterwards, so this is more than the 10 the page shows.
 */
export const TOP_FETCH = 25;

const statRef = (uid: string, songId: string) => doc(db, 'users', uid, 'playStats', songId);

/** Adds one play. Creates the doc on the first play. */
export async function recordPlay(uid: string, songId: string): Promise<void> {
  await setDoc(
    statRef(uid, songId),
    { count: increment(1), lastPlayedAt: serverTimestamp() },
    { merge: true },
  );
}

/** Live list of the user's most played songs, highest count first. */
export function subscribePlayStats(
  uid: string,
  onNext: (stats: PlayStat[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'users', uid, 'playStats'),
    orderBy('count', 'desc'),
    limit(TOP_FETCH),
  );
  return onSnapshot(
    q,
    (snap) =>
      onNext(
        snap.docs.map((d) => {
          const at = d.data().lastPlayedAt as { toMillis?: () => number } | null | undefined;
          return {
            songId: d.id,
            count: typeof d.data().count === 'number' ? d.data().count : 0,
            lastPlayedAtMs: typeof at?.toMillis === 'function' ? at.toMillis() : 0,
          };
        }),
      ),
    (err) => onError(err),
  );
}
