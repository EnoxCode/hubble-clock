import React from 'react';
import { getHandAngles } from '../utils';
import DateLine from './DateLine';
import DayProgressBar from './DayProgressBar';

interface AnalogFaceProps {
  date: Date;
  size: 'm' | 'l' | 'xl';
  showSeconds: boolean;
  analogMarkers: 'ticks' | 'numbers';
  showDate: boolean;
  showWeekNumber: boolean;
  showDayProgress: boolean;
}

const MAJOR_TICKS = [
  { x1: 100, y1: 12, x2: 100, y2: 24 },
  { x1: 188, y1: 100, x2: 176, y2: 100 },
  { x1: 100, y1: 188, x2: 100, y2: 176 },
  { x1: 12, y1: 100, x2: 24, y2: 100 },
];

const MINOR_TICK_HOURS = [1, 2, 4, 5, 7, 8, 10, 11];

function getMinorTick(hour: number) {
  const angle = (hour * 30 - 90) * (Math.PI / 180);
  const outerR = 88;
  const innerR = 80;
  return {
    x1: 100 + outerR * Math.cos(angle),
    y1: 100 + outerR * Math.sin(angle),
    x2: 100 + innerR * Math.cos(angle),
    y2: 100 + innerR * Math.sin(angle),
  };
}

function getHourNumberPosition(hour: number) {
  const angle = (hour * 30 - 90) * (Math.PI / 180);
  const r = 76;
  return {
    x: 100 + r * Math.cos(angle),
    y: 100 + r * Math.sin(angle) + 5,
  };
}

const AnalogFace = ({
  date,
  size,
  showSeconds,
  analogMarkers,
  showDate,
  showWeekNumber,
  showDayProgress,
}: AnalogFaceProps) => {
  const angles = getHandAngles(date);

  return (
    <div className="clk-analog" data-size={size}>
      <svg className="clk-face" viewBox="0 0 200 200">
        {/* Outer ring */}
        <circle cx="100" cy="100" r="92" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />

        {/* Markers */}
        {analogMarkers === 'ticks' ? (
          <>
            {MAJOR_TICKS.map((t, i) => (
              <line key={`major-${i}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(255,255,255,0.5)" strokeWidth="2" />
            ))}
            {MINOR_TICK_HOURS.map((hour) => {
              const t = getMinorTick(hour);
              return (
                <line key={`minor-${hour}`} x1={t.x1} y1={t.y1} x2={t.x2} y2={t.y2} stroke="rgba(255,255,255,0.25)" strokeWidth="1" />
              );
            })}
          </>
        ) : (
          <>
            {Array.from({ length: 12 }, (_, i) => i + 1).map((hour) => {
              const pos = getHourNumberPosition(hour);
              return (
                <text key={hour} x={pos.x} y={pos.y} textAnchor="middle" className="clk-hour-num">
                  {hour}
                </text>
              );
            })}
          </>
        )}

        {/* Center dot */}
        <circle cx="100" cy="100" r="3" fill="rgba(255,255,255,0.4)" />

        {/* Hour hand */}
        <line
          className="clk-hand-hour"
          x1="100" y1="100"
          x2="100" y2="45"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${angles.hour}, 100, 100)`}
        />

        {/* Minute hand */}
        <line
          className="clk-hand-minute"
          x1="100" y1="100"
          x2="100" y2="24"
          stroke="rgba(255,255,255,0.85)"
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${angles.minute}, 100, 100)`}
        />

        {/* Second hand */}
        {showSeconds && (
          <>
            <line
              className="clk-hand-second"
              x1="100" y1="112"
              x2="100" y2="20"
              strokeWidth="1"
              strokeLinecap="round"
              transform={`rotate(${angles.second}, 100, 100)`}
            />
            <circle cx="100" cy="100" r="2" fill="rgba(96,165,250,0.7)" />
          </>
        )}
      </svg>
      <DateLine date={date} showDate={showDate} showWeekNumber={showWeekNumber} />
      <DayProgressBar date={date} showDayProgress={showDayProgress} />
    </div>
  );
};

export default AnalogFace;
