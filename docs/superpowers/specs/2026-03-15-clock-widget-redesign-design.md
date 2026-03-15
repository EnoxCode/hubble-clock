# Clock Widget Redesign

**Date:** 2026-03-15
**Source spec:** `/Users/luc/repos/hubble/docs/superpowers/specs/2026-03-15-dashboard-clock-widget.md`

---

## Overview

Replace the existing `big-clock` visualization with a multi-size clock widget supporting both digital and analog face styles. All display features (date, seconds, week number, day progress bar) are independently togglable via config properties. The clock is a pure visualization — no connector, no external data.

The `timezone-grid` visualization is kept unchanged.

---

## Approach

**Replace `big-clock` in-place** — rewrite the contents of `visualizations/big-clock/` with the new implementation. The old code is too different to incrementally evolve.

---

## File Structure

```
visualizations/
  big-clock/
    index.tsx                   # Main component: timer, config, shell wrapping, face delegation
    style.css                   # All CSS: digital, analog, strip, date-line, progress bar
    components/
      DigitalFace.tsx           # Digital time display (M/L/XL sizes)
      AnalogFace.tsx            # SVG analog clock (M/L/XL sizes)
      StripLayout.tsx           # S-size horizontal pill (digital or analog inline)
      DateLine.tsx              # Date text + week pill (shared)
      DayProgressBar.tsx        # Day progress bar (shared, hidden at S)
    utils.ts                    # Pure functions: getHandAngles, getDayProgress, formatDate, getISOWeekNumber
```

---

## Component Architecture

### Data Flow

```
index.tsx (timer + config)
  ├─ size === 's' → <StripLayout date={now} config={...} />
  │                    ├─ faceStyle === 'digital' → inline time
  │                    └─ faceStyle === 'analog'  → tiny 24px SVG
  │                    └─ <DateLine /> (inline)
  └─ size !== 's' → <DigitalFace /> or <AnalogFace />
                     └─ <DateLine />
                     └─ <DayProgressBar />
```

### index.tsx — Main Component

- Reads config via `useWidgetConfig<ClockConfig>()`
- Owns a single `useState<Date>` for current time
- Runs `setInterval` at 1000ms for all clock faces (smooth minute transitions)
- When `showSeconds && faceStyle === 'analog'`: additionally runs `requestAnimationFrame` loop for smooth second hand sweep
- Wraps output based on size:
  - `xl` / `l`: No wrapper (ambient — no glass, no header, no footer)
  - `m`: Wrapped in `<div className="dash-glass dash-widget">`
  - `s`: Delegates entirely to `<StripLayout />`
- Sets `data-size` attribute on root element for CSS size selectors
- No `useConnectorData` (no connector), no `useWidgetState` (no persistent state)

### DigitalFace.tsx

- Receives: `date: Date`, `size: 'm' | 'l' | 'xl'`, `config` (timeFormat, showSeconds, showAmPm, showDate, showWeekNumber, showDayProgress)
- Renders `.clk-digital` with `.clk-time` > `.clk-hours-minutes` + optional `.clk-seconds`
- Renders optional `.clk-ampm` (only when timeFormat=12h and showAmPm=true)
- Delegates `<DateLine />` and `<DayProgressBar />` based on config flags

### AnalogFace.tsx

- Receives: `date: Date`, `size: 'm' | 'l' | 'xl'`, `config` (showSeconds, analogMarkers, showDate, showWeekNumber, showDayProgress)
- Renders `.clk-analog` with SVG `.clk-face` (viewBox 0 0 200 200)
- Renders outer ring, markers (ticks or numbers variant), center dot
- Computes hand angles via `getHandAngles(date)` and applies as SVG `transform="rotate(angle, 100, 100)"`
- Second hand only rendered when `showSeconds=true`, uses `--dash-accent` with reduced opacity
- Delegates `<DateLine />` and `<DayProgressBar />` below the SVG

### StripLayout.tsx

- Receives: `date: Date`, `config` (faceStyle, timeFormat, showAmPm, showDate, showWeekNumber, analogMarkers)
- Renders `.clk-strip` horizontal pill with own backdrop
- Digital: inline `.clk-hours-minutes` (16px, no seconds)
- Analog: tiny 24px SVG face (4 major ticks only, no minor, no seconds)
- Digital variant: `.clk-strip-divider` (1px vertical line) between time and date
- Analog variant: no divider between SVG face and date (per source spec HTML)
- Optional date + week pill inline
- No seconds, no day progress bar at S size (config flags accepted but ignored)

### DateLine.tsx

- Receives: `date: Date`, `showDate: boolean`, `showWeekNumber: boolean`
- Returns null if `showDate=false`
- Renders `.clk-date-line` > `.clk-date` + optional `.clk-week-pill`
- Week pill only renders when both `showDate` and `showWeekNumber` are true

### DayProgressBar.tsx

- Receives: `date: Date`, `showDayProgress: boolean`
- Returns null if `showDayProgress=false`
- Renders `.clk-progress-bar` > `.clk-progress-fill` with `--day-pct` CSS custom property
- Progress computed via `getDayProgress(date)`

---

## Utility Functions (utils.ts)

```ts
getHandAngles(date: Date): { hour: number; minute: number; second: number }
getDayProgress(date: Date): number          // 0-100
formatDate(date: Date): string              // "Sun, Mar 15"
getISOWeekNumber(date: Date): number        // 1-53
formatTime(date: Date, format: '12h' | '24h'): { hoursMinutes: string; seconds: string; ampm: string }
```

