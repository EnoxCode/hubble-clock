# Testing & Linting Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add Vitest unit tests for `getDayDiff` and ESLint linting to the hubble-clock module, integrated into CI.

**Architecture:** Extract the pure `getDayDiff` function from `visualizations/timezone-grid/index.tsx` into a testable `utils.ts`. Add Vitest + ESLint as devDependencies with minimal config. Update the GitHub Actions CI workflow to gate on lint and test.

**Tech Stack:** Vitest, ESLint (flat config), @typescript-eslint, eslint-plugin-react-hooks

---

## File Map

| File | Action | Responsibility |
|---|---|---|
| `visualizations/timezone-grid/utils.ts` | Create | Pure `getDayDiff` function |
| `visualizations/timezone-grid/utils.test.ts` | Create | Unit tests for `getDayDiff` |
| `visualizations/timezone-grid/index.tsx` | Modify | Import `getDayDiff` from `./utils` |
| `vitest.config.ts` | Create | Test runner config (globals, node env) |
| `eslint.config.js` | Create | Flat ESLint config (TS + React Hooks) |
| `package.json` | Modify | Add devDeps + `test` and `lint` scripts |
| `.github/workflows/ci.yml` | Modify | Add lint + test steps before build |

---

## Chunk 1: Tooling, Tests, and getDayDiff Extraction

### Task 1: Install devDependencies

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install all new devDependencies in one command**

```bash
npm install --save-dev vitest @typescript-eslint/eslint-plugin @typescript-eslint/parser eslint eslint-plugin-react-hooks
```

Expected: `package.json` devDependencies now lists all five packages alongside `esbuild`.

- [ ] **Step 2: Verify install succeeded**

```bash
ls node_modules/.bin/vitest node_modules/.bin/eslint
```

Expected: both paths exist without error.

---

### Task 2: Create vitest.config.ts

**Files:**
- Create: `vitest.config.ts`

- [ ] **Step 1: Create the config file**

```ts
// vitest.config.ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

---

### Task 3: Add scripts to package.json

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Add `test` and `lint` scripts**

In `package.json`, update the `"scripts"` block to:

```json
"scripts": {
  "build": "create-hubble-module build",
  "validate": "create-hubble-module validate",
  "dev": "create-hubble-module dev",
  "test": "vitest run",
  "lint": "eslint ."
}
```

- [ ] **Step 2: Verify scripts are registered**

```bash
npm run test -- --help
```

Expected: Vitest help output printed.

- [ ] **Step 3: Commit tooling setup**

```bash
git add package.json package-lock.json vitest.config.ts
git commit -m "chore: install vitest and eslint, add test and lint scripts"
```

---

### Task 4: Create utils.ts with a stub getDayDiff

**Files:**
- Create: `visualizations/timezone-grid/utils.ts`

The current `getDayDiff` in `index.tsx` uses the implicit system local timezone, which makes test results vary by machine. The refactored version accepts an optional `localTz` parameter so tests can be fully explicit.

- [ ] **Step 1: Create the file with a stub that always returns 0**

```ts
// visualizations/timezone-grid/utils.ts

/**
 * Calculate the day difference between a target timezone and a reference local timezone.
 * Returns positive if tz is ahead, negative if behind, 0 if same day.
 *
 * @param now - The current date/time to compare
 * @param tz - IANA timezone string of the target timezone
 * @param localTz - IANA timezone string of the reference (local) timezone. Defaults to system timezone.
 */
export function getDayDiff(
  now: Date,
  tz: string,
  localTz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): number {
  return 0; // stub — tests will fail
}
```

---

### Task 5: Write failing tests

**Files:**
- Create: `visualizations/timezone-grid/utils.test.ts`

- [ ] **Step 1: Create the test file**

```ts
// visualizations/timezone-grid/utils.test.ts
import { describe, it, expect } from 'vitest';
import { getDayDiff } from './utils';

describe('getDayDiff', () => {
  // Fixed anchor: 2024-01-15 12:00 UTC
  // At this moment:
  //   UTC          → 2024-01-15 (same day as UTC reference)
  //   Europe/Amsterdam (UTC+1) → 2024-01-15 13:00 (same day)
  //   America/New_York (UTC-5) → 2024-01-15 07:00 (same day)
  //   Pacific/Auckland (UTC+13) → 2024-01-16 01:00 (next day)
  //   Pacific/Honolulu (UTC-10) → 2024-01-15 02:00 (same day)
  const anchor = new Date('2024-01-15T12:00:00Z');

  // For a date where UTC-5 is already on the previous day:
  // 2024-01-15 02:00 UTC → America/New_York (UTC-5) = 2024-01-14 21:00
  const anchorLateNight = new Date('2024-01-15T02:00:00Z');

  it('returns 0 when target timezone is on the same day as the local timezone', () => {
    expect(getDayDiff(anchor, 'Europe/Amsterdam', 'UTC')).toBe(0);
  });

  it('returns 0 when target and local are the same timezone', () => {
    expect(getDayDiff(anchor, 'UTC', 'UTC')).toBe(0);
  });

  it('returns +1 when target timezone is one day ahead of local', () => {
    // Pacific/Auckland at 12:00 UTC is already Jan 16
    expect(getDayDiff(anchor, 'Pacific/Auckland', 'UTC')).toBe(1);
  });

  it('returns -1 when target timezone is one day behind local', () => {
    // At 02:00 UTC on Jan 15, New York (UTC-5) is still Jan 14
    expect(getDayDiff(anchorLateNight, 'America/New_York', 'UTC')).toBe(-1);
  });

  // Note: a ±2 day difference is not possible with real IANA timezones.
  // The full UTC offset range is +14 (Pacific/Kiritimati) to -12 (Etc/GMT+12) = 26h,
  // which means the maximum real-world difference between any two timezones is ±1 day.
});
```

- [ ] **Step 2: Run tests and confirm they fail**

```bash
npm run test
```

Expected: 2 tests fail. The stub returns `0` for all inputs, so the two tests that expect `0` pass ("same day" and "same timezone"), while the `+1` Auckland and `-1` New York tests fail.

---

### Task 6: Implement getDayDiff in utils.ts

**Files:**
- Modify: `visualizations/timezone-grid/utils.ts`

- [ ] **Step 1: Replace the entire file content with the real implementation (preserving the JSDoc)**

```ts
// visualizations/timezone-grid/utils.ts

