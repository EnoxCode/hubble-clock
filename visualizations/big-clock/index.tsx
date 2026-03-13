import React, { useEffect, useState } from 'react';
import { useWidgetConfig } from '@hubble/sdk';
import './style.css';

interface BigClockConfig {
  timezone?: string;
  size?: 'S' | 'M' | 'L' | 'XL';
  format?: '24h' | 'ampm';
}

const BigClockViz = () => {
  const config = useWidgetConfig<BigClockConfig>();
  const [now, setNow] = useState(() => new Date());

  const timezone = config.timezone ?? 'Europe/Amsterdam';
  const size = config.size ?? 'L';
  const format = config.format ?? '24h';

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const timeStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: format === 'ampm',
  }).format(now);

  const dateStr = new Intl.DateTimeFormat('en-GB', {
    timeZone: timezone,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(now);

  return (
    <div className="big-clock-container">
      <div className={`big-clock-time size-${size}`}>{timeStr}</div>
      <div className="big-clock-date">{dateStr}</div>
    </div>
  );
};

export default BigClockViz;
