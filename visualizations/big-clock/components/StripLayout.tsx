import React from 'react';
import { formatTime, formatDate, getISOWeekNumber, getHandAngles } from '../utils';

interface StripLayoutProps {
  date: Date;
  faceStyle: 'digital' | 'analog';
  timeFormat: '12h' | '24h';
  showAmPm: boolean;
  showDate: boolean;
  showWeekNumber: boolean;
}

const STRIP_MAJOR_TICKS = [
  { x1: 100, y1: 15, x2: 100, y2: 30 },
  { x1: 185, y1: 100, x2: 170, y2: 100 },
  { x1: 100, y1: 185, x2: 100, y2: 170 },
  { x1: 15, y1: 100, x2: 30, y2: 100 },
];

const StripLayout = ({
  date,
  faceStyle,
  timeFormat,
  showAmPm,
  showDate,
  showWeekNumber,
}: StripLayoutProps) => {
  const { hoursMinutes, ampm } = formatTime(date, timeFormat);

  return (
    <div className="clk-strip" data-size="s">
      {faceStyle === 'digital' ? (
        <>
          <span className="clk-hours-minutes">{hoursMinutes}</span>
          {timeFormat === '12h' && showAmPm && (
            <span className="clk-ampm">{ampm}</span>
          )}
        </>
      ) : (
        <StripAnalogFace date={date} />
      )}

      {showDate && (
        <>
          {faceStyle === 'digital' && <span className="clk-strip-divider" />}
          <span className="clk-date">{formatDate(date)}</span>
          {showWeekNumber && (
            <span className="clk-week-pill">W{getISOWeekNumber(date)}</span>
          )}
        </>
      )}
    </div>
  );
};

function StripAnalogFace({ date }: { date: Date }) {
  const angles = getHandAngles(date);

  return (
    <svg className="clk-face" viewBox="0 0 200 200">
      <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth="6" />
      {STRIP_MAJOR_TICKS.map((t, i) => (
        <line key={i} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(255,255,255,0.4)" strokeWidth="6" />
      ))}
      <circle cx="100" cy="100" r="6" fill="rgba(255,255,255,0.4)" />
      <line
        className="clk-hand-hour"
        x1="100" y1="100" x2="100" y2="45"
        stroke="rgba(255,255,255,0.85)" strokeWidth="8" strokeLinecap="round"
        transform={`rotate(${angles.hour}, 100, 100)`}
      />
      <line
        className="clk-hand-minute"
        x1="100" y1="100" x2="100" y2="28"
        stroke="rgba(255,255,255,0.85)" strokeWidth="5" strokeLinecap="round"
        transform={`rotate(${angles.minute}, 100, 100)`}
      />
    </svg>
  );
}

export default StripLayout;