/**
 * Calculate the day difference between a target timezone and a reference local timezone.
 * Returns positive if tz is ahead, negative if behind, 0 if same day.
 *
 * @param now - The current date/time to compare
 * @param tz - IANA timezone string of the target timezone
 * @param localTz - IANA timezone string of the reference (local) timezone. Defaults to system timezone.
 */
export function getDayDiff(
  now: Date,
  tz: string,
  localTz: string = Intl.DateTimeFormat().resolvedOptions().timeZone,
): number {
  const fmt = (timeZone: string) =>
    new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(now);

  const localDate = new Date(fmt(localTz));
  const tzDate = new Date(fmt(tz));
  return Math.round((tzDate.getTime() - localDate.getTime()) / 86400000);
}
```

- [ ] **Step 2: Run tests and confirm all pass**

```bash
npm run test
```

Expected output:
```
✓ visualizations/timezone-grid/utils.test.ts (4 tests)
Test Files  1 passed (1)
Tests  4 passed (4)
```

---

### Task 7: Update index.tsx to use utils.ts

**Files:**
- Modify: `visualizations/timezone-grid/index.tsx`

- [ ] **Step 1: Remove the inline getDayDiff function and import from utils**

In `visualizations/timezone-grid/index.tsx`:

1. Delete this exact block (lines 14–20):

```ts
function getDayDiff(now: Date, tz: string): number {
  const localDay = new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const tzDay = new Intl.DateTimeFormat('en-CA', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const localDate = new Date(localDay);
  const tzDate = new Date(tzDay);
  return Math.round((tzDate.getTime() - localDate.getTime()) / 86400000);
}
```

2. Add this import at the top with the other imports:

```ts
import { getDayDiff } from './utils';
```

The call site `getDayDiff(now, entry.tz)` on line 51 remains unchanged — the default `localTz` parameter handles system timezone automatically.

- [ ] **Step 2: Run tests again to confirm nothing broke**

```bash
npm run test
```

Expected: 4 passed, same as before.

- [ ] **Step 3: Commit**

```bash
git add visualizations/timezone-grid/utils.ts visualizations/timezone-grid/utils.test.ts visualizations/timezone-grid/index.tsx
git commit -m "test: extract getDayDiff to utils.ts and add unit tests"
```

---

## Chunk 2: ESLint and CI

### Task 8: Create ESLint flat config

**Files:**
- Create: `eslint.config.js`

- [ ] **Step 1: Create the config file**

```js
// eslint.config.js
import tsPlugin from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import reactHooksPlugin from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/', '.superpowers/', 'node_modules/'],
  },
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        ecmaVersion: 2020,
        sourceType: 'module',
      },
    },
    plugins: {
      '@typescript-eslint': tsPlugin,
      'react-hooks': reactHooksPlugin,
    },
    rules: {
      ...tsPlugin.configs.recommended.rules,
      ...reactHooksPlugin.configs.recommended.rules,
    },
  },
];
```

- [ ] **Step 2: Run lint and check for errors**

```bash
npm run lint
```

Expected: exits 0 with no errors. If there are errors, fix them before committing.

Common fixes needed:
- `@typescript-eslint/no-explicit-any` — replace `any` with a specific type
- `@typescript-eslint/no-unused-vars` — remove or prefix with `_`
- `react-hooks/exhaustive-deps` — add missing hook dependencies. For `useEffect` with a stable SDK ref, wrap the handler in `useCallback` rather than adding the SDK object directly (adding mutable objects to deps causes re-render loops)

- [ ] **Step 3: Commit**

Note: `package.json` and `package-lock.json` were already committed in Task 3. Only include them here if lint fixes required additional changes to those files.

```bash
git add eslint.config.js
git commit -m "chore: add ESLint with TypeScript and React Hooks rules"
```

---

### Task 9: Update CI workflow

**Files:**
- Modify: `.github/workflows/ci.yml`

- [ ] **Step 1: Add lint and test steps after npm install, before build**

Replace the contents of `.github/workflows/ci.yml` with:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  ci:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - run: npm run lint
      - run: npm run test
      - run: npm run build
      - run: npm run validate
```

- [ ] **Step 2: Verify the workflow file is valid YAML**

```bash
node -e "const fs = require('fs'); console.log('YAML readable:', fs.readFileSync('.github/workflows/ci.yml', 'utf8').length + ' bytes')"
```

Expected: prints byte count without error.

- [ ] **Step 3: Commit**

```bash
git add .github/workflows/ci.yml
git commit -m "ci: add lint and test steps to CI workflow"
```

---

## Verification

After all tasks complete:

1. `npm run lint` — exits 0, no errors
2. `npm run test` — 4 tests pass in `utils.test.ts`
3. Push to a branch → CI runs lint + test before build, all green
4. Introduce a deliberate bug in `getDayDiff` (e.g., change `86400000` to `86400`) → `npm run test` fails with a descriptive message
