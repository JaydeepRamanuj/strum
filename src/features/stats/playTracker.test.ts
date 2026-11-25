import { describe, expect, it } from 'vitest';
import { COUNT_AFTER_SEC, countThresholdSec, createPlayTracker } from './playTracker';

/** Plays from `from` to `to` in 0.5 s steps; returns how many times the tracker said "counted". */
function listen(
  tracker: ReturnType<typeof createPlayTracker>,
  from: number,
  to: number,
  duration: number,
) {
  let counted = 0;
  for (let t = from; t <= to; t += 0.5) if (tracker.tick(t, duration)) counted++;
  return counted;
}

describe('countThresholdSec', () => {
  it('is 30 s for normal songs and half of a short one', () => {
    expect(countThresholdSec(200)).toBe(COUNT_AFTER_SEC);
    expect(countThresholdSec(40)).toBe(20);
  });

  it('falls back to 30 s while the duration is unknown', () => {
    expect(countThresholdSec(0)).toBe(COUNT_AFTER_SEC);
    expect(countThresholdSec(Number.NaN)).toBe(COUNT_AFTER_SEC);
  });
});

describe('createPlayTracker', () => {
  it('counts a song once after 30 s of listening', () => {
    const t = createPlayTracker();
    expect(listen(t, 0, 29, 200)).toBe(0);
    expect(listen(t, 29.5, 120, 200)).toBe(1);
  });

  it('counts a short song at half its length', () => {
    const t = createPlayTracker();
    expect(listen(t, 0, 25, 40)).toBe(1);
  });

  it('does not count skipping around', () => {
    const t = createPlayTracker();
    // Jumps forward every few seconds: lots of position change, little listening.
    for (let pos = 0; pos <= 180; pos += 20) expect(t.tick(pos, 200)).toBe(false);
  });

  it('does not count a seek as listening, but keeps what was heard before it', () => {
    const t = createPlayTracker();
    expect(listen(t, 0, 20, 200)).toBe(0);
    t.tick(120, 200); // seek forwards
    expect(listen(t, 120.5, 131, 200)).toBe(1); // 20 s before the seek + ~11 s after
  });

  it('counts again after reset (repeat one, or a new song)', () => {
    const t = createPlayTracker();
    expect(listen(t, 0, 40, 200)).toBe(1);
    t.reset();
    expect(listen(t, 0, 40, 200)).toBe(1);
  });
});