### formatTime details

- **24h mode:** Hours zero-padded (`00`–`23`), e.g. `{ hoursMinutes: "09:05", seconds: "07", ampm: "" }`
- **12h mode:** Hours unpadded (`1`–`12`), midnight = 12, noon = 12. e.g. `{ hoursMinutes: "2:05", seconds: "07", ampm: "PM" }`
- Minutes and seconds always zero-padded to 2 digits
- `ampm` returns empty string in 24h mode

### ClockConfig type

```ts
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
```

---

## CSS

Single `style.css` using `--dash-*` CSS variables from the dashboard design system (not `--hubble-*` — those are for admin/studio UI).

**Note:** CLAUDE.md says to use `--hubble-*` variables, but that guidance applies to admin/studio UI. The dashboard runtime provides a separate `--dash-*` namespace (defined in `hubble-dash-ui/src/styles/dash-base.css`), which is what visualization widgets on the live dashboard should use. The source spec's CSS uses `--dash-*` throughout.

**Exception for `--day-pct`:** The `DayProgressBar` component sets a `--day-pct` CSS custom property via React's `style` prop. CLAUDE.md forbids inline styles, but setting a single CSS custom property for dynamic data binding is the standard React pattern and is not equivalent to inline styling for layout/appearance. This is the same approach the source spec prescribes.

Size variants use `[data-size="xl|l|m|s"]` attribute selectors. CSS follows the spec verbatim for:
- Digital layout and size-specific typography
- AM/PM indicator
- Date line and week pill
- Day progress bar
- Analog layout and face sizes
- S-size strip layout

---

## Manifest Changes

Update `manifest.json`:
- Module metadata: name "Clock", version "1.0.0", minAppVersion "2.0.0"
- Replace big-clock properties (nested under `visualizations[0].properties`) with 9 new config properties from spec: `size`, `faceStyle`, `timeFormat`, `showSeconds`, `showAmPm`, `showDate`, `showWeekNumber`, `showDayProgress`, `analogMarkers`
- Remove old properties: `title`, `timezone`, `format`
- Keep `timezone-grid` visualization entry unchanged
- Size choice values use lowercase (`s`, `m`, `l`, `xl`) — the old manifest used uppercase; this is an intentional change per the source spec

**Timezone support intentionally dropped.** The old big-clock had a `timezone` property (default: `Europe/Amsterdam`). The new clock always shows system/browser local time — timezone display is the responsibility of the `timezone-grid` visualization. This is a deliberate simplification per the source spec.

---

## Config Properties

| Property | Type | Default | Description |
|---|---|---|---|
| `size` | choice (s/m/l/xl) | `l` | Controls typography scale, shell variant, and layout |
| `faceStyle` | choice (digital/analog) | `digital` | Clock face rendering style |
| `timeFormat` | choice (12h/24h) | `24h` | 12-hour or 24-hour display |
| `showSeconds` | boolean | `false` | Display seconds (ignored at S size) |
| `showAmPm` | boolean | `true` | Show AM/PM (only in 12h mode) |
| `showDate` | boolean | `true` | Display date line below clock |
| `showWeekNumber` | boolean | `false` | Show ISO week number pill (requires showDate) |
| `showDayProgress` | boolean | `false` | Show day progress bar (ignored at S size) |
| `analogMarkers` | choice (ticks/numbers) | `ticks` | Analog face marker style |

---

## Testing Strategy

### Unit tests (utils.test.ts)

- `getHandAngles`: verify hour/minute/second angle math at known times
- `getDayProgress`: midnight=0, noon=50, 23:59≈100
- `formatDate`: verify abbreviated format output
- `getISOWeekNumber`: verify at year boundaries and known weeks
- `formatTime`: verify 12h/24h formatting, AM/PM

### Component tests (tests/visualizations/big-clock.test.tsx)

Mock `useWidgetConfig` from `@hubble/sdk`. Test:
- Digital face renders `clk-hours-minutes` text
- Analog face renders SVG with hand elements
- S size renders strip layout (`.clk-strip`)
- `showDate=false` hides `.clk-date-line`
- `timeFormat=12h` + `showAmPm=true` shows `.clk-ampm`
- S size doesn't render seconds or progress bar even when config enables them
- `showWeekNumber=true` + `showDate=true` shows `.clk-week-pill`
- M size wraps in `.dash-glass.dash-widget`
- L/XL sizes have no glass wrapper

### Not tested

Timer intervals, `requestAnimationFrame`, shell injection — runtime concerns outside unit test scope.

---

## Verification

After implementation:
- `npm run validate` — manifest schema validation
- `npm run lint` — ESLint passes
- `npm run test` — all tests pass
- `npm run build` — builds without errors

---

## Behavior Rules (from spec)

- Digital is default face style
- Seconds use accent color on analog (second hand + center dot)
- S size omits seconds and day progress (config accepted but ignored)
- AM/PM only renders in 12h mode
- Week pill requires showDate to also be true
- No colon blink (static colon)
- All clocks update every 1 second; analog second hand uses rAF for smooth sweep
- Day progress bar derived from time state (no separate timer — recalculates every second via the shared timer, but the value only visually changes once per minute; this is simpler than a separate 60s interval)
- No footer on any size (no data source, nothing goes stale)
