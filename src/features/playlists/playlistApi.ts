import {
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  updateDoc,
  writeBatch,
  type DocumentData,
  type QuerySnapshot,
} from 'firebase/firestore';
import { db } from '@/config/firebase';
import { setSongsPublic } from '@/features/library/songApi';
import { ValidationError } from '@/lib/errors';
import type { Playlist } from '@/types/playlist';
import type { SongOwner } from '@/types/song';
import type { PublishPlan } from './publicPlaylistPlan';

const MAX_NAME = 100;
const MAX_DESCRIPTION = 500;
const MAX_SONGS = 5000;

const playlistsRef = (uid: string) => collection(db, 'users', uid, 'playlists');
const playlistRef = (uid: string, id: string) => doc(db, 'users', uid, 'playlists', id);
/** Discover mirror of a public playlist (docs/README.md, Data model). */
const publicPlaylistRef = (id: string) => doc(db, 'publicPlaylists', id);

export function toPlaylist(id: string, data: DocumentData): Playlist {
  return {
    id,
    name: data.name ?? '',
    description: data.description ?? null,
    coverUrl: data.coverUrl ?? null,
    folderId: data.folderId ?? null,
    songIds: Array.isArray(data.songIds) ? data.songIds : [],
    isPublic: data.isPublic === true,
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
  };
}

function mapSnapshot(snap: QuerySnapshot<DocumentData>): Playlist[] {
  return snap.docs.map((d) => toPlaylist(d.id, d.data()));
}

/** Live list of the user's playlists (small collection, loaded in full). Returns the unsubscribe function. */
export function subscribePlaylists(
  uid: string,
  onNext: (playlists: Playlist[]) => void,
  onError: (error: Error) => void,
): () => void {
  return onSnapshot(
    playlistsRef(uid),
    (snap) => onNext(mapSnapshot(snap)),
    (err) => onError(err),
  );
}

/** Trims and checks a playlist or folder name. Throws ValidationError with a friendly message. */
export function cleanName(name: string): string {
  const clean = name.trim();
  if (!clean) throw new ValidationError('Give it a name first.');
  if (clean.length > MAX_NAME) {
    throw new ValidationError(`Names can be up to ${MAX_NAME} characters.`);
  }
  return clean;
}

export async function createPlaylist(
  uid: string,
  name: string,
  folderId: string | null = null,
): Promise<string> {
  const ref = await addDoc(playlistsRef(uid), {
    name: cleanName(name),
    description: null,
    coverUrl: null,
    folderId,
    songIds: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}

/**
 * Changes fields of a playlist. When the playlist is public, its Discover copy gets the same
 * change in the same batch, so the two never differ (the rules check this too).
 * `fields` is a function because field values like `arrayUnion` are made fresh for each write.
 */
async function updatePlaylist(
  uid: string,
  id: string,
  fields: () => Record<string, unknown>,
): Promise<void> {
  const snap = await getDoc(playlistRef(uid, id));
  if (snap.data()?.isPublic !== true) {
    await updateDoc(playlistRef(uid, id), { ...fields(), updatedAt: serverTimestamp() });
    return;
  }
  const batch = writeBatch(db);
  batch.update(playlistRef(uid, id), { ...fields(), updatedAt: serverTimestamp() });
  batch.update(publicPlaylistRef(id), { ...fields(), updatedAt: serverTimestamp() });
  await batch.commit();
}

export async function renamePlaylist(uid: string, id: string, name: string): Promise<void> {
  const clean = cleanName(name);
  await updatePlaylist(uid, id, () => ({ name: clean }));
}

export async function setDescription(uid: string, id: string, description: string): Promise<void> {
  const clean = description.trim();
  if (clean.length > MAX_DESCRIPTION) {
    throw new ValidationError(`Descriptions can be up to ${MAX_DESCRIPTION} characters.`);
  }
  await updatePlaylist(uid, id, () => ({ description: clean || null }));
}

/**
 * Appends songs. arrayUnion skips ids already in the playlist, so nothing is duplicated.
 * For a public playlist every id must be a public song (see `applyPublishPlan`).
 */
export async function addSongs(uid: string, id: string, songIds: string[]): Promise<void> {
  if (songIds.length === 0) return;
  await updatePlaylist(uid, id, () => ({ songIds: arrayUnion(...songIds) }));
}

export async function removeSong(uid: string, id: string, songId: string): Promise<void> {
  await updatePlaylist(uid, id, () => ({ songIds: arrayRemove(songId) }));
}

/** Overwrites the order. The caller should update the UI first and roll back on failure. */
export async function reorderSongs(uid: string, id: string, songIds: string[]): Promise<void> {
  if (songIds.length > MAX_SONGS) throw new ValidationError('This playlist is too long.');
  await updatePlaylist(uid, id, () => ({ songIds }));
}

export async function movePlaylist(
  uid: string,
  id: string,
  folderId: string | null,
): Promise<void> {
  await updateDoc(playlistRef(uid, id), { folderId, updatedAt: serverTimestamp() });
}

/** Deletes the playlist and, if it was public, its Discover copy (deleting a missing doc is fine). */
export async function deletePlaylist(uid: string, id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.delete(playlistRef(uid, id));
  batch.delete(publicPlaylistRef(id));
  await batch.commit();
}

/**
 * Makes the songs of a plan public (see `planPublicSongs`) so they can go into a public playlist.
 * Throws a `ValidationError` naming the song if one turns out to be already in Discover.
 */
export async function applyPublishPlan(owner: SongOwner, plan: PublishPlan): Promise<void> {
  if (plan.toShare.length === 0) return;
  const { duplicates } = await setSongsPublic(owner, plan.toShare, true);
  if (duplicates.length > 0) {
    const first = duplicates[0];
    throw new ValidationError(
      `“${first.song.title}” can't be made public. ${first.reason} Remove it from the playlist and try again.`,
    );
  }
}

/**
 * Shares a playlist in Discover with exactly `songIds` (all public, see `planPublicSongs`). The
 * private playlist (flag and, if songs were swapped, its list) and the copy change in one batch.
 */
export async function publishPlaylist(
  owner: SongOwner,
  playlist: Playlist,
  songIds: string[],
): Promise<void> {
  if (songIds.length === 0) throw new ValidationError('Add some songs first.');
  const batch = writeBatch(db);
  batch.update(playlistRef(owner.uid, playlist.id), {
    isPublic: true,
    songIds,
    updatedAt: serverTimestamp(),
  });
  batch.set(publicPlaylistRef(playlist.id), {
    ownerUid: owner.uid,
    ownerName: owner.name,
    name: playlist.name,
    description: playlist.description,
    coverUrl: playlist.coverUrl,
    songIds,
    sharedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  await batch.commit();
}

/** Stops sharing a playlist: clears the flag and deletes the Discover copy. */
export async function unpublishPlaylist(uid: string, id: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(playlistRef(uid, id), { isPublic: false, updatedAt: serverTimestamp() });
  batch.delete(publicPlaylistRef(id));
  await batch.commit();
}

/** Copies a playlist (same songs, folder and description) under a new name. Songs are not touched. */
export async function duplicatePlaylist(uid: string, playlist: Playlist): Promise<string> {
  const name = `${playlist.name} (copy)`.slice(0, MAX_NAME);
  const ref = await addDoc(playlistsRef(uid), {
    name,
    description: playlist.description,
    coverUrl: playlist.coverUrl,
    folderId: playlist.folderId,
    songIds: [...playlist.songIds],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
  return ref.id;
}
