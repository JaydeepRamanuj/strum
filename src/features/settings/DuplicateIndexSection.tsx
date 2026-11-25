import { useState } from 'react';
import { Button } from '@/components/Button';
import { toast } from '@/components/toastStore';
import { usePublicSongs } from '@/features/discover/usePublicSongs';
import { rebuildDuplicateIndex, type DuplicateSkip } from '@/features/library/songApi';

/**
 * Admin tool: public songs shared before duplicate checking existed have no claim on their title
 * and artist. This gives them one, and lists any that are copies of each other.
 */
export function DuplicateIndexSection() {
  const { songs, loading } = usePublicSongs();
  const [busy, setBusy] = useState(false);
  const [duplicates, setDuplicates] = useState<DuplicateSkip[] | null>(null);
  const pending = songs.filter((s) => !s.dupKey);

  const rebuild = async () => {
    setBusy(true);
    try {
      const result = await rebuildDuplicateIndex(pending);
      setDuplicates(result.duplicates);
      if (result.failed > 0) toast.error(`${result.failed} songs couldn't be updated. Try again.`);
      else toast.success(`Checked ${pending.length} public songs`);
    } catch {
      toast.error("Couldn't check public songs. Check your connection and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section aria-labelledby="dup-index-heading">
      <h2 id="dup-index-heading" className="text-lg font-semibold">
        Duplicate check
      </h2>
      <p className="mt-1 text-sm text-muted">
        {loading
          ? 'Loading public songs…'
          : pending.length === 0
            ? 'Every public song is covered by the duplicate check.'
            : `${pending.length} public ${pending.length === 1 ? 'song was' : 'songs were'} shared before duplicate checking. Run the check to include them.`}
      </p>
      {pending.length > 0 && (
        <Button className="mt-3" onClick={() => void rebuild()} disabled={busy}>
          {busy ? 'Checking…' : 'Run duplicate check'}
        </Button>
      )}
      {duplicates && duplicates.length > 0 && (
        <div className="mt-4">
          <p className="text-sm font-medium">Copies of songs already in Discover</p>
          <ul className="mt-1 space-y-1 text-sm text-muted">
            {duplicates.map(({ song, reason }) => (
              <li key={song.id}>
                “{song.title}” by {song.artist} (shared by {song.owner?.name ?? 'a friend'}):{' '}
                {reason} Ask one owner to make theirs private.
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
