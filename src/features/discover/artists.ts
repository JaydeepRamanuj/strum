import { normalizeText } from '@/lib/keywords';
import type { PublicSong } from './publicSongs';

/**
 * Splits an artist tag into the artists in it: on commas, semicolons and "feat." / "ft." /
 * "featuring". Not on "&" or "and", which are part of many band names ("Simon & Garfunkel").
 */
const SPLIT = /\s*(?:[,;]|\bfeat(?:uring)?\b\.?|\bft\b\.?)\s*/i;
const UNKNOWN = new Set(['', 'unknown', 'unknown artist']);

export function splitArtists(artist: string): string[] {
  return artist
    .split(SPLIT)
    .map((part) => part.trim())
    .filter((part) => !UNKNOWN.has(normalizeText(part)));
}

export interface ArtistGroup {
  /** Normalised name: the id used in the URL and for matching. */
  key: string;
  /** How the artist is written most often. */
  name: string;
  songs: PublicSong[];
}

/**
 * Groups public songs by artist. A song with several artists appears under each of them. Songs
 * with no artist (or "Unknown Artist") are left out. Most songs first, then by name.
 */
export function groupArtists(songs: PublicSong[]): ArtistGroup[] {
  const groups = new Map<string, { songs: PublicSong[]; spellings: Map<string, number> }>();
  for (const song of songs) {
    const seen = new Set<string>();
    for (const part of splitArtists(song.artist)) {
      const key = normalizeText(part);
      if (seen.has(key)) continue;
      seen.add(key);
      const group = groups.get(key) ?? { songs: [], spellings: new Map<string, number>() };
      group.songs.push(song);
      group.spellings.set(part, (group.spellings.get(part) ?? 0) + 1);
      groups.set(key, group);
    }
  }
  return [...groups.entries()]
    .map(([key, g]) => ({
      key,
      name: [...g.spellings.entries()].sort((a, b) => b[1] - a[1])[0][0],
      songs: g.songs,
    }))
    .sort(
      (a, b) =>
        b.songs.length - a.songs.length ||
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
    );
}

/** Public songs by the artist with this key (see `ArtistGroup.key`), in the order given. */
export function songsByArtist(key: string, songs: PublicSong[]): PublicSong[] {
  return songs.filter((s) => splitArtists(s.artist).some((a) => normalizeText(a) === key));
}
