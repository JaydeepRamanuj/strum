import { describe, expect, it } from 'vitest';
import { songDupKey } from '@/lib/songKey';
import type { Song } from '@/types/song';
import { planIsClean, planPublicSongs } from './publicPlaylistPlan';

const song = (id: string, over: Partial<Song> = {}): Song =>
  ({
    id,
    title: `Title ${id}`,
    artist: `Artist ${id}`,
    album: null,
    durationSec: 180,
    deleted: false,
    isPublic: false,
    dupKey: null,
    ...over,
  }) as Song;

const publicSong = (id: string, over: Partial<Song> = {}): Song => {
  const s = song(id, { isPublic: true, ...over });
  return {
    ...s,
    dupKey: songDupKey(s.title, s.artist, s.durationSec),
    owner: { uid: 'u2', name: 'R' },
  };
};

describe('planPublicSongs', () => {
  it("keeps public songs (own or a friend's) and needs nothing", () => {
    const plan = planPublicSongs(
      ['a', 'b'],
      [song('a', { isPublic: true })],
      [publicSong('a'), publicSong('b')],
    );
    expect(plan.songIds).toEqual(['a', 'b']);
    expect(planIsClean(plan)).toBe(true);
  });

  it("asks to share the user's private songs", () => {
    const plan = planPublicSongs(['a', 'p'], [song('a'), song('p')], [publicSong('a')]);
    expect(plan.toShare.map((s) => s.id)).toEqual(['p']);
    expect(plan.songIds).toEqual(['a', 'p']);
    expect(planIsClean(plan)).toBe(false);
  });

  it('replaces a private song by the public copy of the same song, in place', () => {
    const mine = song('mine', { title: 'Halo', artist: 'Beyonce' });
    const theirs = publicSong('theirs', { title: 'Halo', artist: 'Beyoncé' });
    const plan = planPublicSongs(
      ['x', 'mine', 'y'],
      [mine],
      [publicSong('x'), theirs, publicSong('y')],
    );
    expect(plan.songIds).toEqual(['x', 'theirs', 'y']);
    expect(plan.replaced).toEqual([{ from: mine, to: theirs }]);
    expect(plan.toShare).toEqual([]);
  });

  it('shares only one of two private songs that are the same song', () => {
    const one = song('one', { title: 'Halo', artist: 'Beyonce' });
    const two = song('two', { title: 'Halo', artist: 'Beyonce' });
    const plan = planPublicSongs(['one', 'two'], [one, two], []);
    expect(plan.toShare).toEqual([one]);
    expect(plan.replaced).toEqual([{ from: two, to: one }]);
    expect(plan.songIds).toEqual(['one']);
  });

  it('drops ids that are deleted or unknown, and repeats', () => {
    const plan = planPublicSongs(
      ['gone', 'del', 'a', 'a'],
      [song('del', { deleted: true }), song('a', { isPublic: true })],
      [publicSong('a')],
    );
    expect(plan.dropped).toEqual(['gone', 'del']);
    expect(plan.songIds).toEqual(['a']);
  });

  it('works out the key for public songs shared before duplicate checking', () => {
    const legacy = { ...publicSong('legacy', { title: 'Halo', artist: 'Beyonce' }), dupKey: null };
    const plan = planPublicSongs(
      ['mine'],
      [song('mine', { title: 'Halo', artist: 'Beyonce' })],
      [legacy],
    );
    expect(plan.replaced.map((r) => r.to.id)).toEqual(['legacy']);
  });
});
