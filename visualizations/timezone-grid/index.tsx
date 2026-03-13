import React, { useEffect, useState } from 'react';
import { useWidgetConfig } from '@hubble/sdk';
import './style.css';
import { getDayDiff } from './utils';

interface TimezoneEntry {
  label: string;
  tz: string;
}

interface TimezoneGridConfig {
  timezones?: TimezoneEntry[];
}

const TimezoneGridViz = () => {
  const config = useWidgetConfig<TimezoneGridConfig>();
  const [now, setNow] = useState(() => new Date());

  const timezones = (config.timezones ?? []).filter((e) => e.tz?.trim());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  if (timezones.length === 0) {
    return (
      <div className="timezone-grid-container timezone-grid-empty">
        No timezones configured. Open the Configure panel to add some.
      </div>
    );
  }

  return (
    <div className="timezone-grid-container">
      {timezones.map((entry, i) => {
        const timeStr = new Intl.DateTimeFormat('en-GB', {
          timeZone: entry.tz,
          hour: '2-digit',
          minute: '2-digit',
          hour12: false,
        }).format(now);

        const dayDiff = getDayDiff(now, entry.tz);

        return (
          <div key={i} className="timezone-row">
            <div className="timezone-label">{entry.label}</div>
            <div className="timezone-time">{timeStr}</div>
            {dayDiff !== 0 && (
              <div className="timezone-day-diff">
                {dayDiff > 0 ? `+${dayDiff}d` : `${dayDiff}d`}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

export default TimezoneGridViz;
