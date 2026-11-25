import { describe, expect, it } from 'vitest';
import { groupArtists, songsByArtist, splitArtists } from './artists';
import type { PublicSong } from './publicSongs';

const song = (id: string, artist: string): PublicSong =>
  ({ id, title: id, artist, owner: { uid: 'u', name: 'n' }, sharedAtMs: 0 }) as PublicSong;

describe('splitArtists', () => {
  it('splits on commas, semicolons and feat./ft./featuring', () => {
    expect(splitArtists('A, B')).toEqual(['A', 'B']);
    expect(splitArtists('A; B')).toEqual(['A', 'B']);
    expect(splitArtists('A feat. B')).toEqual(['A', 'B']);
    expect(splitArtists('A ft B')).toEqual(['A', 'B']);
    expect(splitArtists('A featuring B, C')).toEqual(['A', 'B', 'C']);
  });

  it('keeps "&" and "and" inside band names, and words that merely contain ft', () => {
    expect(splitArtists('Simon & Garfunkel')).toEqual(['Simon & Garfunkel']);
    expect(splitArtists('Daft Punk')).toEqual(['Daft Punk']);
    expect(splitArtists('Soft Cell')).toEqual(['Soft Cell']);
  });

  it('drops unknown and empty artists', () => {
    expect(splitArtists('Unknown Artist')).toEqual([]);
    expect(splitArtists('')).toEqual([]);
  });
});

describe('groupArtists', () => {
  const songs = [
    song('1', 'Beyoncé'),
    song('2', 'beyonce'),
    song('3', 'Beyoncé feat. Jay-Z'),
    song('4', 'Jay-Z'),
    song('5', 'Unknown Artist'),
    song('6', 'Texas'),
  ];
  const groups = groupArtists(songs);

  it('groups spellings of one artist and counts songs under each artist of a collab', () => {
    expect(groups.map((g) => [g.name, g.songs.length])).toEqual([
      ['Beyoncé', 3],
      ['Jay-Z', 2],
      ['Texas', 1],
    ]);
  });

  it('uses the most common spelling as the name and leaves out unknown artists', () => {
    expect(groups.find((g) => g.key === 'beyonce')?.name).toBe('Beyoncé');
    expect(groups.some((g) => g.songs.some((s) => s.id === '5'))).toBe(false);
  });
});

describe('songsByArtist', () => {
  it('finds songs by key, including collaborations', () => {
    const songs = [song('1', 'Beyoncé'), song('2', 'Beyoncé feat. Jay-Z'), song('3', 'Texas')];
    expect(songsByArtist('jay z', songs).map((s) => s.id)).toEqual(['2']);
    expect(songsByArtist('beyonce', songs).map((s) => s.id)).toEqual(['1', '2']);
  });
});
