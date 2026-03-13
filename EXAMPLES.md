# Examples

Practical module patterns showing how to use the Hubble SDK for common scenarios.

---

## Weather Connector

A connector that fetches weather data from an API on a schedule and emits it for visualizations.

### manifest.json

```json
{
  "name": "weather",
  "version": "1.0.0",
  "description": "Fetches current weather and forecast",
  "type": ["connector"],
  "properties": [
    { "name": "apiKey", "type": "secret", "required": true, "description": "OpenWeatherMap API key" },
    { "name": "city", "type": "string", "required": true, "description": "City name" },
    { "name": "units", "type": "choice", "required": false, "default": "metric", "description": "Units", "choices": [{"label": "Metric", "value": "metric"}, {"label": "Imperial", "value": "imperial"}] },
    { "name": "refreshInterval", "type": "range", "required": false, "default": 300, "description": "Refresh interval (seconds)", "min": 60, "max": 3600, "step": 60 }
  ]
}
```

### src/connector.ts

```typescript
import type { ServerSdk } from './hubble-sdk';

interface WeatherResponse {
  main: { temp: number; humidity: number };
  weather: { description: string; icon: string }[];
  wind: { speed: number };
}

export default function connector(sdk: ServerSdk) {
  const config = sdk.getConfig();
  const apiKey = config.apiKey as string;
  const city = config.city as string;
  const units = (config.units as string) || 'metric';
  const interval = ((config.refreshInterval as number) || 300) * 1000;

  if (!apiKey || !city) {
    sdk.log.warn('Missing apiKey or city configuration');
    return;
  }

  const task = sdk.schedule(interval, async () => {
    try {
      const data = (await sdk.http.get(
        `https://api.openweathermap.org/data/2.5/weather?q=${city}&units=${units}&appid=${apiKey}`,
      )) as WeatherResponse;

      sdk.emit('weather:data', {
        temperature: data.main.temp,
        humidity: data.main.humidity,
        condition: data.weather[0]?.description ?? 'unknown',
        icon: data.weather[0]?.icon ?? '01d',
        windSpeed: data.wind.speed,
        units,
        fetchedAt: new Date().toISOString(),
      });

      sdk.log.info(`Weather fetched: ${data.main.temp} degrees, ${data.weather[0]?.description}`);
    } catch (err) {
      sdk.log.error(`Failed to fetch weather: ${err instanceof Error ? err.message : String(err)}`);
    }
  });

  return { stop: task.stop };
}
```

Key patterns:
- `getConfig()` retrieves user-configured API key, city, and units.
- `sdk.schedule()` runs the fetch immediately, then at the configured interval.
- `sdk.http.get()` handles retries automatically (3 retries with exponential backoff).
- `sdk.emit()` pushes data to all subscribed visualizations.
- The connector returns `{ stop }` so Hubble can clean up the interval on shutdown.

---

## Timer Visualization

A visualization-only module that uses local widget state and hardware buttons. No connector needed -- all state is local to the widget instance.

### manifest.json

```json
{
  "name": "cooking-timer",
  "version": "1.0.0",
  "description": "Kitchen countdown timer",
  "type": ["visualization"],
  "hardwareButtons": {
    "button1": "start/pause",
    "button2": "reset",
    "button3": "+1 min",
    "button4": "-1 min"
  },
  "properties": [
    { "name": "defaultMinutes", "type": "number", "required": false, "default": 10, "description": "Default timer duration (minutes)", "min": 1, "max": 120, "step": 1 }
  ]
}
```

### src/visualization.tsx

```tsx
import React, { useEffect, useRef } from 'react';
import { useWidgetState, useWidgetConfig, useHubbleSDK } from '@hubble/sdk/hooks';

interface TimerState {
  remainingMs: number;
  running: boolean;
}

