import React from 'react';
import { getDayProgress } from '../utils';

interface DayProgressBarProps {
  date: Date;
  showDayProgress: boolean;
}

const DayProgressBar = ({ date, showDayProgress }: DayProgressBarProps) => {
  if (!showDayProgress) return null;

  return (
    <div className="clk-progress-bar">
      <div
        className="clk-progress-fill"
        style={{ '--day-pct': `${getDayProgress(date)}%` } as React.CSSProperties}
      />
    </div>
  );
};

export default DayProgressBar;
