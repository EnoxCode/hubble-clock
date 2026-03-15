import { describe, it, expect } from 'vitest';
import { getHandAngles, getDayProgress, formatDate, getISOWeekNumber, formatTime } from './utils';

describe('getHandAngles', () => {
  it('returns 0 for all hands at midnight', () => {
    const date = new Date(2026, 2, 15, 0, 0, 0);
    expect(getHandAngles(date)).toEqual({ hour: 0, minute: 0, second: 0 });
  });

  it('returns correct angles at 3:00:00', () => {
    const date = new Date(2026, 2, 15, 3, 0, 0);
    expect(getHandAngles(date)).toEqual({ hour: 90, minute: 0, second: 0 });
  });

  it('returns correct angles at 6:30:30', () => {
    const date = new Date(2026, 2, 15, 6, 30, 30);
    expect(getHandAngles(date)).toEqual({
      hour: 195,
      minute: 183,
      second: 180,
    });
  });

  it('wraps PM hours to 12h range', () => {
    const date = new Date(2026, 2, 15, 15, 0, 0);
    expect(getHandAngles(date).hour).toBe(90);
  });
});

describe('getDayProgress', () => {
  it('returns 0 at midnight', () => {
    const date = new Date(2026, 2, 15, 0, 0, 0);
    expect(getDayProgress(date)).toBe(0);
  });

  it('returns 50 at noon', () => {
    const date = new Date(2026, 2, 15, 12, 0, 0);
    expect(getDayProgress(date)).toBe(50);
  });

  it('returns 100 at 23:59', () => {
    const date = new Date(2026, 2, 15, 23, 59, 0);
    expect(getDayProgress(date)).toBe(100);
  });

  it('returns 25 at 6:00', () => {
    const date = new Date(2026, 2, 15, 6, 0, 0);
    expect(getDayProgress(date)).toBe(25);
  });
});

describe('formatDate', () => {
  it('formats as abbreviated weekday, month, day', () => {
    const date = new Date(2026, 2, 15);
    expect(formatDate(date)).toBe('Sun, Mar 15');
  });

  it('formats single-digit day without leading zero', () => {
    const date = new Date(2026, 0, 5);
    expect(formatDate(date)).toBe('Mon, Jan 5');
  });
});

describe('getISOWeekNumber', () => {
  it('returns week 11 for March 15, 2026', () => {
    const date = new Date(2026, 2, 15);
    expect(getISOWeekNumber(date)).toBe(11);
  });

  it('returns week 1 for Jan 1, 2026 (Thursday)', () => {
    const date = new Date(2026, 0, 1);
    expect(getISOWeekNumber(date)).toBe(1);
  });

  it('returns week 53 for Dec 31, 2020 (Thursday)', () => {
    const date = new Date(2020, 11, 31);
    expect(getISOWeekNumber(date)).toBe(53);
  });
});

describe('formatTime', () => {
  it('formats 24h with zero-padded hours', () => {
    const date = new Date(2026, 2, 15, 9, 5, 7);
    const result = formatTime(date, '24h');
    expect(result).toEqual({ hoursMinutes: '09:05', seconds: '07', ampm: '' });
  });

  it('formats 24h midnight as 00:00', () => {
    const date = new Date(2026, 2, 15, 0, 0, 0);
    const result = formatTime(date, '24h');
    expect(result).toEqual({ hoursMinutes: '00:00', seconds: '00', ampm: '' });
  });

  it('formats 12h with unpadded hours and AM', () => {
    const date = new Date(2026, 2, 15, 9, 5, 7);
    const result = formatTime(date, '12h');
    expect(result).toEqual({ hoursMinutes: '9:05', seconds: '07', ampm: 'AM' });
  });

  it('formats 12h midnight as 12:00 AM', () => {
    const date = new Date(2026, 2, 15, 0, 0, 0);
    const result = formatTime(date, '12h');
    expect(result).toEqual({ hoursMinutes: '12:00', seconds: '00', ampm: 'AM' });
  });

  it('formats 12h noon as 12:00 PM', () => {
    const date = new Date(2026, 2, 15, 12, 0, 0);
    const result = formatTime(date, '12h');
    expect(result).toEqual({ hoursMinutes: '12:00', seconds: '00', ampm: 'PM' });
  });

  it('formats 12h 1 PM as 1:00 PM', () => {
    const date = new Date(2026, 2, 15, 13, 0, 0);
    const result = formatTime(date, '12h');
    expect(result).toEqual({ hoursMinutes: '1:00', seconds: '00', ampm: 'PM' });
  });
});
