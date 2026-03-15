export function getHandAngles(date: Date): { hour: number; minute: number; second: number } {
  const h = date.getHours() % 12;
  const m = date.getMinutes();
  const s = date.getSeconds();

  return {
    hour: (h + m / 60) * 30,
    minute: (m + s / 60) * 6,
    second: s * 6,
  };
}

export function getDayProgress(date: Date): number {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  return Math.round((totalMinutes / 1440) * 100);
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  });
}

export function getISOWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

export function formatTime(
  date: Date,
  format: '12h' | '24h',
): { hoursMinutes: string; seconds: string; ampm: string } {
  const h = date.getHours();
  const m = date.getMinutes();
  const s = date.getSeconds();
  const seconds = String(s).padStart(2, '0');
  const minutes = String(m).padStart(2, '0');

  if (format === '24h') {
    return {
      hoursMinutes: `${String(h).padStart(2, '0')}:${minutes}`,
      seconds,
      ampm: '',
    };
  }

  const ampm = h < 12 ? 'AM' : 'PM';
  const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return {
    hoursMinutes: `${h12}:${minutes}`,
    seconds,
    ampm,
  };
}
