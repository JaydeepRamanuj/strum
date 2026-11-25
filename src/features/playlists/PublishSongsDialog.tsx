import { useState } from 'react';
import { Button } from '@/components/Button';
import { Modal } from '@/components/Modal';
import { toast } from '@/components/toastStore';
import { friendlyError } from '@/lib/errors';
import type { PublishPlan } from './publicPlaylistPlan';

interface PublishSongsDialogProps {
  title: string;
  confirmLabel: string;
  plan: PublishPlan;
  /** Does the work. Throwing keeps the dialog open and shows the error. */
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const SHOWN = 5;

function Titles({ heading, titles }: { heading: string; titles: string[] }) {
  if (titles.length === 0) return null;
  const more = titles.length - SHOWN;
  return (
    <div>
      <p className="text-sm font-medium">{heading}</p>
      <ul className="mt-1 list-disc pl-5 text-sm text-muted">
        {titles.slice(0, SHOWN).map((t, i) => (
          <li key={`${t}-${i}`} className="truncate">
            {t}
          </li>
        ))}
        {more > 0 && <li>and {more} more</li>}
      </ul>
    </div>
  );
}

/**
 * Explains what a public playlist needs before it can be shared: songs made public, songs swapped
 * for the copy already in Discover, and songs that are gone. The user confirms or cancels.
 */
export function PublishSongsDialog({
  title,
  confirmLabel,
  plan,
  onConfirm,
  onClose,
}: PublishSongsDialogProps) {
  const [busy, setBusy] = useState(false);

  const confirm = async () => {
    setBusy(true);
    try {
      await onConfirm();
      onClose();
    } catch (err) {
      toast.error(friendlyError(err, "Couldn't do that. Check your connection and try again."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={busy ? () => undefined : onClose}
      title={title}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button onClick={() => void confirm()} disabled={busy}>
            {busy ? 'Working…' : confirmLabel}
          </Button>
        </>
      }
    >
      <p className="mb-3 text-sm text-muted">
        Everyone on Strum can see a public playlist, so every song in it has to be public too.
      </p>
      <div className="space-y-3">
        <Titles
          heading={`${plan.toShare.length} ${plan.toShare.length === 1 ? 'song' : 'songs'} will be made public`}
          titles={plan.toShare.map((s) => s.title)}
        />
        <Titles
          heading="Already in Discover, so the public copy is used instead of yours"
          titles={plan.replaced.map((r) => r.from.title)}
        />
        {plan.dropped.length > 0 && (
          <p className="text-sm text-muted">
            {plan.dropped.length === 1
              ? '1 song is no longer available and will be removed.'
              : `${plan.dropped.length} songs are no longer available and will be removed.`}
          </p>
        )}
      </div>
    </Modal>
  );
}
