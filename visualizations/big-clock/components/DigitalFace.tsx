import React from 'react';
import { formatTime } from '../utils';
import DateLine from './DateLine';
import DayProgressBar from './DayProgressBar';

interface DigitalFaceProps {
  date: Date;
  size: 'm' | 'l' | 'xl';
  timeFormat: '12h' | '24h';
  showSeconds: boolean;
  showAmPm: boolean;
  showDate: boolean;
  showWeekNumber: boolean;
  showDayProgress: boolean;
}

const DigitalFace = ({
  date,
  size,
  timeFormat,
  showSeconds,
  showAmPm,
  showDate,
  showWeekNumber,
  showDayProgress,
}: DigitalFaceProps) => {
  const { hoursMinutes, seconds, ampm } = formatTime(date, timeFormat);

  return (
    <div className="clk-digital" data-size={size}>
      <div className="clk-time">
        <span className="clk-hours-minutes">{hoursMinutes}</span>
        {showSeconds && <span className="clk-seconds">{seconds}</span>}
        {timeFormat === '12h' && showAmPm && (
          <span className="clk-ampm">{ampm}</span>
        )}
      </div>
      <DateLine date={date} showDate={showDate} showWeekNumber={showWeekNumber} />
      <DayProgressBar date={date} showDayProgress={showDayProgress} />
    </div>
  );
};

export default DigitalFace;
