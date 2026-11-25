import { describe, expect, it } from 'vitest';
import { songDupKey } from './songKey';

describe('songDupKey', () => {
  it('ignores case, accents and punctuation', () => {
    expect(songDupKey('Halo!', 'Beyoncé', 261)).toBe(songDupKey('  halo ', 'BEYONCE', 200));
  });

  it('ignores featured-artist credits in the title and the artist', () => {
    const plain = songDupKey('Stay', 'The Kid LAROI', 141);
    expect(songDupKey('Stay (feat. Justin Bieber)', 'The Kid LAROI', 141)).toBe(plain);
    expect(songDupKey('Stay [ft. Justin Bieber]', 'The Kid LAROI', 141)).toBe(plain);
    expect(songDupKey('Stay', 'The Kid LAROI feat. Justin Bieber', 141)).toBe(plain);
  });

  it('keeps different songs and different artists apart', () => {
    expect(songDupKey('Halo', 'Beyonce', 261)).not.toBe(songDupKey('Halo', 'Texas', 261));
    expect(songDupKey('Halo', 'Beyonce', 261)).not.toBe(songDupKey('Halo (Live)', 'Beyonce', 261));
  });

  it('adds a duration bucket when the artist is unknown', () => {
    const a = songDupKey('Intro', 'Unknown Artist', 60);
    expect(a).toBe(songDupKey('Intro', '', 61));
    expect(a).not.toBe(songDupKey('Intro', 'Unknown Artist', 200));
  });

  it('returns a valid Firestore document id', () => {
    for (const key of [
      songDupKey('AC/DC', 'AC/DC', 100),
      songDupKey('!!!', 'x', 10),
      songDupKey('a'.repeat(500), 'b', 10),
      songDupKey('日本語', 'アーティスト', 10),
    ]) {
      expect(key).not.toContain('/');
      expect(key.length).toBeGreaterThan(0);
      expect(key.length).toBeLessThanOrEqual(300);
    }
  });
});
