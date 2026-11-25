import { normalizeText } from './keywords';

/** Duration bucket (seconds) used only when the artist is unknown, so unrelated songs don't clash. */
const DURATION_BUCKET_SEC = 5;
const MAX_KEY_LENGTH = 300;
const UNKNOWN_ARTISTS = new Set(['', 'unknown', 'unknown artist', 'various artists']);

/** Drops "(feat. X)", "[ft. X]" and a trailing "feat. X", which differ between uploads of one song. */
function stripFeatured(text: string): string {
  return text
    .replace(/[([]\s*(?:feat|ft|featuring|with)\b[^)\]]*[)\]]/gi, ' ')
    .replace(/\s+(?:feat|ft|featuring)\b\.?\s+.*$/i, ' ');
}

function slug(text: string): string {
  return normalizeText(stripFeatured(text)).replace(/ /g, '-');
}

/**
 * The key two uploads of the same song share: normalised title and artist (case, accents,
 * punctuation and "feat." credits ignored). It is the id of `publicKeys/{key}`, so it is a valid
 * Firestore document id (no "/"). When the artist is unknown the duration is added, otherwise every
 * untagged song with the same title would count as a duplicate.
 */
export function songDupKey(title: string, artist: string, durationSec: number): string {
  const t = slug(title) || encodeURIComponent(title.trim().toLowerCase());
  const a = slug(artist);
  const key = UNKNOWN_ARTISTS.has(a.replace(/-/g, ' '))
    ? `${t}~unknown~d${Math.round(durationSec / DURATION_BUCKET_SEC)}`
    : `${t}~${a}`;
  return key.slice(0, MAX_KEY_LENGTH);
}
