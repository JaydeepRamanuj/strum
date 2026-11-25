import {
  addDoc,
  arrayRemove,
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
  type DocumentData,
  type WriteBatch,
  type QueryDocumentSnapshot,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { publicSongFields } from '@/features/discover/publicSongs';
import { DuplicateSongError } from '@/lib/errors';
import { buildSearchKeywords } from '@/lib/keywords';
import { songDupKey } from '@/lib/songKey';
import type { NewSong, Song, SongOwner } from '@/types/song';

/** Firestore allows 500 writes per batch. A song can take three (private + public + claim); stay well under. */
const BATCH_SIZE = 150;
/**
 * Songs per batch when sharing or editing public songs. Each public write makes the rules look
 * up other documents (private song, claim), and Firestore caps those lookups per batch (about 20),
 * so this stays small. Raise it only after checking in the console that bigger batches pass.
 */
const PUBLIC_BATCH_SIZE = 5;

const songsRef = (uid: string) => collection(db, 'users', uid, 'songs');
const songRef = (uid: string, songId: string) => doc(db, 'users', uid, 'songs', songId);
/** Discover mirror of a public song (docs/README.md, Data model). */
const publicSongRef = (songId: string) => doc(db, 'publicSongs', songId);
/** Claim on a title+artist so only one copy of a song is public (see `songDupKey`). */
const publicKeyRef = (key: string) => doc(db, 'publicKeys', key);
const publicKeysRef = () => collection(db, 'publicKeys');

export function toSong(id: string, data: DocumentData): Song {
  return {
    id,
    title: data.title,
    artist: data.artist,
    album: data.album ?? null,
    durationSec: data.durationSec,
    cloudinaryPublicId: data.cloudinaryPublicId,
    audioUrl: data.audioUrl,
    format: data.format,
    bytes: data.bytes,
    coverPublicId: data.coverPublicId ?? null,
    coverUrl: data.coverUrl ?? null,
    searchKeywords: data.searchKeywords ?? [],
    deleted: data.deleted === true,
    isPublic: data.isPublic === true,
    dupKey: typeof data.dupKey === 'string' ? data.dupKey : null,
    createdAt: data.createdAt ?? null,
  };
}

function mapSnapshot(snap: QuerySnapshot<DocumentData>): Song[] {
  return snap.docs.map((d: QueryDocumentSnapshot<DocumentData>) => toSong(d.id, d.data()));
}

/** Live list of songs with the given deleted flag. Returns the unsubscribe function. */
export function subscribeSongs(
  uid: string,
  deleted: boolean,
  onNext: (songs: Song[]) => void,
  onError: (error: Error) => void,
): () => void {
  // Library (deleted=false) is ordered by the DB; the deleted list is sorted client-side,
  // which avoids a second composite index.
  const q = deleted
    ? query(songsRef(uid), where('deleted', '==', true))
    : query(songsRef(uid), where('deleted', '==', false), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onNext(mapSnapshot(snap)),
    (err) => onError(err),
  );
}

/** Creates a song doc after its audio (and cover) reached Cloudinary. Returns the new id. */
export async function addSong(uid: string, input: NewSong): Promise<string> {
  const ref = await addDoc(songsRef(uid), {
    ...input,
    searchKeywords: buildSearchKeywords(input.title, input.artist, input.album),
    deleted: false,
    isPublic: false,
    dupKey: null,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export interface SongInfoPatch {
  title: string;
  artist: string;
  album: string | null;
  coverPublicId?: string | null;
  coverUrl?: string | null;
}

function infoFields(info: SongInfoPatch) {
  return { ...info, searchKeywords: buildSearchKeywords(info.title, info.artist, info.album) };
}

/**
 * Checks that nobody else holds the claim on `key`. Returns true when this song already holds it
 * (nothing to create), false when it is free. Throws `DuplicateSongError` when another public
 * song has it, naming who shared it.
 */
async function claimHeldByThisSong(key: string, songId: string, uid: string): Promise<boolean> {
  const claim = await getDoc(publicKeyRef(key));
  if (!claim.exists()) return false;
  const data = claim.data();
  if (data.songId === songId) return true;
  if (data.ownerUid === uid) {
    throw new DuplicateSongError('You already shared another copy of this song.');
  }
  const holder = await getDoc(publicSongRef(String(data.songId))).catch(() => null);
  const name = holder?.exists() ? holder.data().ownerName : null;
  throw new DuplicateSongError(
    name ? `Already in Discover, shared by ${name}.` : 'Already in Discover.',
  );
}

function setClaim(batch: WriteBatch, key: string, songId: string, ownerUid: string) {
  batch.set(publicKeyRef(key), { songId, ownerUid, createdAt: serverTimestamp() });
}

/**
 * Updates editable metadata and recomputes search keywords. `isPublic` (optional) shares or
 * unshares the song in the same batch; a song that stays public gets its Discover copy updated,
 * and its duplicate claim moves if the title or artist changed.
 * Throws `DuplicateSongError` if that title and artist is already public from another song.
 */
export async function updateSongInfo(
  owner: SongOwner,
  song: Song,
  patch: SongInfoPatch & { isPublic?: boolean },
): Promise<void> {
  const { isPublic = song.isPublic, ...info } = patch;
  const fields = infoFields(info);
  const dupKey = isPublic ? songDupKey(info.title, info.artist, song.durationSec) : null;
  const next: Song = { ...song, ...fields, isPublic, dupKey };

  const keyChanged = dupKey !== song.dupKey;
  const createClaim =
    dupKey !== null && keyChanged && !(await claimHeldByThisSong(dupKey, song.id, owner.uid));

  const batch = writeBatch(db);
  batch.update(songRef(owner.uid, song.id), { ...fields, isPublic, dupKey });
  if (keyChanged && song.dupKey) batch.delete(publicKeyRef(song.dupKey));
  if (isPublic && song.isPublic) {
    batch.update(publicSongRef(song.id), publicSongFields(next, owner));
  } else if (isPublic) {
    batch.set(publicSongRef(song.id), {
      ...publicSongFields(next, owner),
      sharedAt: serverTimestamp(),
    });
  } else if (song.isPublic) {
    batch.delete(publicSongRef(song.id));
  }
  if (createClaim && dupKey) setClaim(batch, dupKey, song.id, owner.uid);
  await batch.commit();
}

/**
 * Admin only: edits the metadata of a public song that someone else shared. The owner's private
 * song, the Discover copy and the duplicate claim change in one batch, so the owner's library
 * and Discover stay the same. Only descriptive fields change; the owner and audio stay.
 */
export async function adminUpdateSongInfo(
  song: Song & { owner: SongOwner },
  patch: SongInfoPatch,
): Promise<void> {
  const fields = infoFields(patch);
  const dupKey = songDupKey(patch.title, patch.artist, song.durationSec);
  const keyChanged = dupKey !== song.dupKey;
  const createClaim = keyChanged && !(await claimHeldByThisSong(dupKey, song.id, song.owner.uid));

  const batch = writeBatch(db);
  batch.update(songRef(song.owner.uid, song.id), { ...fields, dupKey });
  batch.update(publicSongRef(song.id), { ...fields, dupKey });
  if (keyChanged && song.dupKey) batch.delete(publicKeyRef(song.dupKey));
  if (createClaim) setClaim(batch, dupKey, song.id, song.owner.uid);
  await batch.commit();
}

export interface DuplicateSkip {
  song: Song;
  reason: string;
}

export interface ShareResult {
  /** Songs whose state changed. */
  changed: Song[];
  /** Songs that could not be made public because the same song is already in Discover. */
  duplicates: DuplicateSkip[];
}

/**
 * Shares songs in Discover (or stops sharing them). The private flag, the `publicSongs` copy and
 * the duplicate claim are written in one batch per few songs, so they can't drift apart. Songs
 * already in the wanted state (and deleted songs) are skipped. A song whose title and artist is
 * already public (from anyone, or from another of the user's songs) is reported in `duplicates`
 * and left private.
 */
export async function setSongsPublic(
  owner: SongOwner,
  songs: Song[],
  isPublic: boolean,
): Promise<ShareResult> {
  const todo = songs.filter((s) => !s.deleted && s.isPublic !== isPublic);
  const changed: Song[] = [];
  const duplicates: DuplicateSkip[] = [];

  if (!isPublic) {
    for (let i = 0; i < todo.length; i += PUBLIC_BATCH_SIZE) {
      const batch = writeBatch(db);
      for (const song of todo.slice(i, i + PUBLIC_BATCH_SIZE)) {
        batch.update(songRef(owner.uid, song.id), { isPublic: false, dupKey: null });
        batch.delete(publicSongRef(song.id));
        if (song.dupKey) batch.delete(publicKeyRef(song.dupKey));
      }
      await batch.commit();
      changed.push(...todo.slice(i, i + PUBLIC_BATCH_SIZE));
    }
    return { changed, duplicates };
  }

  // Two selected songs with the same title and artist: only the first can be shared.
  const seen = new Set<string>();
  const candidates: { song: Song; dupKey: string }[] = [];
  for (const song of todo) {
    const dupKey = songDupKey(song.title, song.artist, song.durationSec);
    if (seen.has(dupKey)) {
      duplicates.push({ song, reason: 'Another selected song is the same.' });
    } else {
      seen.add(dupKey);
      candidates.push({ song, dupKey });
    }
  }

  const checked = await Promise.all(
    candidates.map(async ({ song, dupKey }) => {
      try {
        return { song, dupKey, held: await claimHeldByThisSong(dupKey, song.id, owner.uid) };
      } catch (err) {
        if (err instanceof DuplicateSongError) {
          duplicates.push({ song, reason: err.message });
          return null;
        }
        throw err;
      }
    }),
  );
  const ready = checked.filter((c): c is NonNullable<typeof c> => c !== null);

  for (let i = 0; i < ready.length; i += PUBLIC_BATCH_SIZE) {
    const batch = writeBatch(db);
    const slice = ready.slice(i, i + PUBLIC_BATCH_SIZE);
    for (const { song, dupKey, held } of slice) {
      batch.update(songRef(owner.uid, song.id), { isPublic: true, dupKey });
      batch.set(publicSongRef(song.id), {
        ...publicSongFields({ ...song, dupKey }, owner),
        sharedAt: serverTimestamp(),
      });
      if (!held) setClaim(batch, dupKey, song.id, owner.uid);
    }
    await batch.commit();
    changed.push(...slice.map((c) => c.song));
  }
  return { changed, duplicates };
}

/**
 * Admin only: gives public songs shared before duplicate claims existed a claim on their title
 * and artist. Songs whose key is already held by another song are returned in `duplicates` (the
 * admin decides which to unshare); songs that couldn't be written count as `failed`.
 */
export async function rebuildDuplicateIndex(
  songs: (Song & { owner: SongOwner })[],
): Promise<{ claimed: number; failed: number; duplicates: DuplicateSkip[] }> {
  let claimed = 0;
  let failed = 0;
  const duplicates: DuplicateSkip[] = [];
  for (const song of songs.filter((s) => !s.dupKey)) {
    const dupKey = songDupKey(song.title, song.artist, song.durationSec);
    try {
      const held = await claimHeldByThisSong(dupKey, song.id, song.owner.uid);
      const batch = writeBatch(db);
      batch.update(songRef(song.owner.uid, song.id), { dupKey });
      batch.update(publicSongRef(song.id), { dupKey });
      if (!held) setClaim(batch, dupKey, song.id, song.owner.uid);
      await batch.commit();
      claimed++;
    } catch (err) {
      if (err instanceof DuplicateSongError) duplicates.push({ song, reason: err.message });
      else failed++;
    }
  }
  return { claimed, failed, duplicates };
}

/** The claims this user holds for these songs, as songId → key (to release them on delete). */
async function claimKeysFor(uid: string, songIds: string[]): Promise<Map<string, string>> {
  const keys = new Map<string, string>();
  for (let i = 0; i < songIds.length; i += 30) {
    const snap = await getDocs(
      query(
        publicKeysRef(),
        where('ownerUid', '==', uid),
        where('songId', 'in', songIds.slice(i, i + 30)),
      ),
    );
    snap.forEach((d) => keys.set(String(d.data().songId), d.id));
  }
  return keys;
}

async function batchApply(ids: string[], apply: (batch: WriteBatch, id: string) => void) {
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch = writeBatch(db);
    ids.slice(i, i + BATCH_SIZE).forEach((id) => apply(batch, id));
    await batch.commit();
  }
}

/**
 * Soft-deletes songs, removes them from every playlist of this user that contains them, and
 * stops sharing them (the Discover copy and duplicate claim are deleted, `isPublic` set to false).
 * Restoring a song does not put it back into playlists or Discover.
 * Other users' playlists keep the id; their playlist page shows it as no longer available.
 */
export async function softDeleteSongs(uid: string, songIds: string[]): Promise<void> {
  if (songIds.length === 0) return;

  const playlists = await getDocs(collection(db, 'users', uid, 'playlists'));
  const playlistRefs = playlists.docs.filter((p) => {
    const ids: unknown = p.data().songIds;
    return Array.isArray(ids) && ids.some((id) => songIds.includes(id as string));
  });

  // Playlist edits first: if this fails, the song stays visible and nothing is half-removed.
  for (const p of playlistRefs) {
    const removed = (p.data().songIds as string[]).filter((id) => songIds.includes(id));
    await updateDoc(p.ref, { songIds: arrayRemove(...removed), updatedAt: serverTimestamp() });
  }

  const claims = await claimKeysFor(uid, songIds);
  await batchApply(songIds, (batch, id) => {
    batch.update(songRef(uid, id), { deleted: true, isPublic: false, dupKey: null });
    // The rules allow deleting a missing doc, so private songs need no extra read.
    batch.delete(publicSongRef(id));
    const key = claims.get(id);
    if (key) batch.delete(publicKeyRef(key));
  });
}

export async function restoreSongs(uid: string, songIds: string[]): Promise<void> {
  await batchApply(songIds, (batch, id) => batch.update(songRef(uid, id), { deleted: false }));
}

/**
 * Removes the Firestore docs for good (and any Discover copy left over).
 * Their Cloudinary assets must be removed separately.
 */
export async function hardDeleteSongs(uid: string, songIds: string[]): Promise<void> {
  await batchApply(songIds, (batch, id) => {
    batch.delete(songRef(uid, id));
    batch.delete(publicSongRef(id));
  });
}
