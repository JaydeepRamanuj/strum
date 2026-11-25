import { describe, expect, it } from 'vitest';
import type { Song } from '@/types/song';
import { discoverPlaylists, toPublicPlaylist, type PublicPlaylist } from './publicPlaylists';

const song = (id: string) => ({ id, title: id }) as Song;
const playlist = (id: string, over: Partial<PublicPlaylist> = {}): PublicPlaylist => ({
  id,
  ownerUid: 'u2',
  ownerName: 'Rahul',
  name: `Playlist ${id}`,
  description: null,
  coverUrl: null,
  songIds: ['a'],
  sharedAtMs: 1,
  ...over,
});
const opts = { query: '', filter: 'everyone' as const, uid: 'u1' };

describe('toPublicPlaylist', () => {
  it('reads a document and treats a pending timestamp as 0', () => {
    const p = toPublicPlaylist('p', {
      ownerUid: 'u',
      ownerName: '',
      name: 'Road trip',
      songIds: ['a', 'b'],
      sharedAt: null,
    });
    expect(p).toMatchObject({ id: 'p', ownerName: 'A friend', songIds: ['a', 'b'], sharedAtMs: 0 });
  });
});

describe('discoverPlaylists', () => {
  const songs = ['a', 'b'].map(song);

  it('resolves songs in playlist order and skips ones that are no longer public', () => {
    const [one] = discoverPlaylists([playlist('1', { songIds: ['b', 'gone', 'a'] })], songs, opts);
    expect(one.songs.map((s) => s.id)).toEqual(['b', 'a']);
  });

  it('hides a playlist with no playable songs left', () => {
    expect(discoverPlaylists([playlist('1', { songIds: ['gone'] })], songs, opts)).toEqual([]);
  });

  it('filters by who shared it', () => {
    const lists = [playlist('1'), playlist('2', { ownerUid: 'u1', ownerName: 'Me' })];
    expect(
      discoverPlaylists(lists, songs, { ...opts, filter: 'mine' }).map((p) => p.playlist.id),
    ).toEqual(['2']);
    expect(
      discoverPlaylists(lists, songs, { ...opts, filter: 'others' }).map((p) => p.playlist.id),
    ).toEqual(['1']);
  });

  it('searches name, description and sharer, and sorts newest first', () => {
    const lists = [
      playlist('1', { name: 'Gym', sharedAtMs: 1 }),
      playlist('2', { name: 'Chill', description: 'late night', sharedAtMs: 5 }),
      playlist('3', { name: 'Gym again', sharedAtMs: 9 }),
    ];
    expect(discoverPlaylists(lists, songs, opts).map((p) => p.playlist.id)).toEqual([
      '3',
      '2',
      '1',
    ]);
    expect(
      discoverPlaylists(lists, songs, { ...opts, query: 'gym' }).map((p) => p.playlist.id),
    ).toEqual(['3', '1']);
    expect(
      discoverPlaylists(lists, songs, { ...opts, query: 'late' }).map((p) => p.playlist.id),
    ).toEqual(['2']);
    expect(discoverPlaylists(lists, songs, { ...opts, query: 'rahul' })).toHaveLength(3);
  });
});
