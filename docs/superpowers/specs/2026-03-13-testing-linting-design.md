# Testing & Linting — Design Spec

**Date:** 2026-03-13
**Status:** Approved

## Context

The hubble-clock module has two visualizations (Big Clock, Timezone Grid) written in TypeScript/React. No testing or linting infrastructure exists. This spec adds Vitest for unit testing pure logic, ESLint for static analysis, and integrates both into the existing GitHub Actions CI workflow.

The goal is focused: test extractable pure functions (specifically `getDayDiff`), not React component rendering. This avoids the complexity of mocking the Hubble SDK while still covering the logic most likely to contain bugs.

---

## Approach

- **Test framework:** Vitest — native ESM/TypeScript support, no transform config needed, same API as Jest
- **Linting:** ESLint flat config with TypeScript and React Hooks plugins
- **No Prettier** — formatting tooling adds friction without meaningful benefit for a single-developer module

---

## Changes

### 1. Extract `getDayDiff` into `utils.ts`

Move the `getDayDiff` function out of `visualizations/timezone-grid/index.tsx` into a sibling file:

**`visualizations/timezone-grid/utils.ts`**

```ts
export function getDayDiff(now: Date, tz: string): number {
  const fmt = (timeZone?: string) =>
    new Intl.DateTimeFormat('en-CA', {
      ...(timeZone ? { timeZone } : {}),
      year: 'numeric', month: '2-digit', day: '2-digit',
    }).format(now);

  const localDate = new Date(fmt());
  const tzDate = new Date(fmt(tz));
  return Math.round((tzDate.getTime() - localDate.getTime()) / 86400000);
}
```

Update `visualizations/timezone-grid/index.tsx` to import from `./utils`.

### 2. Unit Tests

**`visualizations/timezone-grid/utils.test.ts`**

Test cases for `getDayDiff`:
- Same timezone as local → diff is 0
- Timezone 1 day ahead → diff is +1
- Timezone 1 day behind → diff is -1
- Edge: timezone 2 days ahead → diff is +2

Tests use a fixed `Date` to make assertions deterministic.

### 3. Vitest Config

**`vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
  },
});
```

### 4. ESLint Config

**`eslint.config.js`**

Flat config using:
- `@typescript-eslint/eslint-plugin` + parser
- `eslint-plugin-react-hooks`
- Ignores: `dist/`, `.superpowers/`, `node_modules/`

### 5. package.json Updates

New devDependencies:
- `vitest`
- `eslint`
- `@typescript-eslint/eslint-plugin`
- `@typescript-eslint/parser`
- `eslint-plugin-react-hooks`

New scripts:
- `"test": "vitest run"`
- `"lint": "eslint ."`

### 6. CI Integration

Update `.github/workflows/ci.yml` to add lint and test steps after `npm install` and before build:

```yaml
- name: Lint
  run: npm run lint
- name: Test
  run: npm run test
```

---

## Verification

1. `npm run lint` — runs ESLint across all `.ts`/`.tsx` files, exits 0 with no errors
2. `npm run test` — Vitest runs `utils.test.ts`, all cases pass
3. Push to a branch → CI runs lint + test steps and passes
4. Introduce a deliberate bug in `getDayDiff` → test fails as expected
