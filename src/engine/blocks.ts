const STEP = 5;

/**
 * Split a long task into even blocks no longer than `max` minutes. Lengths are
 * multiples of 5 and add up exactly. A task that already fits, or that would
 * produce a block shorter than `min`, stays whole.
 */
export function splitBlocks(durationMin: number, min: number, max: number): number[] {
  if (durationMin <= max) return [durationMin];
  const count = Math.ceil(durationMin / max);
  const base = Math.floor(durationMin / count / STEP) * STEP;
  if (base < min) return [durationMin];
  const extra = (durationMin - base * count) / STEP;
  return Array.from({ length: count }, (_, i) => base + (i < extra ? STEP : 0));
}

const TITLE_MAX = 120;

/** "Write report (2 of 3)", shortened to fit the title limit. */
export function blockTitle(title: string, index: number, count: number): string {
  const suffix = ` (${index + 1} of ${count})`;
  return `${title.slice(0, TITLE_MAX - suffix.length)}${suffix}`;
}
