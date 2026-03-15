# Clock Widget Redesign Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the big-clock visualization with a multi-size digital/analog clock per the dashboard clock widget spec.

**Architecture:** Pure visualization (no connector). Main component owns a 1-second timer and delegates to DigitalFace, AnalogFace, or StripLayout based on config. All pure logic lives in utils.ts. CSS uses `--dash-*` variables with `[data-size]` attribute selectors.

**Tech Stack:** React, TypeScript, SVG (analog face), Vitest + @testing-library/react + jsdom (component tests)

**Spec:** `docs/superpowers/specs/2026-03-15-clock-widget-redesign-design.md`
**Source spec:** `/Users/luc/repos/hubble/docs/superpowers/specs/2026-03-15-dashboard-clock-widget.md`

---

## File Structure

```
visualizations/big-clock/
  index.tsx              # Main component: timer, config, shell wrapping, face delegation
  style.css              # All CSS (replaces old big-clock styles)
  components/
    DigitalFace.tsx      # Digital time display (M/L/XL)
    AnalogFace.tsx       # SVG analog clock (M/L/XL)
    StripLayout.tsx      # S-size horizontal pill
    DateLine.tsx         # Date + week pill (shared)
    DayProgressBar.tsx   # Progress bar (shared)
  utils.ts               # Pure functions
  utils.test.ts          # Unit tests for utils
  big-clock.test.tsx     # Component tests (colocated)
manifest.json            # Updated properties
vitest.config.ts         # Add jsdom environment for .tsx tests
package.json             # Add @testing-library/react, @testing-library/jest-dom, jsdom
```

---

## Chunk 1: Foundation — Utils + Test Infrastructure

### Task 1: Install test dependencies

**Files:**
- Modify: `package.json`
- Modify: `vitest.config.ts`

- [ ] **Step 1: Install @testing-library/react, @testing-library/jest-dom, and jsdom**

Note: `@testing-library/react` requires `react` and `react-dom` as peer deps. These are provided by `@hubblehome/module-scaffolding`. If `npm install` warns about missing peers, also install `react` and `react-dom` as devDependencies.

```bash
cd /Users/luc/repos/hubble-clock
npm install -D @testing-library/react @testing-library/jest-dom jsdom
```

- [ ] **Step 2: Update vitest.config.ts to use jsdom for .tsx test files**

Replace `vitest.config.ts` with:

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
  },
});
```

- [ ] **Step 3: Create vitest.setup.ts**

Create `vitest.setup.ts`:

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 4: Run existing tests to confirm nothing broke**

```bash
npm test
```

Expected: existing `getDayDiff` tests in `visualizations/timezone-grid/utils.test.ts` still pass.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts vitest.setup.ts
git commit -m "chore: add testing-library and jsdom for component tests"
```

---

### Task 2: Write utils.ts with TDD

**Files:**
- Create: `visualizations/big-clock/utils.ts`
- Create: `visualizations/big-clock/utils.test.ts`

- [ ] **Step 1: Write failing tests for all utility functions**

