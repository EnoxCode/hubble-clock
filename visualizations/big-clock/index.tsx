import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useWidgetConfig } from '@hubble/sdk';
import DigitalFace from './components/DigitalFace';
import AnalogFace from './components/AnalogFace';
import StripLayout from './components/StripLayout';
import './style.css';

interface ClockConfig {
  size: 's' | 'm' | 'l' | 'xl';
  faceStyle: 'digital' | 'analog';
  timeFormat: '12h' | '24h';
  showSeconds: boolean;
  showAmPm: boolean;
  showDate: boolean;
  showWeekNumber: boolean;
  showDayProgress: boolean;
  analogMarkers: 'ticks' | 'numbers';
}

const Clock = () => {
  const config = useWidgetConfig<ClockConfig>();
  const [now, setNow] = useState(() => new Date());
  const rafRef = useRef<number>(0);

  const size = config.size ?? 'l';
  const faceStyle = config.faceStyle ?? 'digital';
  const timeFormat = config.timeFormat ?? '24h';
  const showSeconds = config.showSeconds ?? false;
  const showAmPm = config.showAmPm ?? true;
  const showDate = config.showDate ?? true;
  const showWeekNumber = config.showWeekNumber ?? false;
  const showDayProgress = config.showDayProgress ?? false;
  const analogMarkers = config.analogMarkers ?? 'ticks';

  // 1-second interval for all faces
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Smooth rAF loop for analog second hand
  const rafUpdate = useCallback(() => {
    setNow(new Date());
    rafRef.current = requestAnimationFrame(rafUpdate);
  }, []);

  useEffect(() => {
    if (showSeconds && faceStyle === 'analog' && size !== 's') {
      rafRef.current = requestAnimationFrame(rafUpdate);
      return () => cancelAnimationFrame(rafRef.current);
    }
  }, [showSeconds, faceStyle, size, rafUpdate]);

  if (size === 's') {
    return (
      <StripLayout
        date={now}
        faceStyle={faceStyle}
        timeFormat={timeFormat}
        showAmPm={showAmPm}
        showDate={showDate}
        showWeekNumber={showWeekNumber}
      />
    );
  }

  const face = faceStyle === 'analog' ? (
    <AnalogFace
      date={now}
      size={size}
      showSeconds={showSeconds}
      analogMarkers={analogMarkers}
      showDate={showDate}
      showWeekNumber={showWeekNumber}
      showDayProgress={showDayProgress}
    />
  ) : (
    <DigitalFace
      date={now}
      size={size}
      timeFormat={timeFormat}
      showSeconds={showSeconds}
      showAmPm={showAmPm}
      showDate={showDate}
      showWeekNumber={showWeekNumber}
      showDayProgress={showDayProgress}
    />
  );

  // M size: glass panel wrapper
  if (size === 'm') {
    return <div className="dash-glass dash-widget">{face}</div>;
  }

  // L/XL: ambient, no wrapper
  return face;
};

export default Clock;
