/** A play counts after this many seconds of actual listening… */
export const COUNT_AFTER_SEC = 30;
/** …or after this share of the song, whichever comes first (so short songs can count). */
export const COUNT_AFTER_FRACTION = 0.5;
/** Position jumps bigger than this between two time events are seeks, not listening. */
const MAX_STEP_SEC = 2;

/** Seconds of listening after which a song of this length counts as played. */
export function countThresholdSec(durationSec: number): number {
  if (!(durationSec > 0)) return COUNT_AFTER_SEC;
  return Math.min(COUNT_AFTER_SEC, durationSec * COUNT_AFTER_FRACTION);
}

export interface PlayTracker {
  /** Forget the current song (a new song was loaded, or it started over). */
  reset: () => void;
  /** Feed a playback position. Returns true once per song, when it has been listened to long enough. */
  tick: (positionSec: number, durationSec: number) => boolean;
}

/**
 * Adds up real listening time from playback positions. Seeking forwards or backwards adds
 * nothing, so skipping around can't inflate a count, and a song counts at most once until reset.
 */
export function createPlayTracker(): PlayTracker {
  let last: number | null = null;
  let listened = 0;
  let counted = false;

  return {
    reset() {
      last = null;
      listened = 0;
      counted = false;
    },
    tick(positionSec, durationSec) {
      if (counted) return false;
      if (last !== null) {
        const step = positionSec - last;
        if (step > 0 && step <= MAX_STEP_SEC) listened += step;
      }
      last = positionSec;
      if (listened < countThresholdSec(durationSec)) return false;
      counted = true;
      return true;
    },
  };
}
