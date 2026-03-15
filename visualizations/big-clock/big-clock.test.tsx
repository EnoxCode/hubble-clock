import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// Mock @hubble/sdk
const mockConfig: Record<string, unknown> = {};
vi.mock('@hubble/sdk', () => ({
  useWidgetConfig: vi.fn(() => mockConfig),
  useConnectorData: vi.fn(() => null),
  useWidgetState: vi.fn((init: unknown) => [init, vi.fn()]),
  useHubbleSDK: vi.fn(() => ({ onButton: vi.fn(() => vi.fn()) })),
}));

// Use a fixed date for all tests
const FIXED_DATE = new Date(2026, 2, 15, 14, 32, 7); // Sun Mar 15, 2026 14:32:07

import Clock from './index';
import DigitalFace from './components/DigitalFace';
import AnalogFace from './components/AnalogFace';
import StripLayout from './components/StripLayout';
import DateLine from './components/DateLine';
import DayProgressBar from './components/DayProgressBar';

describe('DigitalFace', () => {
  it('renders hours and minutes', () => {
    render(
      <DigitalFace
        date={FIXED_DATE}
        size="l"
        timeFormat="24h"
        showSeconds={false}
        showAmPm={false}
        showDate={false}
        showWeekNumber={false}
        showDayProgress={false}
      />
    );
    expect(screen.getByText('14:32')).toBeInTheDocument();
  });

  it('renders seconds when showSeconds is true', () => {
    render(
      <DigitalFace
        date={FIXED_DATE}
        size="l"
        timeFormat="24h"
        showSeconds={true}
        showAmPm={false}
        showDate={false}
        showWeekNumber={false}
        showDayProgress={false}
      />
    );
    expect(screen.getByText('07')).toBeInTheDocument();
  });

  it('renders AM/PM in 12h mode when showAmPm is true', () => {
    render(
      <DigitalFace
        date={FIXED_DATE}
        size="l"
        timeFormat="12h"
        showSeconds={false}
        showAmPm={true}
        showDate={false}
        showWeekNumber={false}
        showDayProgress={false}
      />
    );
    expect(screen.getByText('PM')).toBeInTheDocument();
    expect(screen.getByText('2:32')).toBeInTheDocument();
  });

  it('does not render AM/PM in 24h mode', () => {
    render(
      <DigitalFace
        date={FIXED_DATE}
        size="l"
        timeFormat="24h"
        showSeconds={false}
        showAmPm={true}
        showDate={false}
        showWeekNumber={false}
        showDayProgress={false}
      />
    );
    expect(screen.queryByText('PM')).not.toBeInTheDocument();
  });
});

describe('AnalogFace', () => {
  it('renders SVG with hour and minute hands', () => {
    const { container } = render(
      <AnalogFace
        date={FIXED_DATE}
        size="l"
        showSeconds={false}
        analogMarkers="ticks"
        showDate={false}
        showWeekNumber={false}
        showDayProgress={false}
      />
    );
    expect(container.querySelector('.clk-face')).toBeInTheDocument();
    expect(container.querySelector('.clk-hand-hour')).toBeInTheDocument();
    expect(container.querySelector('.clk-hand-minute')).toBeInTheDocument();
    expect(container.querySelector('.clk-hand-second')).not.toBeInTheDocument();
  });

  it('renders second hand when showSeconds is true', () => {
    const { container } = render(
      <AnalogFace
        date={FIXED_DATE}
        size="l"
        showSeconds={true}
        analogMarkers="ticks"
        showDate={false}
        showWeekNumber={false}
        showDayProgress={false}
      />
    );
    expect(container.querySelector('.clk-hand-second')).toBeInTheDocument();
  });

  it('renders number markers when analogMarkers is numbers', () => {
    const { container } = render(
      <AnalogFace
        date={FIXED_DATE}
        size="l"
        showSeconds={false}
        analogMarkers="numbers"
        showDate={false}
        showWeekNumber={false}
        showDayProgress={false}
      />
    );
    expect(container.querySelectorAll('.clk-hour-num')).toHaveLength(12);
  });
});

