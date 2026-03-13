# HubbleClock

A clock visualization supports multiple timezones

This is a Hubble module (type: **visualization**). Hubble is an Electron-based kitchen dashboard that runs on a Raspberry Pi with a portrait 1920x1080 screen.

---

## Structure

```
hubble-clock/
├── manifest.json                         # Module metadata, properties, dependencies
├── connector/
│   └── index.ts                          # Server-side: data fetching, scheduling, emit
├── visualizations/
│   └── default/
│       ├── index.tsx                     # React component rendered in widget container
│       ├── style.css                     # Widget styles (use --hubble-* CSS variables)
│       └── panels/
│           └── configure.tsx             # (optional) config panel component
└── README.md
```

**Connector modules** use only `connector/`. **Visualization modules** use only `visualizations/`. **Hybrid modules** use both.

---

## Commands

```bash
npm run validate         # Validate manifest.json schema
npm run dev              # Start Hubble in dev mode with this module loaded
npm run build            # Build module for distribution
```

---

## UI Styling Rules

- **No inline styles** — never use `style="..."` on HTML elements or the `style` prop in React/TSX.
- **Use stylesheet classes** — all styles go in `visualizations/<path>/style.css`. Use `--hubble-*` CSS variables for automatic theming.
- **Use `hubble-ui` components** — always prefer components from `hubble-ui` over writing custom equivalents.

### hubble-ui components

```tsx
import { Button, IconButton, Input, Select, Slider, Toggle, ColorPicker, StatusDot, Badge, Field, Collapsible } from 'hubble-ui';
```

| Component | Purpose |
|---|---|
| `Button` | Primary/secondary/ghost actions |
| `IconButton` | Icon-only action button |
| `Input` | Text input field |
| `Select` | Dropdown selector |
| `Slider` | Range slider |
| `Toggle` | Boolean on/off switch |
| `ColorPicker` | Color selection |
| `StatusDot` | Colored status indicator dot |
| `Badge` | Small status/count label |
| `Field` | Form field wrapper with label and validation |
| `Collapsible` | Expandable/collapsible section |

### Key CSS variables

```css
--hubble-text-primary       /* Main text color */
--hubble-text-secondary     /* Muted text */
--hubble-panel-bg           /* Glassmorphism panel background */
--hubble-panel-blur         /* Backdrop blur value */
--hubble-border             /* Standard border style */
--hubble-radius-lg          /* Large border radius */
--hubble-accent             /* Accent/brand color */
```

---

## SDK Quick Reference

### Server SDK (injected as `sdk` in connector/index.ts)

| Method | Signature | Purpose |
|---|---|---|
| `sdk.emit` | `(topic: string, data: unknown) => void` | Broadcast data to all subscribed clients |
| `sdk.schedule` | `(intervalMs: number, cb: () => void) => { stop }` | Run callback immediately then on interval; returns stop handle |
| `sdk.http.get/post/put/patch/delete` | `(url, body?, options?) => Promise<unknown>` | HTTP with auto-retry (3x exponential backoff) |
| `sdk.log.info/warn/error` | `(message: string) => void` | Structured logging; `.error()` also writes to error_logs DB |
| `sdk.logError` | `(message: string, stack?: string) => void` | Write directly to error_logs table |
| `sdk.getConfig` | `() => Record<string, unknown>` | Returns manifest defaults merged with user-configured values |
| `sdk.storage.get` | `(key: string) => unknown \| null` | Read from persistent key-value store |
| `sdk.storage.set` | `(key: string, value: unknown) => void` | Write to persistent key-value store |
| `sdk.storage.delete` | `(key: string) => void` | Remove a key from storage |
| `sdk.storage.collection` | `(name: string) => CollectionApi` | Ordered collection CRUD |
| `sdk.getConnectorState` | `(moduleName: string, topic?: string) => unknown \| null` | Read last emitted data from another connector |
| `sdk.getDashboardState` | `() => DashboardState` | Get active page, screen status, page list |
| `sdk.notify` | `(message: string, options?) => void` | Push notification to dashboard |

### Client SDK (hooks — use in visualizations/*/index.tsx)

```tsx
import { useConnectorData, useWidgetConfig, useWidgetState, useHubbleSDK } from '@hubble/sdk';

// Subscribe to connector data — auto re-renders
const data = useConnectorData<MyData>();

// Read widget config (from manifest properties)
const config = useWidgetConfig<{ title?: string }>();

// Per-widget-instance state
const [state, setState] = useWidgetState({ count: 0 });

// Raw SDK for buttons, presentation modes
const sdk = useHubbleSDK();
useEffect(() => sdk.onButton('button1', () => doSomething()), [sdk]);
```

---

## Manifest

### Property types

`string`, `text` (multiline), `number`, `range` (slider), `boolean`, `choice` (dropdown), `datetime`, `json` (code editor), `color`, `url`, `secret` (masked input).

Extra fields by type:
- `choice`: `choices: [{label, value}]`
- `text`: `rows`, `maxLength`
- `number` / `range`: `min`, `max`, `step`

### Config Panels

Visualizations can declare `configPanels` for custom configuration UI:

```json
"visualizations": [{
  "name": "Default",
  "path": "default",
  "configPanels": [
    { "label": "Configure", "panel": "configure" }
  ]
}]
```

Panel source: `visualizations/{vizPath}/panels/{panel}.tsx`
Panel components receive `{ config, onConfigChange, moduleId, moduleName }` props (typed as `ConfigPanelProps` from `hubble-sdk.d.ts`).

---

## Architecture

### Module types

- **Connector**: Server-only. Fetches external data and emits events via `sdk.emit()`.
- **Visualization**: Client-only. Renders React component inside widget container. Subscribes via `useConnectorData()`.
- **Hybrid**: Has both a `connector/` and `visualizations/`.

### Widget Lifecycle

#### Server side (connector/index.ts)

1. **Load**: Hubble imports `connector/index.ts` and calls the default export with `sdk`.
2. **Initialize**: Module calls `sdk.schedule()` to set up polling or `sdk.emit()` for one-time data.
3. **Run**: Scheduled callbacks fire, fetching data and emitting to topics.
4. **Cleanup**: On unload, Hubble clears all scheduled timers.

#### Client side (visualizations/*/index.tsx)

1. **Mount**: React component renders inside `WidgetContainer`.
2. **Subscribe**: `useConnectorData()` hook subscribes automatically.
3. **Render**: Component re-renders when new data arrives.

---

## Error Handling

```ts
sdk.log.info("Fetched 42 items");
sdk.log.warn("API rate limit near");
sdk.log.error("API request failed");  // also writes to error_logs DB
```

---

## Hardware Buttons

```json
"hardwareButtons": { "button1": "play", "button2": "pause" }
```

```tsx
const sdk = useHubbleSDK();
useEffect(() => {
  const unsub = sdk.onButton('button1', () => handlePlay());
  return unsub;
}, [sdk]);
```
