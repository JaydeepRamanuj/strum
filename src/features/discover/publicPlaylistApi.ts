import { collection, limit, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '@/config/firebase';
import { toPublicPlaylist, type PublicPlaylist } from './publicPlaylists';

/** Discover loads at most this many public playlists (newest shared first). */
const MAX_PUBLIC_PLAYLISTS = 200;

/** Live list of every public playlist, from all users. Writes go through `playlistApi`. */
export function subscribePublicPlaylists(
  onNext: (playlists: PublicPlaylist[]) => void,
  onError: (error: Error) => void,
): () => void {
  const q = query(
    collection(db, 'publicPlaylists'),
    orderBy('sharedAt', 'desc'),
    limit(MAX_PUBLIC_PLAYLISTS),
  );
  return onSnapshot(
    q,
    (snap) => onNext(snap.docs.map((d) => toPublicPlaylist(d.id, d.data()))),
    (err) => onError(err),
  );
}