describe('StripLayout', () => {
  it('renders digital strip with time', () => {
    render(
      <StripLayout
        date={FIXED_DATE}
        faceStyle="digital"
        timeFormat="24h"
        showAmPm={false}
        showDate={false}
        showWeekNumber={false}
      />
    );
    expect(screen.getByText('14:32')).toBeInTheDocument();
  });

  it('renders analog strip with SVG face', () => {
    const { container } = render(
      <StripLayout
        date={FIXED_DATE}
        faceStyle="analog"
        timeFormat="24h"
        showAmPm={false}
        showDate={false}
        showWeekNumber={false}
      />
    );
    expect(container.querySelector('.clk-face')).toBeInTheDocument();
    expect(container.querySelector('.clk-hand-second')).not.toBeInTheDocument();
  });

  it('renders divider only for digital variant', () => {
    const { container: digitalContainer } = render(
      <StripLayout
        date={FIXED_DATE}
        faceStyle="digital"
        timeFormat="24h"
        showAmPm={false}
        showDate={true}
        showWeekNumber={false}
      />
    );
    expect(digitalContainer.querySelector('.clk-strip-divider')).toBeInTheDocument();

    const { container: analogContainer } = render(
      <StripLayout
        date={FIXED_DATE}
        faceStyle="analog"
        timeFormat="24h"
        showAmPm={false}
        showDate={true}
        showWeekNumber={false}
      />
    );
    expect(analogContainer.querySelector('.clk-strip-divider')).not.toBeInTheDocument();
  });
});

describe('DateLine', () => {
  it('renders date when showDate is true', () => {
    render(<DateLine date={FIXED_DATE} showDate={true} showWeekNumber={false} />);
    expect(screen.getByText('Sun, Mar 15')).toBeInTheDocument();
  });

  it('renders nothing when showDate is false', () => {
    const { container } = render(
      <DateLine date={FIXED_DATE} showDate={false} showWeekNumber={true} />
    );
    expect(container.querySelector('.clk-date-line')).not.toBeInTheDocument();
  });

  it('renders week pill when both showDate and showWeekNumber are true', () => {
    render(<DateLine date={FIXED_DATE} showDate={true} showWeekNumber={true} />);
    expect(screen.getByText(/^W\d+$/)).toBeInTheDocument();
  });
});

describe('DayProgressBar', () => {
  it('renders progress bar when showDayProgress is true', () => {
    const { container } = render(
      <DayProgressBar date={FIXED_DATE} showDayProgress={true} />
    );
    expect(container.querySelector('.clk-progress-bar')).toBeInTheDocument();
    expect(container.querySelector('.clk-progress-fill')).toBeInTheDocument();
  });

  it('renders nothing when showDayProgress is false', () => {
    const { container } = render(
      <DayProgressBar date={FIXED_DATE} showDayProgress={false} />
    );
    expect(container.querySelector('.clk-progress-bar')).not.toBeInTheDocument();
  });
});

describe('Clock (main component)', () => {
  beforeEach(() => {
    Object.keys(mockConfig).forEach((key) => delete mockConfig[key]);
  });

  it('renders digital face by default at L size (no glass wrapper)', () => {
    const { container } = render(<Clock />);
    expect(container.querySelector('.clk-digital')).toBeInTheDocument();
    expect(container.querySelector('.dash-glass')).not.toBeInTheDocument();
  });

  it('wraps in glass panel at M size', () => {
    Object.assign(mockConfig, { size: 'm', faceStyle: 'digital' });
    const { container } = render(<Clock />);
    expect(container.querySelector('.dash-glass.dash-widget')).toBeInTheDocument();
  });

  it('renders strip layout at S size', () => {
    Object.assign(mockConfig, { size: 's' });
    const { container } = render(<Clock />);
    expect(container.querySelector('.clk-strip')).toBeInTheDocument();
  });

  it('renders analog face when faceStyle is analog', () => {
    Object.assign(mockConfig, { faceStyle: 'analog' });
    const { container } = render(<Clock />);
    expect(container.querySelector('.clk-analog')).toBeInTheDocument();
  });
});