Create `visualizations/big-clock/utils.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getHandAngles, getDayProgress, formatDate, getISOWeekNumber, formatTime } from './utils';

describe('getHandAngles', () => {
  it('returns 0 for all hands at midnight', () => {
    const date = new Date(2026, 2, 15, 0, 0, 0); // midnight
    expect(getHandAngles(date)).toEqual({ hour: 0, minute: 0, second: 0 });
  });

  it('returns correct angles at 3:00:00', () => {
    const date = new Date(2026, 2, 15, 3, 0, 0);
    expect(getHandAngles(date)).toEqual({ hour: 90, minute: 0, second: 0 });
  });

  it('returns correct angles at 6:30:30', () => {
    const date = new Date(2026, 2, 15, 6, 30, 30);
    expect(getHandAngles(date)).toEqual({
      hour: 195, // (6 + 30/60) * 30 = 195
      minute: 183, // (30 + 30/60) * 6 = 183
      second: 180, // 30 * 6 = 180
    });
  });

  it('wraps PM hours to 12h range', () => {
    const date = new Date(2026, 2, 15, 15, 0, 0); // 3 PM
    expect(getHandAngles(date).hour).toBe(90); // same as 3 AM
  });
});

describe('getDayProgress', () => {
  it('returns 0 at midnight', () => {
    const date = new Date(2026, 2, 15, 0, 0, 0);
    expect(getDayProgress(date)).toBe(0);
  });

  it('returns 50 at noon', () => {
    const date = new Date(2026, 2, 15, 12, 0, 0);
    expect(getDayProgress(date)).toBe(50);
  });

  it('returns 100 at 23:59', () => {
    const date = new Date(2026, 2, 15, 23, 59, 0);
    expect(getDayProgress(date)).toBe(100);
  });

  it('returns 25 at 6:00', () => {
    const date = new Date(2026, 2, 15, 6, 0, 0);
    expect(getDayProgress(date)).toBe(25);
  });
});

describe('formatDate', () => {
  it('formats as abbreviated weekday, month, day', () => {
    const date = new Date(2026, 2, 15); // March 15, 2026 is a Sunday
    expect(formatDate(date)).toBe('Sun, Mar 15');
  });

  it('formats single-digit day without leading zero', () => {
    const date = new Date(2026, 0, 5); // Jan 5, 2026 is a Monday
    expect(formatDate(date)).toBe('Mon, Jan 5');
  });
});

describe('getISOWeekNumber', () => {
  it('returns week 11 for March 15, 2026', () => {
    const date = new Date(2026, 2, 15);
    expect(getISOWeekNumber(date)).toBe(11);
  });

  it('returns week 1 for Jan 1, 2026 (Thursday)', () => {
    const date = new Date(2026, 0, 1);
    expect(getISOWeekNumber(date)).toBe(1);
  });

  it('returns week 53 for Dec 31, 2020 (Thursday)', () => {
    const date = new Date(2020, 11, 31);
    expect(getISOWeekNumber(date)).toBe(53);
  });
});

describe('formatTime', () => {
  it('formats 24h with zero-padded hours', () => {
    const date = new Date(2026, 2, 15, 9, 5, 7);
    const result = formatTime(date, '24h');
    expect(result).toEqual({ hoursMinutes: '09:05', seconds: '07', ampm: '' });
  });

  it('formats 24h midnight as 00:00', () => {
    const date = new Date(2026, 2, 15, 0, 0, 0);
    const result = formatTime(date, '24h');
    expect(result).toEqual({ hoursMinutes: '00:00', seconds: '00', ampm: '' });
  });

  it('formats 12h with unpadded hours and AM', () => {
    const date = new Date(2026, 2, 15, 9, 5, 7);
    const result = formatTime(date, '12h');
    expect(result).toEqual({ hoursMinutes: '9:05', seconds: '07', ampm: 'AM' });
  });

  it('formats 12h midnight as 12:00 AM', () => {
    const date = new Date(2026, 2, 15, 0, 0, 0);
    const result = formatTime(date, '12h');
    expect(result).toEqual({ hoursMinutes: '12:00', seconds: '00', ampm: 'AM' });
  });

  it('formats 12h noon as 12:00 PM', () => {
    const date = new Date(2026, 2, 15, 12, 0, 0);
    const result = formatTime(date, '12h');
    expect(result).toEqual({ hoursMinutes: '12:00', seconds: '00', ampm: 'PM' });
  });

  it('formats 12h 1 PM as 1:00 PM', () => {
    const date = new Date(2026, 2, 15, 13, 0, 0);
    const result = formatTime(date, '12h');
    expect(result).toEqual({ hoursMinutes: '1:00', seconds: '00', ampm: 'PM' });
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
npm test -- visualizations/big-clock/utils.test.ts
```

Expected: FAIL — module `./utils` not found.

- [ ] **Step 3: Implement all utility functions**

Create `visualizations/big-clock/utils.ts`:

```ts
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
```

- [ ] **Step 4: Run tests to verify they pass**

```bash
npm test -- visualizations/big-clock/utils.test.ts
```

Expected: all tests PASS.

- [ ] **Step 5: Commit**

```bash
git add visualizations/big-clock/utils.ts visualizations/big-clock/utils.test.ts
git commit -m "feat: add clock utility functions with tests

Adds getHandAngles, getDayProgress, formatDate, getISOWeekNumber, formatTime
with comprehensive unit tests."
```

---

## Chunk 2: Shared Components — DateLine + DayProgressBar

### Task 3: Create DateLine component

**Files:**
- Create: `visualizations/big-clock/components/DateLine.tsx`

