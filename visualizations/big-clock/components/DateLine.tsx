import React from 'react';
import { formatDate, getISOWeekNumber } from '../utils';

interface DateLineProps {
  date: Date;
  showDate: boolean;
  showWeekNumber: boolean;
}

const DateLine = ({ date, showDate, showWeekNumber }: DateLineProps) => {
  if (!showDate) return null;

  return (
    <div className="clk-date-line">
      <span className="clk-date">{formatDate(date)}</span>
      {showWeekNumber && (
        <span className="clk-week-pill">W{getISOWeekNumber(date)}</span>
      )}
    </div>
  );
};

export default DateLine;