export default function CookingTimer() {
  const config = useWidgetConfig<{ defaultMinutes: number }>();
  const defaultMs = (config.defaultMinutes || 10) * 60 * 1000;

  const [state, setState] = useWidgetState<TimerState>({
    remainingMs: defaultMs,
    running: false,
  });

  const sdk = useHubbleSDK();
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Countdown logic
  useEffect(() => {
    if (state.running && state.remainingMs > 0) {
      intervalRef.current = setInterval(() => {
        setState({ remainingMs: Math.max(0, state.remainingMs - 1000) });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [state.running, state.remainingMs, setState]);

  // Alert when timer reaches zero
  useEffect(() => {
    if (state.remainingMs === 0 && state.running) {
      setState({ running: false });
      sdk.requestAcknowledge(); // Full-page until user presses a button
    }
  }, [state.remainingMs, state.running, sdk, setState]);

  // Hardware button handlers
  useEffect(() => {
    const unsubs = [
      sdk.onButton('button1', () => {
        setState({ running: !state.running });
      }),
      sdk.onButton('button2', () => {
        setState({ remainingMs: defaultMs, running: false });
      }),
      sdk.onButton('button3', () => {
        setState({ remainingMs: state.remainingMs + 60_000 });
      }),
      sdk.onButton('button4', () => {
        setState({ remainingMs: Math.max(0, state.remainingMs - 60_000) });
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [sdk, state, setState, defaultMs]);

  const minutes = Math.floor(state.remainingMs / 60_000);
  const seconds = Math.floor((state.remainingMs % 60_000) / 1000);

  return (
    <div style={{ textAlign: 'center', padding: '2rem' }}>
      <div style={{ fontSize: '4rem', fontVariantNumeric: 'tabular-nums' }}>
        {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
      </div>
      <div style={{ marginTop: '1rem', opacity: 0.7 }}>
        {state.running ? 'Running' : state.remainingMs === 0 ? 'Done!' : 'Paused'}
      </div>
    </div>
  );
}
```

Key patterns:
- `useWidgetState` manages per-instance state with React integration.
- `useHubbleSDK()` provides access to `onButton` for hardware control.
- `sdk.requestAcknowledge()` goes full-page when the timer finishes, requiring a button press to dismiss.
- Each timer widget instance maintains its own independent countdown.

---

## Shopping List (Hybrid Module)

A hybrid module combining a connector (with persistent collection storage) and a visualization (with React hooks).

### manifest.json

```json
{
  "name": "shopping-list",
  "version": "1.0.0",
  "description": "Persistent shopping list with check-off support",
  "type": ["connector", "visualization"],
  "hardwareButtons": {
    "button1": "check/uncheck selected"
  },
  "properties": [
    { "name": "title", "type": "string", "required": false, "default": "Shopping List", "description": "List title" }
  ]
}
```

### src/connector.ts

```typescript
import type { ServerSdk, CollectionItem } from './hubble-sdk';

export interface ShoppingItem {
  name: string;
  checked: boolean;
  quantity: number;
}

export default function connector(sdk: ServerSdk) {
  const items = sdk.storage.collection('items');

  function emitList() {
    const list = items.list();
    sdk.emit('shopping-list:data', list);
  }

  // Emit current state on startup
  emitList();

  // In a real module, you would also register REST endpoints to add/remove items.
  // The visualization would call those endpoints, and the connector would re-emit.

  // Example of how endpoint handlers might work:
  // POST /add  -> items.add({ name, checked: false, quantity: 1 }); emitList();
  // POST /toggle -> items.update(id, { checked: !current.checked }); emitList();
  // DELETE /remove -> items.remove(id); emitList();

  // For demo: add sample items if the list is empty
  if (items.list().length === 0) {
    items.add({ name: 'Milk', checked: false, quantity: 2 });
    items.add({ name: 'Bread', checked: false, quantity: 1 });
    items.add({ name: 'Eggs', checked: false, quantity: 12 });
    emitList();
  }

  return { stop() {} };
}
```

### src/visualization.tsx

```tsx
import React from 'react';
import { useConnectorData, useWidgetState, useWidgetConfig, useHubbleSDK } from '@hubble/sdk/hooks';
import type { CollectionItem } from './hubble-sdk';

interface ShoppingItem {
  name: string;
  checked: boolean;
  quantity: number;
}

export default function ShoppingListWidget() {
  const config = useWidgetConfig<{ title: string }>();
  const items = useConnectorData<CollectionItem[]>();
  const [state, setState] = useWidgetState<{ selectedId: number | null }>({
    selectedId: null,
  });
  const sdk = useHubbleSDK();

  // Hardware button to toggle the selected item
  React.useEffect(() => {
    const unsub = sdk.onButton('button1', () => {
      if (state.selectedId !== null) {
        // In practice, call the connector's toggle endpoint:
        // fetch(`/api/modules/shopping-list/toggle`, { method: 'POST', body: ... })
      }
    });
    return unsub;
  }, [sdk, state.selectedId]);

  if (!items) {
    return <div>Loading shopping list...</div>;
  }

  return (
    <div style={{ padding: '1rem' }}>
      <h3>{config.title || 'Shopping List'}</h3>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {items.map((item) => {
          const data = item.data as unknown as ShoppingItem;
          const isSelected = state.selectedId === item.id;
          return (
            <li
              key={item.id}
              onClick={() => setState({ selectedId: item.id })}
              style={{
                padding: '0.5rem',
                opacity: data.checked ? 0.5 : 1,
                textDecoration: data.checked ? 'line-through' : 'none',
                background: isSelected ? 'rgba(255,255,255,0.1)' : 'transparent',
                borderRadius: '4px',
                cursor: 'pointer',
              }}
            >
              {data.name} x{data.quantity}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
```

Key patterns:
- The connector uses `sdk.storage.collection()` for persistent ordered item storage.
- `emitList()` broadcasts the full list after every change.
- The visualization uses `useConnectorData` to auto-subscribe and re-render.
- `useWidgetState` tracks which item is selected for hardware button interaction.
- `useHubbleSDK()` gives access to `onButton` for the physical check/uncheck button.

---

## OAuth Module: Google Calendar

A module that uses OAuth to access the Google Calendar API. Demonstrates the full pattern: manifest with `oauth` field, connector using `sdk.oauth`, and provider-specific API calls isolated in the module.

### manifest.json

```json
{
  "name": "Gmail Calendar",
  "version": "0.1.0",
  "description": "Google Calendar integration displaying upcoming events",
  "type": ["connector", "visualization"],
  "oauth": {
    "provider": "google",
    "scopes": ["https://www.googleapis.com/auth/calendar.readonly"]
  },
  "visualizations": [
    { "name": "Agenda", "description": "Chronological event list", "path": "agenda" }
  ],
  "properties": [
    { "name": "clientId", "type": "secret", "required": true, "description": "Google OAuth Client ID" },
    { "name": "clientSecret", "type": "secret", "required": true, "description": "Google OAuth Client Secret" },
    { "name": "calendarId", "type": "string", "required": false, "default": "primary", "description": "Calendar ID" },
    { "name": "refreshInterval", "type": "range", "required": false, "default": 300, "min": 60, "max": 3600, "step": 60, "description": "Refresh interval (seconds)" },
    { "name": "daysAhead", "type": "number", "required": false, "default": 7, "min": 1, "max": 30, "description": "Days ahead to show" }
  ]
}
```

### connector/index.js

```javascript
const { google } = require('googleapis');

module.exports = function calendarConnector(sdk) {
  const config = sdk.getConfig();
  const refreshMs = (config.refreshInterval || 300) * 1000;
  const calendarId = config.calendarId || 'primary';
  const daysAhead = config.daysAhead || 7;

  async function fetchEvents() {
    // Check authorization status
    if (!sdk.oauth.isAuthorized()) {
      sdk.log.warn('Not authorized');
      sdk.emit('gmail-calendar:data', { events: [], error: 'Not authorized' });
      return;
    }

    // Get tokens and create a provider-specific client
    const tokens = sdk.oauth.getTokens();
    if (!tokens || !tokens.access_token) {
      sdk.emit('gmail-calendar:data', { events: [], error: 'Auth failed' });
      return;
    }

    const auth = new google.auth.OAuth2(
      config.clientId,
      config.clientSecret,
    );
    auth.setCredentials(tokens);

    const calendar = google.calendar({ version: 'v3', auth });
    const now = new Date();

    try {
      const res = await calendar.events.list({
        calendarId,
        timeMin: now.toISOString(),
        timeMax: new Date(now.getTime() + daysAhead * 86400000).toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 50,
      });

      const events = (res.data.items || []).map(ev => ({
        id: ev.id,
        title: ev.summary || '(No title)',
        start: ev.start?.dateTime || ev.start?.date,
        end: ev.end?.dateTime || ev.end?.date,
        allDay: !ev.start?.dateTime,
        location: ev.location || null,
      }));

      sdk.emit('gmail-calendar:data', { events, lastUpdated: new Date().toISOString() });
      sdk.log.info(`Fetched ${events.length} events`);
    } catch (err) {
      sdk.log.error(`Calendar API error: ${err.message}`);
      sdk.emit('gmail-calendar:data', { events: [], error: err.message });
    }
  }

  const task = sdk.schedule(refreshMs, fetchEvents);
  return { stop: task.stop };
};
```

Key patterns:
- `sdk.oauth.isAuthorized()` checks if the user has completed the OAuth flow before making API calls.
- `sdk.oauth.getTokens()` retrieves the full token object (access_token, refresh_token, etc.).
- The Google API client (`googleapis`) is a module dependency, not a Hubble core dependency.
- The module creates its own `OAuth2Client` from the stored tokens — Hubble's core is provider-agnostic.
- Error handling emits data with an `error` field so visualizations can display the state.

---

## Cross-Module: Lyrics Visualization

A visualization that reads data from the music player connector to display lyrics for the current track.

### manifest.json

```json
{
  "name": "lyrics",
  "version": "1.0.0",
  "description": "Displays lyrics for the currently playing song",
  "type": ["connector", "visualization"],
  "dependencies": [
    { "name": "music-player", "minVersion": "1.0.0" }
  ],
  "properties": [
    { "name": "lyricsApiKey", "type": "secret", "required": true, "description": "Lyrics API key" }
  ]
}
```

### src/connector.ts

The connector watches the music player's state and fetches lyrics when the track changes.

```typescript
import type { ServerSdk } from './hubble-sdk';

interface NowPlaying {
  track: string;
  artist: string;
}

export default function connector(sdk: ServerSdk) {
  const config = sdk.getConfig();
  const apiKey = config.lyricsApiKey as string;

  if (!apiKey) {
    sdk.log.warn('No lyrics API key configured');
    return;
  }

  let lastTrack = '';

  const task = sdk.schedule(5_000, async () => {
    // Read the music player's current state
    const nowPlaying = sdk.getConnectorState(
      'music-player',
      'music-player:data',
    ) as NowPlaying | null;

    if (!nowPlaying) {
      sdk.emit('lyrics:data', { lyrics: null, track: null, artist: null });
      return;
    }

    const trackKey = `${nowPlaying.artist}:${nowPlaying.track}`;
    if (trackKey === lastTrack) return; // No change
    lastTrack = trackKey;

    sdk.log.info(`Fetching lyrics for "${nowPlaying.track}" by ${nowPlaying.artist}`);

    // Check cache first
    const cached = sdk.storage.get(`lyrics:${trackKey}`) as string | null;
    if (cached) {
      sdk.emit('lyrics:data', {
        lyrics: cached,
        track: nowPlaying.track,
        artist: nowPlaying.artist,
      });
      return;
    }

    try {
      const result = (await sdk.http.get(
        `https://api.lyrics.com/v1/search?artist=${encodeURIComponent(nowPlaying.artist)}&track=${encodeURIComponent(nowPlaying.track)}&apikey=${apiKey}`,
      )) as { lyrics: string };

      // Cache the result
      sdk.storage.set(`lyrics:${trackKey}`, result.lyrics);

      sdk.emit('lyrics:data', {
        lyrics: result.lyrics,
        track: nowPlaying.track,
        artist: nowPlaying.artist,
      });
    } catch (err) {
      sdk.log.error(`Lyrics fetch failed: ${err instanceof Error ? err.message : String(err)}`);
      sdk.emit('lyrics:data', {
        lyrics: null,
        track: nowPlaying.track,
        artist: nowPlaying.artist,
      });
    }
  });

  return { stop: task.stop };
}
```

### src/visualization.tsx

```tsx
import React from 'react';
import { useConnectorData } from '@hubble/sdk/hooks';

interface LyricsData {
  lyrics: string | null;
  track: string | null;
  artist: string | null;
}

export default function LyricsWidget() {
  const data = useConnectorData<LyricsData>();

  if (!data || !data.track) {
    return (
      <div style={{ padding: '1rem', opacity: 0.5 }}>
        No music playing
      </div>
    );
  }

  return (
    <div style={{ padding: '1rem', overflow: 'auto', maxHeight: '100%' }}>
      <h3>{data.track}</h3>
      <p style={{ opacity: 0.7, marginBottom: '1rem' }}>{data.artist}</p>
      {data.lyrics ? (
        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', margin: 0 }}>
          {data.lyrics}
        </pre>
      ) : (
        <p style={{ opacity: 0.5 }}>Lyrics not found</p>
      )}
    </div>
  );
}
```

Key patterns:
- The `dependencies` field in the manifest declares the music player as a requirement.
- `sdk.getConnectorState('music-player', 'music-player:data')` reads the last known state from another module's connector without subscribing.
- The connector polls every 5 seconds and only fetches lyrics when the track changes.
- `sdk.storage.get/set` caches lyrics to avoid redundant API calls across track repeats.
- The visualization uses `useConnectorData()` with no arguments, defaulting to its own module's connector data (`lyrics:data`).

---

## Config Panels: Home Assistant Pill Widget

A hybrid module with custom config panel components for rich widget configuration. This pattern is useful when auto-generated property fields aren't sufficient — for example, entity browsers, icon pickers, or condition builders.

### manifest.json (relevant section)

```json
{
  "name": "home-assistant",
  "version": "1.0.0",
  "type": ["connector", "visualization"],
  "visualizations": [
    {
      "name": "Pill",
      "description": "Pill-shaped entity state display",
      "path": "pill",
      "configPanels": [
        { "label": "Configure", "panel": "configure" },
        { "label": "State Mapping", "panel": "state-mapping" },
        { "label": "Configure Visibility", "panel": "visibility" }
      ]
    }
  ]
}
```

### visualizations/pill/panels/configure.tsx

```tsx
import React, { useState } from 'react';

interface Props {
  config: Record<string, unknown>;
  onConfigChange: (config: Record<string, unknown>) => void;
  moduleId: number;
  moduleName: string;
}

export default function ConfigurePanel({ config, onConfigChange, moduleId }: Props) {
  const [title, setTitle] = useState((config.title as string) || '');
  const [entityId, setEntityId] = useState((config.entity_id as string) || '');

  // Fetch entities from the connector's custom endpoint
  const [entities, setEntities] = useState<Array<{ entity_id: string; friendly_name: string }>>([]);

  React.useEffect(() => {
    fetch(`/api/modules/${moduleId}/entities`)
      .then(res => res.json())
      .then(data => {
        const allEntities = data.domains?.flatMap((d: any) => d.entities) || [];
        setEntities(allEntities);
      });
  }, [moduleId]);

  const handleEntitySelect = (id: string) => {
    setEntityId(id);
    const entity = entities.find(e => e.entity_id === id);
    const newTitle = entity?.friendly_name || id;
    setTitle(newTitle);
    onConfigChange({ ...config, entity_id: id, title: newTitle });
  };

  return (
    <div>
      <h3>Select Entity</h3>
      <select value={entityId} onChange={(e) => handleEntitySelect(e.target.value)}>
        <option value="">-- Select --</option>
        {entities.map(e => (
          <option key={e.entity_id} value={e.entity_id}>{e.friendly_name}</option>
        ))}
      </select>

      <h3>Title</h3>
      <input
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          onConfigChange({ ...config, title: e.target.value });
        }}
      />
    </div>
  );
}
```

Key patterns:
- Config panels receive `{ config, onConfigChange, moduleId, moduleName }` as props.
- `onConfigChange` merges partial updates into the widget config — call it whenever the user makes a change.
- Use `moduleId` to call the connector's custom API endpoints (e.g., `/api/modules/${moduleId}/entities`).
- Panels are built as ESM bundles alongside visualizations — React and SDK are externalized via `globalThis.__hubbleExternals`.
- Multiple panels per visualization allow splitting complex config into focused sections (entity selection, state mapping, visibility conditions).

---

## YouTube API Pass-Through

A module that does nothing by default but starts playing a video when called via the API.

### manifest.json

```json
{
  "name": "youtube",
  "version": "1.0.0",
  "description": "Play YouTube videos via API command",
  "type": ["connector"],
  "endpoints": [
    {
      "name": "play",
      "method": "POST",
      "path": "/play",
      "description": "Play a YouTube video URL",
      "public": false
    },
    {
      "name": "stop",
      "method": "POST",
      "path": "/stop",
      "description": "Stop playback",
      "public": false
    },
    {
      "name": "status",
      "method": "GET",
      "path": "/status",
      "description": "Get current playback status",
      "public": true
    }
  ]
}
```

### connector/index.ts

```typescript
import { ServerSdk } from 'hubble/sdk/server';

let currentUrl: string | null = null;

export async function start(sdk: ServerSdk) {
  sdk.onApiCall(async ({ action, body }) => {
    switch (action) {
      case 'play': {
        const { url } = body as { url: string };
        currentUrl = url;
        await launchBrowser(url);
        return { ok: true, url };
      }
      case 'stop': {
        currentUrl = null;
        await closeBrowser();
        return { ok: true };
      }
      case 'status':
        return { playing: currentUrl !== null, url: currentUrl };
      default:
        return { error: `Unknown action: ${action}` };
    }
  });
}

async function launchBrowser(url: string) {
  // platform-specific implementation
}

async function closeBrowser() {
  // platform-specific implementation
}
```

**Usage (via Home Assistant):**

```yaml
action: rest_command.hubble_play_youtube
data:
  url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
```

```yaml
rest_command:
  hubble_play_youtube:
    url: "http://hubble.local:3000/api/module/youtube/api/play"
    method: POST
    headers:
      x-api-key: "your-api-key"
      Content-Type: application/json
    payload: '{"url": "{{ url }}"}'
```
