// visualizations/timezone-grid/utils.test.ts
import { describe, it, expect } from 'vitest';
import { getDayDiff } from './utils';

describe('getDayDiff', () => {
  // Fixed anchor: 2024-01-15 12:00 UTC
  // At this moment:
  //   UTC          → 2024-01-15 (same day as UTC reference)
  //   Europe/Amsterdam (UTC+1) → 2024-01-15 13:00 (same day)
  //   America/New_York (UTC-5) → 2024-01-15 07:00 (same day)
  //   Pacific/Auckland (UTC+13) → 2024-01-16 01:00 (next day)
  //   Pacific/Honolulu (UTC-10) → 2024-01-15 02:00 (same day)
  const anchor = new Date('2024-01-15T12:00:00Z');

  // For a date where UTC-5 is already on the previous day:
  // 2024-01-15 02:00 UTC → America/New_York (UTC-5) = 2024-01-14 21:00
  const anchorLateNight = new Date('2024-01-15T02:00:00Z');

  it('returns 0 when target timezone is on the same day as the local timezone', () => {
    expect(getDayDiff(anchor, 'Europe/Amsterdam', 'UTC')).toBe(0);
  });

  it('returns 0 when target and local are the same timezone', () => {
    expect(getDayDiff(anchor, 'UTC', 'UTC')).toBe(0);
  });

  it('returns +1 when target timezone is one day ahead of local', () => {
    // Pacific/Auckland at 12:00 UTC is already Jan 16
    expect(getDayDiff(anchor, 'Pacific/Auckland', 'UTC')).toBe(1);
  });

  it('returns -1 when target timezone is one day behind local', () => {
    // At 02:00 UTC on Jan 15, New York (UTC-5) is still Jan 14
    expect(getDayDiff(anchorLateNight, 'America/New_York', 'UTC')).toBe(-1);
  });

  // Note: a ±2 day difference is not possible with real IANA timezones.
  // The full UTC offset range is +14 (Pacific/Kiritimati) to -12 (Etc/GMT+12) = 26h,
  // which means the maximum real-world difference between any two timezones is ±1 day.
});
