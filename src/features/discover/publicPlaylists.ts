import type { DocumentData } from 'firebase/firestore';
import { normalizeText } from '@/lib/keywords';
import type { Song } from '@/types/song';
import type { DiscoverFilter } from './publicSongs';

/** `publicPlaylists/{id}`: a public copy of a playlist its owner shared (docs/README.md). */
export interface PublicPlaylist {
  id: string;
  ownerUid: string;
  ownerName: string;
  name: string;
  description: string | null;
  coverUrl: string | null;
  songIds: string[];
  sharedAtMs: number;
}

export function toPublicPlaylist(id: string, data: DocumentData): PublicPlaylist {
  const sharedAt = data.sharedAt as { toMillis?: () => number } | null | undefined;
  return {
    id,
    ownerUid: data.ownerUid,
    ownerName: data.ownerName || 'A friend',
    name: data.name ?? '',
    description: data.description ?? null,
    coverUrl: data.coverUrl ?? null,
    songIds: Array.isArray(data.songIds) ? data.songIds : [],
    sharedAtMs: typeof sharedAt?.toMillis === 'function' ? sharedAt.toMillis() : 0,
  };
}

/** A public playlist with the songs that can still be played, in playlist order. */
export interface DiscoverPlaylist {
  playlist: PublicPlaylist;
  songs: Song[];
}

/**
 * Public playlists with their playable songs. Songs that are no longer public are skipped, and a
 * playlist with none left is hidden. Filters by who shared it and by text (name, description or
 * the sharer's name), newest first.
 */
export function discoverPlaylists(
  playlists: PublicPlaylist[],
  publicSongs: Song[],
  options: { query: string; filter: DiscoverFilter; uid: string | null },
): DiscoverPlaylist[] {
  const byId = new Map(publicSongs.map((s) => [s.id, s]));
  const words = normalizeText(options.query).split(' ').filter(Boolean);
  return playlists
    .filter((p) => {
      const mine = p.ownerUid === options.uid;
      if (options.filter === 'mine' && !mine) return false;
      if (options.filter === 'others' && mine) return false;
      if (words.length === 0) return true;
      const haystack = normalizeText(`${p.name} ${p.description ?? ''} ${p.ownerName}`);
      return words.every((w) => haystack.includes(w));
    })
    .map((playlist) => ({
      playlist,
      songs: playlist.songIds.map((id) => byId.get(id)).filter((s): s is Song => !!s),
    }))
    .filter((p) => p.songs.length > 0)
    .sort((a, b) => b.playlist.sharedAtMs - a.playlist.sharedAtMs);
}
