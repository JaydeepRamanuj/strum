import { LogOut } from 'lucide-react';
import { Button } from '@/components/Button';
import { useAuth } from '@/features/auth/useAuth';
import { UserAvatar } from '@/features/auth/UserAvatar';
import { useSongs } from '@/features/library/useSongs';
import { formatBytes } from '@/lib/formatters';

const sum = (songs: { bytes: number }[]) => songs.reduce((total, s) => total + (s.bytes || 0), 0);

/** Who is signed in, how much space the user's songs take, and sign out. */
export function AccountSection() {
  const { user, signOut } = useAuth();
  const { songs: library } = useSongs();
  const { songs: deleted } = useSongs(true);
  if (!user) return null;

  const name = user.displayName ?? user.email ?? 'You';
  const used = sum(library);
  const waiting = sum(deleted);

  return (
    <section aria-labelledby="account-heading">
      <h2 id="account-heading" className="text-lg font-semibold">
        Account
      </h2>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <UserAvatar name={name} photoURL={user.photoURL} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{name}</p>
          {user.email && <p className="truncate text-xs text-muted">{user.email}</p>}
        </div>
        <Button variant="secondary" onClick={() => void signOut()}>
          <LogOut className="size-4" aria-hidden />
          Sign out
        </Button>
      </div>
      <p className="mt-3 text-sm text-muted">
        Storage used by your songs: <span className="text-fg">{formatBytes(used)}</span> in{' '}
        {library.length} {library.length === 1 ? 'song' : 'songs'}
        {waiting > 0 && ` (plus ${formatBytes(waiting)} in deleted files, until they're removed)`}.
      </p>
    </section>
  );
}