- [ ] **Step 1: Create DateLine component**

Create `visualizations/big-clock/components/DateLine.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add visualizations/big-clock/components/DateLine.tsx
git commit -m "feat: add DateLine component"
```

---

### Task 4: Create DayProgressBar component

**Files:**
- Create: `visualizations/big-clock/components/DayProgressBar.tsx`

- [ ] **Step 1: Create DayProgressBar component**

Create `visualizations/big-clock/components/DayProgressBar.tsx`:

```tsx
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
```

Note: The `style` prop is used here only to set a CSS custom property (`--day-pct`). This is an acknowledged exception to the no-inline-styles rule per the design spec.

- [ ] **Step 2: Commit**

```bash
git add visualizations/big-clock/components/DayProgressBar.tsx
git commit -m "feat: add DayProgressBar component"
```

---

## Chunk 3: Face Components — Digital, Analog, Strip

### Task 5: Create DigitalFace component

**Files:**
- Create: `visualizations/big-clock/components/DigitalFace.tsx`

- [ ] **Step 1: Create DigitalFace component**

Create `visualizations/big-clock/components/DigitalFace.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add visualizations/big-clock/components/DigitalFace.tsx
git commit -m "feat: add DigitalFace component"
```

---

### Task 6: Create AnalogFace component

**Files:**
- Create: `visualizations/big-clock/components/AnalogFace.tsx`

- [ ] **Step 1: Create AnalogFace component**

Create `visualizations/big-clock/components/AnalogFace.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add visualizations/big-clock/components/AnalogFace.tsx
git commit -m "feat: add AnalogFace SVG component"
```

---

### Task 7: Create StripLayout component

**Files:**
- Create: `visualizations/big-clock/components/StripLayout.tsx`

- [ ] **Step 1: Create StripLayout component**

Create `visualizations/big-clock/components/StripLayout.tsx`:

```tsx
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
```

- [ ] **Step 2: Commit**

```bash
git add visualizations/big-clock/components/StripLayout.tsx
git commit -m "feat: add StripLayout component for S size"
```

---

## Chunk 4: Main Component + CSS + Manifest

### Task 8: Rewrite main index.tsx

**Files:**
- Modify: `visualizations/big-clock/index.tsx`

- [ ] **Step 1: Replace index.tsx with new main component**

Replace `visualizations/big-clock/index.tsx` with:

```tsx
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
  // Note: this updates state at ~60fps when active. The AnalogFace component
  // should be lightweight (just SVG transforms), so this is acceptable.
  // If perf becomes an issue, refactor to use a ref + direct DOM manipulation
  // on the second hand element only.
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
```

- [ ] **Step 2: Commit**

```bash
git add visualizations/big-clock/index.tsx
git commit -m "feat: rewrite main clock component with face delegation and shell wrapping"
```

---

### Task 9: Replace style.css

**Files:**
- Modify: `visualizations/big-clock/style.css`

- [ ] **Step 1: Replace style.css with new clock styles**

Replace `visualizations/big-clock/style.css` with the full CSS from the source spec. This includes:

