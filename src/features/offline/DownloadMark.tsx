import { CircleArrowDown } from 'lucide-react';
import { useDownloadsStore } from './downloadsStore';

/** Small icon after a song title: downloaded, or a progress ring while downloading. */
export function DownloadMark({ songId }: { songId: string }) {
  const downloaded = useDownloadsStore((s) => Boolean(s.entries[songId]));
  const progress = useDownloadsStore((s) => s.progress[songId]);

  if (progress !== undefined) {
    const pct = Math.round(progress * 100);
    return (
      <span
        role="img"
        aria-label={`Downloading, ${pct}%`}
        className="size-3.5 shrink-0 rounded-full"
        style={{
          background: `conic-gradient(var(--color-accent) ${pct}%, color-mix(in srgb, var(--color-muted) 35%, transparent) 0)`,
        }}
      />
    );
  }
  if (!downloaded) return null;
  return (
    <CircleArrowDown className="size-3.5 shrink-0 text-accent" aria-label="Downloaded" role="img" />
  );
}
