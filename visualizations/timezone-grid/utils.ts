// visualizations/timezone-grid/utils.ts

/**
 * Calculate the day difference between a target timezone and a reference local timezone.
 * Returns positive if tz is ahead, negative if behind, 0 if same day.
 *
 * @param now - The current date/time to compare
 * @param tz - IANA timezone string of the target timezone
 * @param localTz - IANA timezone string of the reference (local) timezone. Defaults to system timezone.
 */
export function getDayDiff(
  now: Date,
  tz: string,
  localTz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): number {
  const fmt = (timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

  const localDate = new Date(fmt(localTz));
  const tzDate = new Date(fmt(tz));
  return Math.round((tzDate.getTime() - localDate.getTime()) / 86400000);
}