```css
/* ── Digital layout ── */
.clk-digital {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.clk-time {
  display: flex;
  align-items: baseline;
  line-height: 1;
  color: var(--dash-text-primary);
  font-variant-numeric: tabular-nums;
}

/* Size-specific time scale */
[data-size="xl"] .clk-hours-minutes { font-size: 100px; font-weight: 200; letter-spacing: -5px; }
[data-size="xl"] .clk-seconds       { font-size: 40px;  font-weight: 300; color: rgba(255,255,255,0.4); margin-left: 4px; letter-spacing: -1px; }

[data-size="l"] .clk-hours-minutes  { font-size: 64px;  font-weight: 200; letter-spacing: -3px; }
[data-size="l"] .clk-seconds        { font-size: 26px;  font-weight: 300; color: rgba(255,255,255,0.4); margin-left: 3px; letter-spacing: -1px; }

[data-size="m"] .clk-hours-minutes  { font-size: 40px;  font-weight: 300; letter-spacing: -1.5px; }
[data-size="m"] .clk-seconds        { font-size: 16px;  font-weight: 400; color: rgba(255,255,255,0.4); margin-left: 2px; }

[data-size="s"] .clk-hours-minutes  { font-size: 16px;  font-weight: 400; letter-spacing: -0.3px; }

/* ── AM/PM indicator ── */
.clk-ampm {
  font-size: 11px;
  font-weight: 500;
  color: var(--dash-text-muted);
  letter-spacing: 0.5px;
  margin-left: 4px;
}
[data-size="s"] .clk-ampm { font-size: 9px; margin-left: 3px; }

/* ── Date line ── */
.clk-date-line {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 8px;
}
[data-size="xl"] .clk-date-line { margin-top: 10px; }
[data-size="m"] .clk-date-line  { margin-top: 6px; gap: 7px; }
[data-size="s"] .clk-date-line  { margin-top: 0; gap: 6px; }

.clk-date {
  font-size: 13px;
  color: var(--dash-text-secondary);
}
[data-size="xl"] .clk-date { font-size: 16px; }
[data-size="m"] .clk-date  { font-size: 12px; }
[data-size="s"] .clk-date  { font-size: 11px; }

/* ── Week number pill ── */
.clk-week-pill {
  font-size: 9px;
  font-weight: 500;
  color: rgba(255,255,255,0.35);
  background: rgba(255,255,255,0.08);
  padding: 2px 6px;
  border-radius: 3px;
  letter-spacing: 0.5px;
}
[data-size="xl"] .clk-week-pill { font-size: 10px; padding: 2px 7px; }
[data-size="s"] .clk-week-pill  { font-size: 8px;  padding: 1px 5px; }

/* ── Day progress bar ── */
.clk-progress-bar {
  margin-top: 12px;
  width: 100%;
  max-width: 240px;
  height: 2px;
  border-radius: 1px;
  background: rgba(255,255,255,0.07);
  position: relative;
  overflow: hidden;
}
[data-size="xl"] .clk-progress-bar { max-width: 320px; height: 3px; border-radius: 2px; margin-top: 14px; }
[data-size="m"] .clk-progress-bar  { max-width: 100%; margin-top: 10px; }

.clk-progress-fill {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  width: var(--day-pct);
  border-radius: inherit;
  background: var(--dash-accent);
  opacity: 0.6;
}

/* ── Analog layout ── */
.clk-analog {
  display: flex;
  flex-direction: column;
  align-items: center;
}

/* Face sizes */
[data-size="xl"] .clk-face { width: 180px; height: 180px; }
[data-size="l"]  .clk-face { width: 140px; height: 140px; }
[data-size="m"]  .clk-face { width: 100px; height: 100px; }
[data-size="s"]  .clk-face { width: 24px;  height: 24px; }

/* Hour numbers — numbers variant */
.clk-hour-num {
  fill: rgba(255,255,255,0.5);
  font-size: 14px;
  font-family: 'Inter', sans-serif;
  font-weight: 300;
}

/* Second hand uses accent color */
.clk-hand-second {
  stroke: var(--dash-accent);
  opacity: 0.5;
}

/* ── S size strip ── */
.clk-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.08);
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
  border-radius: var(--dash-pill-radius);
  padding: 6px 14px;
}

.clk-strip-divider {
  width: 1px;
  height: 14px;
  background: rgba(255, 255, 255, 0.12);
}
```

- [ ] **Step 2: Commit**

```bash
git add visualizations/big-clock/style.css
git commit -m "feat: replace clock CSS with multi-size dash-* styles"
```

---

### Task 10: Update manifest.json

**Files:**
- Modify: `manifest.json`

- [ ] **Step 1: Update manifest with new big-clock properties**

Replace the entire `visualizations[0]` entry (Big Clock) in `manifest.json` with the new properties. Keep `visualizations[1]` (Timezone Grid) unchanged. Also update the top-level module fields:

