# hubble-clock

A [Hubble](https://github.com/your-org/hubble) visualization module providing clock widgets for your dashboard. Includes two visualizations: a large single-timezone clock and a multi-timezone overview grid.

## Visualizations

### Big Clock

A full-size clock for your primary timezone. Displays the current time and date, updating every second.

**Configuration**

| Property | Type | Default | Description |
|---|---|---|---|
| `title` | string | — | Widget title shown in the edit interface |
| `timezone` | string | `Europe/Amsterdam` | IANA timezone string (e.g. `America/New_York`) |
| `size` | choice | `L` | Clock display size: `S` (40px), `M` (72px), `L` (100px), `XL` (140px) |
| `format` | choice | `24h` | Time format: `24h` or `AM/PM` |

### Timezone Grid

A compact list of multiple timezones, updating every minute. Each row shows a custom label and the current local time. A day offset indicator (`+1d`, `-1d`) appears when a timezone is on a different calendar day than the local clock.

**Configuration**

Timezones are managed through the built-in **Configure** panel — no JSON editing required. Each entry has a display label (e.g. `Amsterdam`) and an IANA timezone string (e.g. `Europe/Amsterdam`). Entries can be added, reordered, and removed from the panel.

## Requirements

- Hubble `>= 0.1.0`
- No external APIs or connectors — all time data comes from the browser clock

## Development

```bash
npm run dev       # Start Hubble in dev mode with this module loaded
npm run build     # Build module for distribution
npm run test      # Run tests
npm run lint      # Run ESLint
npm run validate  # Validate manifest.json schema
```