```json
{
  "name": "Clock",
  "version": "1.0.0",
  "description": "Digital and analog clock with configurable date, week number, and day progress bar",
  "minAppVersion": "2.0.0",
  "type": ["visualization"],
  "visualizations": [
    {
      "name": "Clock",
      "description": "Digital and analog clock with multiple size variants",
      "path": "big-clock",
      "mockData": {},
      "properties": [
        {
          "name": "size",
          "label": "Size",
          "type": "choice",
          "required": false,
          "default": "l",
          "description": "Widget size",
          "choices": [
            { "label": "Small (top bar)", "value": "s" },
            { "label": "Medium", "value": "m" },
            { "label": "Large", "value": "l" },
            { "label": "Extra Large", "value": "xl" }
          ]
        },
        {
          "name": "faceStyle",
          "label": "Face Style",
          "type": "choice",
          "required": false,
          "default": "digital",
          "description": "Clock face style",
          "choices": [
            { "label": "Digital", "value": "digital" },
            { "label": "Analog", "value": "analog" }
          ]
        },
        {
          "name": "timeFormat",
          "label": "Time Format",
          "type": "choice",
          "required": false,
          "default": "24h",
          "description": "Time format",
          "choices": [
            { "label": "24-hour", "value": "24h" },
            { "label": "12-hour", "value": "12h" }
          ]
        },
        {
          "name": "showSeconds",
          "label": "Show Seconds",
          "type": "boolean",
          "required": false,
          "default": false,
          "description": "Show seconds (not available at S size)"
        },
        {
          "name": "showAmPm",
          "label": "Show AM/PM",
          "type": "boolean",
          "required": false,
          "default": true,
          "description": "Show AM/PM indicator (only applies in 12h mode)"
        },
        {
          "name": "showDate",
          "label": "Show Date",
          "type": "boolean",
          "required": false,
          "default": true,
          "description": "Show date below the clock"
        },
        {
          "name": "showWeekNumber",
          "label": "Show Week Number",
          "type": "boolean",
          "required": false,
          "default": false,
          "description": "Show ISO week number pill next to date"
        },
        {
          "name": "showDayProgress",
          "label": "Show Day Progress",
          "type": "boolean",
          "required": false,
          "default": false,
          "description": "Show day progress bar (not available at S size)"
        },
        {
          "name": "analogMarkers",
          "label": "Analog Markers",
          "type": "choice",
          "required": false,
          "default": "ticks",
          "description": "Analog face marker style",
          "choices": [
            { "label": "Tick marks only", "value": "ticks" },
            { "label": "Numbers (1–12)", "value": "numbers" }
          ]
        }
      ]
    },
    {
      "name": "Timezone Grid",
      "description": "Monitor multiple timezones at a glance",
      "path": "timezone-grid",
      "mockData": {},
      "configPanels": [
        {
          "label": "Configure",
          "panel": "configure"
        }
      ],
      "properties": [
        {
          "name": "title",
          "label": "Title",
          "type": "string",
          "required": true,
          "description": "Widget title displayed in the edit interface"
        },
        {
          "name": "timezones",
          "label": "Timezones",
          "type": "json",
          "required": false,
          "default": [],
          "description": "List of timezone entries (managed via Configure panel)"
        }
      ]
    }
  ]
}
```

- [ ] **Step 2: Run manifest validation**

```bash
npm run validate
```

Expected: validation passes.

- [ ] **Step 3: Commit**

```bash
git add manifest.json
git commit -m "feat: update manifest with new clock config properties

Replaces old big-clock properties (title, timezone, size, format) with
9 new properties per the clock widget spec. Timezone grid unchanged."
```

---

## Chunk 5: Component Tests + Verification

### Task 11: Write component tests

**Files:**
- Create: `visualizations/big-clock/big-clock.test.tsx`

- [ ] **Step 1: Create component test file**

Create `visualizations/big-clock/big-clock.test.tsx`:

```tsx
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

// We need to import components after mock is set up
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
    // No second hand at S size
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
```

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: ALL tests pass (both old `getDayDiff` tests and new tests).

- [ ] **Step 3: Commit**

```bash
git add visualizations/big-clock/big-clock.test.tsx
git commit -m "test: add component tests for clock widget

Tests DigitalFace, AnalogFace, StripLayout, DateLine, DayProgressBar,
and the main Clock component with config-driven rendering."
```

---

### Task 12: Final verification

- [ ] **Step 1: Run validate**

```bash
npm run validate
```

Expected: manifest validation passes.

- [ ] **Step 2: Run lint**

```bash
npm run lint
```

Expected: no lint errors. Fix any issues.

- [ ] **Step 3: Run all tests**

```bash
npm test
```

Expected: all tests pass.

- [ ] **Step 4: Run build**

```bash
npm run build
```

Expected: build succeeds without errors.

- [ ] **Step 5: Commit any lint/build fixes if needed**

If any fixes were needed:
```bash
git add -A
git commit -m "fix: address lint and build issues"
```
