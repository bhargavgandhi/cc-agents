# Hudson Hex City — Phase 1 (Engine) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add the engine behaviour the Hudson Hex City needs, and ship a placeholder city you can import and run locally. The behaviour is: Area kinds, leisure-biased idle wandering, bike/boat travel modes, a skyline backdrop over water, island sides, and a 96×96 grid.

**Architecture:** All rules live in one pure, DOM-free module (`office/engine/cityRules.ts`) that is unit-tested on the Node runner.

- `OfficeState` derives a per-tile area-kind grid from the layout and hands a small `CityNav` object to the character FSM.
- The renderer draws three new things, only when the layout names a backdrop: water fill, skyline image, island sides. It also draws bike/boat overlays for characters whose `travelMode` is set.
- The protocol, the server, and the bundled default layout don't change. The city ships as an importable layout so the e2e suite keeps running on today's default.

**Tech Stack:** TypeScript, React 19, Canvas 2D, Vite, Vitest (Node environment), pngjs (art script).

**Spec:** `docs/superpowers/specs/2026-10-04-hudson-hex-city-design.md`

**Deviation from spec (deliberate):**

- **Island side colour.** The spec says "darker shade of the tile colour". v1 uses two fixed colours (`ISLAND_SIDE_COLOR`, `ISLAND_SHADOW_COLOR`), which is simpler, and every island in the city has the same rim anyway.
- **Layout swap moves to Phase 3.** Replacing the default layout belongs with the e2e work.

---

## File map

| File                                                                                                                   | Status                 | Responsibility                                                                                                     |
| ---------------------------------------------------------------------------------------------------------------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `webview-ui/src/constants.ts`                                                                                          | modify                 | `MAX_COLS/ROWS` → 96; city constants (bias, speed multipliers, island/backdrop colours)                            |
| `webview-ui/src/office/types.ts`                                                                                       | modify                 | `AreaKind`, `AreaDefinition.kind`, `LayoutBackdrop`, `OfficeLayout.backdrop`, `TravelMode`, `Character.travelMode` |
| `webview-ui/src/office/engine/cityRules.ts`                                                                            | **create**             | Pure rules: area-kind grid, leisure tiles, wander pick, travel mode, speed, island edge                            |
| `webview-ui/src/office/engine/characters.ts`                                                                           | modify                 | Optional `CityNav` param: leisure wander + travel-mode speed + `ch.travelMode`                                     |
| `webview-ui/src/office/engine/officeState.ts`                                                                          | modify                 | Build `cityNav` in constructor / `rebuildFromLayout`; pass to FSM                                                  |
| `webview-ui/src/office/sprites/travelSprites.ts`                                                                       | **create**             | Placeholder bike + boat `SpriteData`                                                                               |
| `webview-ui/src/office/backdrops.ts`                                                                                   | **create**             | Backdrop registry + image cache (`new URL(..., import.meta.url)`)                                                  |
| `webview-ui/src/assets/backdrops/hudson.png`                                                                           | **create** (generated) | Placeholder dusk sky + NJ/NYC skylines                                                                             |
| `webview-ui/src/office/engine/renderer.ts`                                                                             | modify                 | Backdrop pass, island sides, travel overlays, hide lane labels                                                     |
| `webview-ui/src/office/components/OfficeCanvas.tsx`                                                                    | modify                 | Pass backdrop + area kinds to `renderFrame`                                                                        |
| `webview-ui/src/office/editor/editorActions.ts`                                                                        | modify                 | `updateAreaKind`                                                                                                   |
| `webview-ui/src/hooks/useEditorActions.ts`, `webview-ui/src/office/editor/EditorToolbar.tsx`, `webview-ui/src/App.tsx` | modify                 | Kind picker on each Area card                                                                                      |
| `scripts/art/backdrop-hudson.cjs`                                                                                      | **create**             | Generates the placeholder backdrop PNG                                                                             |
| `scripts/art/city-layout.cjs`                                                                                          | **create**             | Generates `webview-ui/public/assets/layouts/hudson-city-preview.json`                                              |
| `webview-ui/test/cityRules.test.ts`                                                                                    | **create**             | Unit tests for every `cityRules` export                                                                            |
| `webview-ui/test/cityCharacters.test.ts`                                                                               | **create**             | FSM tests: bike speed, travelMode set/cleared, leisure wander                                                      |
| `webview-ui/test/areaKind.test.ts`                                                                                     | **create**             | `updateAreaKind` + migration round-trip keeps `kind`/`backdrop`                                                    |

---

### Task 1: Constants and types

**Files:** Modify `webview-ui/src/constants.ts:7-8` and append a section. Modify `webview-ui/src/office/types.ts:141-166`, `:254`.

- [ ] **Step 1: Raise the grid cap and add city constants**

In `webview-ui/src/constants.ts` replace

```ts
export const MAX_COLS = 64;
export const MAX_ROWS = 64;
```

with

```ts
export const MAX_COLS = 96;
export const MAX_ROWS = 96;
```

and append at the end of the file:

```ts
// ── City (Hudson Hex City theme) ────────────────────────────
/** Probability an idle agent's next wander target is inside a `leisure` Area. */
export const LEISURE_WANDER_BIAS = 0.7;
/** Walk-speed multipliers while on `bikeLane` / `ferry` Area tiles. */
export const BIKE_SPEED_MULT = 2;
export const BOAT_SPEED_MULT = 1.5;
/** Island side face height (sprite px) drawn under tiles whose south neighbour is water. */
export const ISLAND_SIDE_PX = 6;
export const ISLAND_SIDE_COLOR = '#46392f';
export const ISLAND_SIDE_DARK_COLOR = '#2f261f';
export const ISLAND_SHADOW_COLOR = 'rgba(10, 14, 40, 0.35)';
export const ISLAND_SHADOW_PX = 4;
/** Water fill behind a layout that names a backdrop. */
export const BACKDROP_WATER_COLOR = '#2f4176';
/** Sky fill above the backdrop image. */
export const BACKDROP_SKY_COLOR = '#232046';
/** Horizontal parallax factor of the skyline (0 = fixed to screen, 1 = fixed to map). */
export const BACKDROP_PARALLAX = 0.3;
```

- [ ] **Step 2: Add the types**

In `webview-ui/src/office/types.ts` replace the `AreaDefinition` interface with:

```ts
/** What an Area is for. Absent = a plain folder-mapping Area (pre-city behaviour). */
export type AreaKind = 'work' | 'leisure' | 'bikeLane' | 'ferry';

export interface AreaDefinition {
  /** Stable label used as the FK in `areaTiles` and `OfficeState.areaMappings`. */
  label: string;
  /** Hex color (e.g. "#ff6b6b"). RGB only — alpha applied at render time. */
  color: string;
  /** Optional purpose. Layouts without it behave exactly as before. */
  kind?: AreaKind;
}

/** A skyline image drawn behind the map, over a water fill. */
export interface LayoutBackdrop {
  /** Key into the bundled backdrop registry (office/backdrops.ts). */
  id: string;
  /** Map row the bottom edge of the skyline image sits on. */
  horizonRow: number;
}

/** How a character is currently moving. Drives sprite overlay + speed. */
export type TravelMode = 'walk' | 'bike' | 'boat';
```

In `OfficeLayout`, after `areaTiles?: ...;` add:

```ts
  /** Optional skyline backdrop. When set, VOID renders as water and islands get sides. */
  backdrop?: LayoutBackdrop;
```

In `Character`, after `maxContextTokens: number;` add:

```ts

  // -- City travel --
  /** Set by the FSM while walking across bike-lane / ferry tiles; absent = walking. */
  travelMode?: TravelMode;
```

- [ ] **Step 3: Typecheck**

Run: `cd webview-ui && npx tsc --noEmit -p tsconfig.app.json`
Expected: exit 0 (types are additive and optional).

- [ ] **Step 4: Commit**

```bash
git add webview-ui/src/constants.ts webview-ui/src/office/types.ts
git commit -m "feat(city): add area kinds, backdrop and travel-mode types; raise grid cap to 96"
```

---

### Task 2: Pure city rules (TDD)

**Files:** Create `webview-ui/src/office/engine/cityRules.ts`. Test `webview-ui/test/cityRules.test.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert/strict';

import { test } from 'vitest';

import {
  buildAreaKindGrid,
  isIslandEdgeTile,
  leisureTilesOf,
  pickWanderTarget,
  speedMultiplier,
  travelModeAt,
} from '../src/office/engine/cityRules.js';
import type { OfficeLayout, TileType as TileTypeVal } from '../src/office/types.js';
import { TileType } from '../src/office/types.js';

const F = TileType.FLOOR_1;
const V = TileType.VOID;

function layout3x3(areaTiles: Array<string | null>): OfficeLayout {
  return {
    version: 1,
    cols: 3,
    rows: 3,
    tiles: new Array(9).fill(F),
    furniture: [],
    areas: [
      { label: 'Cafe', color: '#ffffff', kind: 'leisure' },
      { label: 'Bridge', color: '#ffffff', kind: 'bikeLane' },
      { label: 'Ferry', color: '#ffffff', kind: 'ferry' },
      { label: 'Repo', color: '#ffffff' },
    ],
    areaTiles,
  };
}

test('buildAreaKindGrid maps each tile to its Area kind, null when unlabeled or kindless', () => {
  const grid = buildAreaKindGrid(
    layout3x3(['Cafe', 'Bridge', 'Ferry', 'Repo', null, null, null, null, 'Ghost']),
  );
  assert.deepEqual(grid, ['leisure', 'bikeLane', 'ferry', null, null, null, null, null, null]);
});

test('buildAreaKindGrid is all-null for a layout without areas', () => {
  const l = layout3x3(new Array(9).fill(null));
  delete l.areas;
  delete l.areaTiles;
  assert.deepEqual(buildAreaKindGrid(l), new Array(9).fill(null));
});

test('leisureTilesOf keeps only walkable tiles inside leisure Areas', () => {
  const kinds = buildAreaKindGrid(
    layout3x3(['Cafe', 'Cafe', null, null, null, null, null, null, null]),
  );
  const walkable = [
    { col: 0, row: 0 },
    { col: 2, row: 2 },
  ];
  assert.deepEqual(leisureTilesOf(walkable, kinds, 3), [{ col: 0, row: 0 }]);
});

test('pickWanderTarget uses the leisure list when the roll is under the bias', () => {
  const walkable = [
    { col: 0, row: 0 },
    { col: 1, row: 1 },
  ];
  const leisure = [{ col: 2, row: 2 }];
  const rolls = [0.1, 0.0];
  const rng = () => rolls.shift() ?? 0;
  assert.deepEqual(pickWanderTarget(walkable, leisure, 0.7, rng), { col: 2, row: 2 });
});

test('pickWanderTarget falls back to any walkable tile when the roll is over the bias', () => {
  const walkable = [
    { col: 0, row: 0 },
    { col: 1, row: 1 },
  ];
  const leisure = [{ col: 2, row: 2 }];
  const rolls = [0.9, 0.6];
  const rng = () => rolls.shift() ?? 0;
  assert.deepEqual(pickWanderTarget(walkable, leisure, 0.7, rng), { col: 1, row: 1 });
});

test('pickWanderTarget ignores the bias when there are no leisure tiles, and returns null on empty', () => {
  const rng = () => 0;
  assert.deepEqual(pickWanderTarget([{ col: 4, row: 4 }], [], 0.7, rng), { col: 4, row: 4 });
  assert.equal(pickWanderTarget([], [], 0.7, rng), null);
});

test('travelModeAt reads bike/boat from lane kinds and walk elsewhere or out of bounds', () => {
  const kinds = buildAreaKindGrid(
    layout3x3(['Bridge', 'Ferry', 'Cafe', null, null, null, null, null, null]),
  );
  assert.equal(travelModeAt(0, 0, kinds, 3), 'bike');
  assert.equal(travelModeAt(1, 0, kinds, 3), 'boat');
  assert.equal(travelModeAt(2, 0, kinds, 3), 'walk');
  assert.equal(travelModeAt(5, 5, kinds, 3), 'walk');
});

test('speedMultiplier: bike 2, boat 1.5, walk 1', () => {
  assert.equal(speedMultiplier('bike'), 2);
  assert.equal(speedMultiplier('boat'), 1.5);
  assert.equal(speedMultiplier('walk'), 1);
});

test('isIslandEdgeTile: ground over VOID, ferry or the map edge is an edge; water itself is not', () => {
  const tileMap: TileTypeVal[][] = [
    [F, F, F],
    [F, V, F],
    [V, V, F],
  ];
  const kinds = buildAreaKindGrid(
    layout3x3([null, null, null, null, null, 'Ferry', null, null, null]),
  );
  assert.equal(isIslandEdgeTile(tileMap, kinds, 0, 0), false); // south is ground
  assert.equal(isIslandEdgeTile(tileMap, kinds, 1, 0), true); // south is VOID
  assert.equal(isIslandEdgeTile(tileMap, kinds, 2, 0), true); // south (2,1) is a ferry tile
  assert.equal(isIslandEdgeTile(tileMap, kinds, 2, 1), false); // a ferry tile is water, never an edge
  assert.equal(isIslandEdgeTile(tileMap, kinds, 2, 2), true); // bottom row of the map
  assert.equal(isIslandEdgeTile(tileMap, kinds, 1, 1), false); // VOID is never an edge
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `cd webview-ui && npx vitest run test/cityRules.test.ts`
Expected: FAIL — cannot resolve `../src/office/engine/cityRules.js`.

- [ ] **Step 3: Implement**

Create `webview-ui/src/office/engine/cityRules.ts`:

```ts
/**
 * Pure rules for the city theme: Area kinds, idle wandering, travel modes and
 * island edges. DOM-free and side-effect-free so the Node test runner covers it.
 */
import { BIKE_SPEED_MULT, BOAT_SPEED_MULT } from '../../constants.js';
import type { AreaKind, OfficeLayout, TileType as TileTypeVal, TravelMode } from '../types.js';
import { TileType } from '../types.js';

type Tile = { col: number; row: number };

/** Per-tile Area kind (row-major, `cols` wide). null = no Area, or an Area without a kind. */
export function buildAreaKindGrid(layout: OfficeLayout): Array<AreaKind | null> {
  const size = layout.cols * layout.rows;
  const grid: Array<AreaKind | null> = new Array(size).fill(null);
  const tiles = layout.areaTiles;
  if (!tiles || !layout.areas) return grid;
  const kindByLabel = new Map<string, AreaKind>();
  for (const a of layout.areas) if (a.kind) kindByLabel.set(a.label, a.kind);
  for (let i = 0; i < size; i++) {
    const label = tiles[i];
    if (label) grid[i] = kindByLabel.get(label) ?? null;
  }
  return grid;
}

/** Walkable tiles that sit inside a `leisure` Area. */
export function leisureTilesOf(
  walkable: Tile[],
  kinds: Array<AreaKind | null>,
  cols: number,
): Tile[] {
  return walkable.filter((t) => kinds[t.row * cols + t.col] === 'leisure');
}

/** Next idle wander target: a leisure tile with probability `bias`, else any walkable tile. */
export function pickWanderTarget(
  walkable: Tile[],
  leisure: Tile[],
  bias: number,
  rng: () => number = Math.random,
): Tile | null {
  if (leisure.length > 0 && rng() < bias) {
    return leisure[Math.floor(rng() * leisure.length)];
  }
  if (walkable.length === 0) return null;
  return walkable[Math.floor(rng() * walkable.length)];
}

/** Travel mode on a tile: bike on bike-lane tiles, boat on ferry tiles, walk elsewhere. */
export function travelModeAt(
  col: number,
  row: number,
  kinds: Array<AreaKind | null>,
  cols: number,
): TravelMode {
  if (col < 0 || row < 0 || col >= cols) return 'walk';
  const kind = kinds[row * cols + col];
  if (kind === 'bikeLane') return 'bike';
  if (kind === 'ferry') return 'boat';
  return 'walk';
}

export function speedMultiplier(mode: TravelMode): number {
  if (mode === 'bike') return BIKE_SPEED_MULT;
  if (mode === 'boat') return BOAT_SPEED_MULT;
  return 1;
}

/** Ground tile whose south neighbour is water (VOID or ferry) or off the map. Draws an island side. */
export function isIslandEdgeTile(
  tileMap: TileTypeVal[][],
  kinds: Array<AreaKind | null>,
  col: number,
  row: number,
): boolean {
  const cols = tileMap[0]?.length ?? 0;
  const tile = tileMap[row]?.[col];
  if (tile === undefined || tile === TileType.VOID) return false;
  if (kinds[row * cols + col] === 'ferry') return false;
  const below = tileMap[row + 1]?.[col];
  if (below === undefined || below === TileType.VOID) return true;
  return kinds[(row + 1) * cols + col] === 'ferry';
}
```

- [ ] **Step 4: Run tests**

Run: `cd webview-ui && npx vitest run test/cityRules.test.ts`
Expected: 9 passed.

- [ ] **Step 5: Commit**

```bash
git add webview-ui/src/office/engine/cityRules.ts webview-ui/test/cityRules.test.ts
git commit -m "feat(city): pure rules for area kinds, wander targets, travel modes and island edges"
```

---

### Task 3: Character FSM uses the city rules (TDD)

**Files:** Modify `webview-ui/src/office/engine/characters.ts` (signature at :92, wander pick at :189-207, walk step at :213-291). Test `webview-ui/test/cityCharacters.test.ts`.

- [ ] **Step 1: Write the failing tests**

```ts
import assert from 'node:assert/strict';

import { test } from 'vitest';

import { buildAreaKindGrid } from '../src/office/engine/cityRules.js';
import type { CityNav } from '../src/office/engine/characters.js';
import { createCharacter, updateCharacter } from '../src/office/engine/characters.js';
import type { OfficeLayout, TileType as TileTypeVal } from '../src/office/types.js';
import { CharacterState, TileType } from '../src/office/types.js';

const F = TileType.FLOOR_1;

/** 4×1 strip: tiles 1–2 are a bike lane. */
function strip(): { tileMap: TileTypeVal[][]; nav: CityNav } {
  const layout: OfficeLayout = {
    version: 1,
    cols: 4,
    rows: 1,
    tiles: [F, F, F, F],
    furniture: [],
    areas: [{ label: 'Bridge', color: '#ffffff', kind: 'bikeLane' }],
    areaTiles: [null, 'Bridge', 'Bridge', null],
  };
  return {
    tileMap: [[F, F, F, F]],
    nav: { kinds: buildAreaKindGrid(layout), cols: 4, leisureTiles: [] },
  };
}

function walker(col: number, path: Array<{ col: number; row: number }>) {
  const ch = createCharacter(1, 0, null, null);
  ch.tileCol = col;
  ch.tileRow = 0;
  ch.x = col * 16 + 8;
  ch.y = 8;
  ch.isActive = false;
  ch.state = CharacterState.WALK;
  ch.path = path;
  ch.moveProgress = 0;
  return ch;
}

test('a character on a bike-lane tile moves twice as far per tick and is marked as biking', () => {
  const { tileMap, nav } = strip();
  const onLane = walker(1, [{ col: 2, row: 0 }]);
  const offLane = walker(0, [{ col: 1, row: 0 }]);
  updateCharacter(onLane, 0.1, [], new Map(), tileMap, new Set(), nav);
  updateCharacter(offLane, 0.1, [], new Map(), tileMap, new Set(), nav);
  assert.ok(Math.abs(onLane.moveProgress - offLane.moveProgress * 2) < 1e-9);
  assert.equal(onLane.travelMode, 'bike');
  assert.equal(offLane.travelMode, undefined);
});

test('travelMode clears once the character stops walking', () => {
  const { tileMap, nav } = strip();
  const ch = walker(1, []);
  ch.travelMode = 'bike';
  updateCharacter(ch, 0.1, [], new Map(), tileMap, new Set(), nav);
  assert.equal(ch.state, CharacterState.IDLE);
  assert.equal(ch.travelMode, undefined);
});

test('without CityNav the FSM behaves exactly as before (no travelMode)', () => {
  const { tileMap } = strip();
  const ch = walker(1, [{ col: 2, row: 0 }]);
  updateCharacter(ch, 0.1, [], new Map(), tileMap, new Set());
  assert.equal(ch.travelMode, undefined);
});

test('an idle character heads for a leisure tile when the city nav offers one', () => {
  const { tileMap, nav } = strip();
  nav.leisureTiles = [{ col: 3, row: 0 }];
  const ch = walker(0, []);
  ch.state = CharacterState.IDLE;
  ch.wanderTimer = 0;
  ch.wanderCount = 0;
  ch.wanderLimit = 99;
  const walkable = [{ col: 1, row: 0 }];
  const orig = Math.random;
  Math.random = () => 0; // roll under the bias, first leisure tile
  try {
    updateCharacter(ch, 0.1, walkable, new Map(), tileMap, new Set(), nav);
  } finally {
    Math.random = orig;
  }
  assert.equal(ch.state, CharacterState.WALK);
  assert.deepEqual(ch.path[ch.path.length - 1], { col: 3, row: 0 });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `cd webview-ui && npx vitest run test/cityCharacters.test.ts`
Expected: FAIL — `CityNav` is not exported; `updateCharacter` ignores a 7th argument, so `travelMode` stays undefined.

- [ ] **Step 3: Implement**

In `characters.ts` add to the constants import: `LEISURE_WANDER_BIAS,`. Add after the `findPath` import:

```ts
import { pickWanderTarget, speedMultiplier, travelModeAt } from './cityRules.js';
```

Change the type import to include `AreaKind`:

```ts
import type { AreaKind, Character, Seat, SpriteData, TileType as TileTypeVal } from '../types.js';
```

Above `createCharacter` add:

```ts
/** City-theme navigation data, derived once per layout by OfficeState. */
export interface CityNav {
  /** Per-tile Area kind (row-major). */
  kinds: Array<AreaKind | null>;
  cols: number;
  /** Walkable tiles inside `leisure` Areas — preferred idle wander targets. */
  leisureTiles: Array<{ col: number; row: number }>;
}
```

Extend the `updateCharacter` signature with a last optional parameter:

```ts
  blockedTiles: Set<string>,
  nav?: CityNav,
): void {
```

Replace the wander pick block (`if (walkableTiles.length > 0) { const target = walkableTiles[Math.floor(...)]; ...`) opening lines with:

```ts
        const target = nav
          ? pickWanderTarget(walkableTiles, nav.leisureTiles, LEISURE_WANDER_BIAS)
          : walkableTiles.length > 0
            ? walkableTiles[Math.floor(Math.random() * walkableTiles.length)]
            : null;
        if (target) {
```

(keep the existing body — `findPath(...)` through `ch.wanderCount++;` — and its closing brace unchanged).

In the WALK case, inside `if (ch.path.length === 0) {` right after `ch.y = center.y;` add:

```ts
ch.travelMode = undefined;
```

Replace

```ts
ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * dt;
```

with

```ts
const mode = nav ? travelModeAt(ch.tileCol, ch.tileRow, nav.kinds, nav.cols) : 'walk';
ch.travelMode = mode === 'walk' ? undefined : mode;
ch.moveProgress += (WALK_SPEED_PX_PER_SEC / TILE_SIZE) * speedMultiplier(mode) * dt;
```

- [ ] **Step 4: Run tests**

Run: `cd webview-ui && npx vitest run test/cityCharacters.test.ts test/cityRules.test.ts`
Expected: 13 passed.

- [ ] **Step 5: Commit**

```bash
git add webview-ui/src/office/engine/characters.ts webview-ui/test/cityCharacters.test.ts
git commit -m "feat(city): leisure-biased wandering and bike/boat speed in the character FSM"
```

---

### Task 4: OfficeState builds the city nav

**Files:** Modify `webview-ui/src/office/engine/officeState.ts` (imports; fields near :60; constructor :108-117; `rebuildFromLayout` :121-128; `update` :1114).

- [ ] **Step 1: Implement**

Add the import:

```ts
import { buildAreaKindGrid, leisureTilesOf } from './cityRules.js';
```

and extend the characters import to `import { type CityNav, createCharacter, updateCharacter } from './characters.js';`.

Add a field after `walkableTiles`:

```ts
/** City-theme navigation (area kinds + leisure tiles), rebuilt with the layout. */
cityNav: CityNav;
```

Add a private helper inside the class (next to `relocateCharacterToWalkable`):

```ts
  private buildCityNav(): CityNav {
    const kinds = buildAreaKindGrid(this.layout);
    return {
      kinds,
      cols: this.layout.cols,
      leisureTiles: leisureTilesOf(this.walkableTiles, kinds, this.layout.cols),
    };
  }
```

In the constructor, after `this.walkableTiles = getWalkableTiles(...)`, add `this.cityNav = this.buildCityNav();`. Do the same in `rebuildFromLayout` right after its `this.walkableTiles = ...` line.

In `update`, pass it to the FSM:

```ts
        updateCharacter(
          ch,
          dt,
          this.walkableTiles,
          this.seats,
          this.tileMap,
          this.blockedTiles,
          this.cityNav,
        ),
```

- [ ] **Step 2: Run the full webview suite (regression)**

Run: `npm run test:webview`
Expected: all previous 86 tests + 13 new pass. Layouts without kinds produce an all-null grid and an empty leisure list, so the old behaviour is unchanged.

- [ ] **Step 3: Commit**

```bash
git add webview-ui/src/office/engine/officeState.ts
git commit -m "feat(city): derive city nav from the layout and feed it to the FSM"
```

---

### Task 5: Area kind round-trip and editor action (TDD)

**Files:** Modify `webview-ui/src/office/editor/editorActions.ts` (after `updateAreaColor` :336-343). Test `webview-ui/test/areaKind.test.ts`.

- [ ] **Step 1: Write the failing test**

```ts
import assert from 'node:assert/strict';

import { test } from 'vitest';

import { updateAreaKind } from '../src/office/editor/editorActions.js';
import {
  migrateLayoutColors,
  serializeLayout,
  deserializeLayout,
} from '../src/office/layout/layoutSerializer.js';
import type { OfficeLayout } from '../src/office/types.js';
import { TileType } from '../src/office/types.js';

function base(): OfficeLayout {
  return {
    version: 1,
    cols: 2,
    rows: 1,
    tiles: [TileType.FLOOR_1, TileType.FLOOR_1],
    furniture: [],
    tileColors: [null, null],
    layoutRevision: 1,
    areas: [{ label: 'Cafe', color: '#ffffff' }],
    areaTiles: ['Cafe', null],
    backdrop: { id: 'hudson', horizonRow: 3 },
  };
}

test('updateAreaKind sets, changes and clears an Area kind, and is a no-op for unknown labels', () => {
  const a = updateAreaKind(base(), 'Cafe', 'leisure');
  assert.equal(a.areas?.[0].kind, 'leisure');
  const b = updateAreaKind(a, 'Cafe', undefined);
  assert.equal(b.areas?.[0].kind, undefined);
  const same = base();
  assert.equal(updateAreaKind(same, 'Nope', 'work'), same);
});

test('kind and backdrop survive serialize → deserialize → migrate', () => {
  const withKind = updateAreaKind(base(), 'Cafe', 'ferry');
  const round = migrateLayoutColors(deserializeLayout(serializeLayout(withKind))!);
  assert.equal(round.areas?.[0].kind, 'ferry');
  assert.deepEqual(round.backdrop, { id: 'hudson', horizonRow: 3 });
});
```

- [ ] **Step 2: Run to confirm failure**

Run: `cd webview-ui && npx vitest run test/areaKind.test.ts`
Expected: FAIL — `updateAreaKind` is not exported. (If the serializer drops unknown keys, the second test also fails; then add `backdrop` to whatever key list `serializeLayout` uses.)

- [ ] **Step 3: Implement**

In `editorActions.ts`, add `AreaKind` to the type import from `'../types.js'`, then after `updateAreaColor`:

```ts
/** Set or clear (kind = undefined) an Area's purpose. Returns the same object when nothing changes. */
export function updateAreaKind(
  layout: OfficeLayout,
  label: string,
  kind: AreaKind | undefined,
): OfficeLayout {
  const existing = layout.areas ?? [];
  const idx = existing.findIndex((a) => a.label === label);
  if (idx === -1) return layout;
  if (existing[idx].kind === kind) return layout;
  const areas = existing.map((a, i) => {
    if (i !== idx) return a;
    const { kind: _old, ...rest } = a;
    return kind ? { ...rest, kind } : rest;
  });
  return { ...layout, areas };
}
```

- [ ] **Step 4: Run tests**

Run: `cd webview-ui && npx vitest run test/areaKind.test.ts`
Expected: 2 passed.

- [ ] **Step 5: Commit**

```bash
git add webview-ui/src/office/editor/editorActions.ts webview-ui/test/areaKind.test.ts
git commit -m "feat(city): updateAreaKind editor action; kind and backdrop round-trip"
```

---

### Task 6: Kind picker on Area cards

**Files:** Modify `webview-ui/src/hooks/useEditorActions.ts` (interface :98, handler after :324, return object), `webview-ui/src/office/editor/EditorToolbar.tsx` (props :82, destructure :127, card usage :450, `AreaCard` props + JSX), `webview-ui/src/App.tsx:422`, `webview-ui/src/constants.ts`.

- [ ] **Step 1: Hook**

In `useEditorActions.ts`, add `updateAreaKind` to the `editorActions.js` import and `AreaKind` to the types import. In the `EditorActions` interface, after `handleAreaColorChange: ...;` add:

```ts
  handleAreaKindChange: (label: string, kind: AreaKind | undefined) => void;
```

After the `handleAreaColorChange` callback add:

```ts
const handleAreaKindChange = useCallback(
  (label: string, kind: AreaKind | undefined) => {
    const os = getOfficeState();
    const layout = os.getLayout();
    const next = updateAreaKind(layout, label, kind);
    if (next !== layout) {
      applyEdit(next);
    }
  },
  [getOfficeState, applyEdit],
);
```

and add `handleAreaKindChange,` to the returned object next to `handleAreaColorChange`.

- [ ] **Step 2: Toolbar**

In `constants.ts` (Areas section) add:

```ts
/** Kind picker options on Area cards ('' = no kind). */
export const AREA_KIND_OPTIONS = [
  { value: '', label: 'Folder area' },
  { value: 'work', label: 'Work' },
  { value: 'leisure', label: 'Leisure' },
  { value: 'bikeLane', label: 'Bike lane' },
  { value: 'ferry', label: 'Ferry lane' },
] as const;
```

In `EditorToolbar.tsx`:

- Add the prop `onAreaKindChange: (label: string, kind: AreaKind | undefined) => void;` after `onAreaColorChange` in the props interface.
- Destructure it.
- Pass `onKindChange={(k) => onAreaKindChange(area.label, k)}` to `<AreaCard>`.
- In `AreaCard`'s props add `onKindChange: (kind: AreaKind | undefined) => void;` (destructured).
- Insert this as the last child inside the card's root `<div>`:

```tsx
<select
  aria-label={`Kind of area ${area.label}`}
  value={area.kind ?? ''}
  onClick={(e) => e.stopPropagation()}
  onChange={(e) => onKindChange((e.target.value || undefined) as AreaKind | undefined)}
  className="text-xs py-2 px-4 bg-bg border-2 border-border rounded-none text-text"
>
  {AREA_KIND_OPTIONS.map((o) => (
    <option key={o.value} value={o.value}>
      {o.label}
    </option>
  ))}
</select>
```

Import `AREA_KIND_OPTIONS` from `'../../constants.js'` and `AreaKind` as a type.

In `App.tsx` next to `onAreaColorChange={editor.handleAreaColorChange}` add `onAreaKindChange={editor.handleAreaKindChange}`.

- [ ] **Step 3: Typecheck + lint**

Run: `npm run check-types && npm run lint`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add webview-ui/src/hooks/useEditorActions.ts webview-ui/src/office/editor/EditorToolbar.tsx webview-ui/src/App.tsx webview-ui/src/constants.ts
git commit -m "feat(city): kind picker on Area cards"
```

---

### Task 7: Placeholder backdrop asset + registry

**Files:** Create `scripts/art/backdrop-hudson.cjs`, `webview-ui/src/assets/backdrops/hudson.png` (generated), `webview-ui/src/office/backdrops.ts`.

- [ ] **Step 1: Generator script**

Create `scripts/art/backdrop-hudson.cjs`. It draws a 960×160 dusk sky with a low NJ skyline on the left and a taller NYC skyline on the right, with lit windows, using pngjs, and writes `webview-ui/src/assets/backdrops/hudson.png`. Generic towers only, no logos.

```js
#!/usr/bin/env node
// Generates the placeholder Hudson skyline backdrop (960x160) for the city theme.
// Generic towers only: no real company logos or signage.
const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');

const W = 960;
const H = 160;
const png = new PNG({ width: W, height: H });
const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
function rect(x, y, w, h, color) {
  const [r, g, b] = hex(color);
  for (let j = Math.max(0, y); j < Math.min(H, y + h); j++)
    for (let i = Math.max(0, x); i < Math.min(W, x + w); i++) {
      const k = (j * W + i) * 4;
      png.data[k] = r;
      png.data[k + 1] = g;
      png.data[k + 2] = b;
      png.data[k + 3] = 255;
    }
}
const sky = [
  '#232046',
  '#2e2752',
  '#3d2e5c',
  '#523466',
  '#6c3c6c',
  '#8a466f',
  '#a8536f',
  '#c4646c',
  '#db7a68',
  '#ec9466',
];
sky.forEach((c, i) => rect(0, i * 16, W, 16, c));
let seed = 7;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
function tower(x, top, w, body, lit) {
  rect(x, top, w, H - top, body);
  for (let y = top + 3; y < H - 3; y += 4)
    for (let i = x + 2; i < x + w - 1; i += 3) if (rnd() > 0.3) rect(i, y, 1, 2, lit);
}
for (let x = 0; x < 360;) {
  const w = 12 + Math.floor(rnd() * 12);
  tower(x, 96 + Math.floor(rnd() * 40), w, '#2a2442', '#f5d48a');
  x += w + 2;
}
for (let x = 420; x < W;) {
  const w = 14 + Math.floor(rnd() * 12);
  tower(x, 40 + Math.floor(rnd() * 70), w, '#1d1934', '#ffe2a0');
  x += w + 2;
}
for (let y = 6; y < H; y++) {
  const w = 6 + Math.floor((y - 6) * 0.15);
  rect(700 - (w >> 1), y, w, 1, '#221e3d');
}
const out = path.join(__dirname, '../../webview-ui/src/assets/backdrops/hudson.png');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, PNG.sync.write(png));
console.log('wrote', path.relative(process.cwd(), out));
```

Run: `node scripts/art/backdrop-hudson.cjs`
Expected: `wrote webview-ui/src/assets/backdrops/hudson.png`.

- [ ] **Step 2: Registry + loader**

Create `webview-ui/src/office/backdrops.ts`:

```ts
/**
 * Bundled skyline backdrops, keyed by `OfficeLayout.backdrop.id`. Vite turns
 * `new URL(..., import.meta.url)` into an emitted asset URL relative to the
 * bundle, which resolves under the webview resource root in VS Code (allowed
 * by `img-src ${cspSource}`) and under 'self' in standalone. The image is only
 * ever drawn, never read back, so a cross-origin resource URL is fine.
 */
const BACKDROP_URLS: Record<string, string> = {
  hudson: new URL('../assets/backdrops/hudson.png', import.meta.url).href,
};

const cache = new Map<string, HTMLImageElement>();

/** Loaded image for a backdrop id, or null while loading / unknown id / no DOM. */
export function getBackdropImage(id: string | undefined): HTMLImageElement | null {
  if (!id || typeof Image === 'undefined') return null;
  const url = BACKDROP_URLS[id];
  if (!url) return null;
  let img = cache.get(id);
  if (!img) {
    img = new Image();
    img.src = url;
    cache.set(id, img);
  }
  return img.complete && img.naturalWidth > 0 ? img : null;
}
```

- [ ] **Step 3: Build check**

Run: `npm run build:webview && ls dist/webview/assets | grep -i hudson`
Expected: an emitted `hudson-<hash>.png`.

- [ ] **Step 4: Commit**

```bash
git add scripts/art/backdrop-hudson.cjs webview-ui/src/assets/backdrops/hudson.png webview-ui/src/office/backdrops.ts
git commit -m "feat(city): placeholder Hudson skyline backdrop and loader"
```

---

### Task 8: Renderer — water, skyline, island sides, travel overlays

**Files:** Create `webview-ui/src/office/sprites/travelSprites.ts`. Modify `webview-ui/src/office/engine/renderer.ts` (`renderFrame` :885-925, `renderScene` character block :390-460, `renderAreaLabels` :238-296), `webview-ui/src/office/components/OfficeCanvas.tsx:276-296`.

- [ ] **Step 1: Placeholder travel sprites**

Create `webview-ui/src/office/sprites/travelSprites.ts`:

```ts
/**
 * Placeholder travel overlays drawn with characters on bike-lane / ferry tiles.
 * Drawn on top of the character's lower body, anchored bottom-centre like the
 * character sprite. Replaced by final art in Phase 2.
 */
import type { SpriteData } from '../types.js';

const _ = '';
const K = '#0d0a18'; // outline
const T = '#4b4b55'; // tyre
const R = '#e2533d'; // frame
const W = '#f3efe3'; // hull
const D = '#c0392b'; // hull stripe
const A = '#a9c4ee'; // wake

/** 16×10 bike, side view. */
export const BIKE_SPRITE: SpriteData = [
  [_, _, _, _, _, _, _, _, _, _, _, K, K, K, _, _],
  [_, _, _, _, _, R, R, R, R, R, R, R, _, _, _, _],
  [_, _, _, _, R, _, _, _, _, _, R, _, _, _, _, _],
  [_, _, K, K, R, K, _, _, _, K, R, K, K, _, _, _],
  [_, K, T, T, R, T, K, _, K, T, R, T, T, K, _, _],
  [K, T, _, _, R, R, R, R, R, R, R, _, _, T, K, _],
  [K, T, _, _, _, _, T, K, K, T, _, _, _, T, K, _],
  [_, K, T, T, T, T, K, _, _, K, T, T, T, K, _, _],
  [_, _, K, K, K, K, _, _, _, _, K, K, K, _, _, _],
  [_, _, _, _, _, _, _, _, _, _, _, _, _, _, _, _],
];

/** 20×8 rowboat hull with wake. */
export const BOAT_SPRITE: SpriteData = [
  [_, K, K, K, K, K, K, K, K, K, K, K, K, K, K, K, K, K, _, _],
  [_, K, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, K, K, _],
  [_, K, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, W, K, _],
  [_, _, K, D, D, D, D, D, D, D, D, D, D, D, D, D, D, D, K, _],
  [_, _, _, K, D, D, D, D, D, D, D, D, D, D, D, D, D, K, _, _],
  [_, _, _, _, K, K, K, K, K, K, K, K, K, K, K, K, K, _, _, _],
  [A, A, _, A, A, _, _, _, _, _, _, _, _, _, _, _, A, A, _, A],
  [_, A, A, _, _, _, _, _, _, _, _, _, _, _, _, _, _, A, A, _],
];
```

- [ ] **Step 2: Character overlay in `renderScene`**

Import at the top of `renderer.ts`:

```ts
import { BIKE_SPRITE, BOAT_SPRITE } from '../sprites/travelSprites.js';
```

In `renderScene`, inside the character loop, change the final `drawables.push({ zY: charZY, draw: ... })` so the overlay draws immediately after the character:

```ts
const travelSprite =
  ch.travelMode === 'bike' ? BIKE_SPRITE : ch.travelMode === 'boat' ? BOAT_SPRITE : null;
const travelCached = travelSprite ? getCachedSprite(travelSprite, zoom) : null;
const travelX = travelCached ? Math.round(offsetX + ch.x * zoom - travelCached.width / 2) : 0;
const travelY = travelCached
  ? Math.round(offsetY + ch.y * zoom - travelCached.height + 2 * zoom)
  : 0;

drawables.push({
  zY: charZY,
  draw: (c) => {
    if (alpha !== 1) {
      c.save();
      c.globalAlpha = alpha;
    }
    c.drawImage(cached, drawX, drawY);
    if (travelCached) c.drawImage(travelCached, travelX, travelY);
    if (alpha !== 1) c.restore();
  },
});
```

- [ ] **Step 3: Backdrop + island sides in `renderFrame`**

Add constant imports to `renderer.ts`: `BACKDROP_PARALLAX, BACKDROP_SKY_COLOR, BACKDROP_WATER_COLOR, ISLAND_SHADOW_COLOR, ISLAND_SHADOW_PX, ISLAND_SIDE_COLOR, ISLAND_SIDE_DARK_COLOR, ISLAND_SIDE_PX`. Also import `isIslandEdgeTile` from `'./cityRules.js'` and `AreaKind` as a type.

Add before `renderFrame`:

```ts
/** Skyline backdrop passed to renderFrame when the layout names one. */
export interface BackdropRenderState {
  image: HTMLImageElement | null;
  horizonRow: number;
  areaKinds: Array<AreaKind | null>;
}

/** Water fill + skyline image, drawn before the tile grid. */
function renderBackdrop(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  backdrop: BackdropRenderState,
  offsetX: number,
  offsetY: number,
  zoom: number,
  cols: number,
): void {
  const horizonY = offsetY + backdrop.horizonRow * TILE_SIZE * zoom;
  ctx.fillStyle = BACKDROP_SKY_COLOR;
  ctx.fillRect(0, 0, canvasWidth, Math.max(0, horizonY));
  ctx.fillStyle = BACKDROP_WATER_COLOR;
  ctx.fillRect(0, Math.max(0, horizonY), canvasWidth, canvasHeight);
  const img = backdrop.image;
  if (!img) return;
  const w = img.naturalWidth * zoom;
  const h = img.naturalHeight * zoom;
  const mapCenterX = offsetX + (cols * TILE_SIZE * zoom) / 2;
  const x = Math.round(
    canvasWidth / 2 + (mapCenterX - canvasWidth / 2) * BACKDROP_PARALLAX - w / 2,
  );
  const prevSmoothing = ctx.imageSmoothingEnabled;
  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(img, x, Math.round(horizonY - h), w, h);
  ctx.imageSmoothingEnabled = prevSmoothing;
}

/** Earth side + water shadow under every ground tile that borders water to the south. */
function renderIslandSides(
  ctx: CanvasRenderingContext2D,
  tileMap: TileTypeVal[][],
  areaKinds: Array<AreaKind | null>,
  offsetX: number,
  offsetY: number,
  zoom: number,
): void {
  const s = TILE_SIZE * zoom;
  const side = ISLAND_SIDE_PX * zoom;
  const shadow = ISLAND_SHADOW_PX * zoom;
  for (let r = 0; r < tileMap.length; r++) {
    for (let c = 0; c < tileMap[r].length; c++) {
      if (!isIslandEdgeTile(tileMap, areaKinds, c, r)) continue;
      const x = offsetX + c * s;
      const y = offsetY + (r + 1) * s;
      ctx.fillStyle = ISLAND_SHADOW_COLOR;
      ctx.fillRect(x + zoom * 2, y + side, s, shadow);
      ctx.fillStyle = ISLAND_SIDE_COLOR;
      ctx.fillRect(x, y, s, side);
      ctx.fillStyle = ISLAND_SIDE_DARK_COLOR;
      ctx.fillRect(x, y + side - zoom, s, zoom);
    }
  }
}
```

Add a trailing parameter to `renderFrame`: `backdrop?: BackdropRenderState,`. Then:

- Right after `const { offsetX, offsetY } = mapOffset(...)` insert:

```ts
if (backdrop) {
  renderBackdrop(ctx, canvasWidth, canvasHeight, backdrop, offsetX, offsetY, zoom, cols);
}
```

- Right after `renderTileGrid(...)` insert:

```ts
if (backdrop) {
  renderIslandSides(ctx, tileMap, backdrop.areaKinds, offsetX, offsetY, zoom);
}
```

- [ ] **Step 4: Hide lane labels**

In `renderAreaLabels`, inside the `for (const [label, acc] of centroids)` loop, first line:

```ts
const kind = areas.find((a) => a.label === label)?.kind;
if (kind === 'bikeLane' || kind === 'ferry') continue;
```

- [ ] **Step 5: Wire `OfficeCanvas`**

In `OfficeCanvas.tsx` import `getBackdropImage` from `'../backdrops.js'`. In the `renderFrame(...)` call, add after `officeState.pets,`:

```ts
          layout.backdrop
            ? {
                image: getBackdropImage(layout.backdrop.id),
                horizonRow: layout.backdrop.horizonRow,
                areaKinds: officeState.cityNav.kinds,
              }
            : undefined,
```

- [ ] **Step 6: Verify**

Run: `npm run check-types && npm run lint && npm run test:webview`
Expected: exit 0 / all pass.

- [ ] **Step 7: Commit**

```bash
git add webview-ui/src/office/sprites/travelSprites.ts webview-ui/src/office/engine/renderer.ts webview-ui/src/office/components/OfficeCanvas.tsx
git commit -m "feat(city): render water, skyline, island sides and bike/boat overlays"
```

---

### Task 9: Placeholder city layout (importable)

**Files:** Create `scripts/art/city-layout.cjs` and the generated `webview-ui/public/assets/layouts/hudson-city-preview.json`.

The layout uses only existing assets: floors are colourised `FLOOR_1`; work stations are `DESK_FRONT` + `PC_FRONT_OFF` + `CUSHIONED_BENCH`; decor is `PLANT`, `LARGE_PLANT`, `COFFEE`, `SOFA_FRONT`. The workstation pattern is copied from the default office: desk at (c, r), PC at (c+1, r), bench at (c+1, r+2).

- [ ] **Step 1: Generator**

Create `scripts/art/city-layout.cjs`:

```js
#!/usr/bin/env node
// Generates the importable placeholder Hudson Hex City layout (Phase 1).
// Five stepped-hex islands on VOID water, a bike-lane bridge, a ferry lane,
// typed Areas, and a backdrop. Uses only the existing bundled furniture.
const fs = require('fs');
const path = require('path');

const COLS = 76;
const ROWS = 44;
const VOID = 255;
const FLOOR = 1;
const tiles = new Array(COLS * ROWS).fill(VOID);
const tileColors = new Array(COLS * ROWS).fill(null);
const areaTiles = new Array(COLS * ROWS).fill(null);
const furniture = [];
let uidN = 0;
const idx = (c, r) => r * COLS + c;
const GRASS = { h: 100, s: 45, b: -10, c: 0 };
const PLAZA = { h: 40, s: 10, b: 15, c: 0 };
const WOOD = { h: 30, s: 45, b: -25, c: 0 };
const WATER = { h: 220, s: 55, b: -35, c: 0 };

function paint(c, r, color, area) {
  if (c < 0 || r < 0 || c >= COLS || r >= ROWS) return;
  tiles[idx(c, r)] = FLOOR;
  tileColors[idx(c, r)] = color;
  if (area !== undefined) areaTiles[idx(c, r)] = area;
}
/** Stepped hex: 18 wide at the middle, narrowing 1 tile per edge row. */
function hex(cx, cy, area) {
  for (let dr = -6; dr <= 5; dr++) {
    const inset = Math.max(0, Math.abs(dr + 0.5) - 3.5) | 0;
    for (let dc = -9 + inset; dc < 9 - inset; dc++) paint(cx + dc, cy + dr, GRASS, area);
  }
}
function place(type, col, row) {
  furniture.push({ uid: `city-${++uidN}`, type, col, row });
}
function workstation(c, r) {
  for (let dc = -1; dc <= 3; dc++)
    for (let dr = -1; dr <= 3; dr++) {
      if (areaTiles[idx(c + dc, r + dr)] !== null) tileColors[idx(c + dc, r + dr)] = PLAZA;
    }
  place('DESK_FRONT', c, r);
  place('PC_FRONT_OFF', c + 1, r);
  place('CUSHIONED_BENCH', c + 1, r + 2);
}

// Islands (centre col, centre row)
const H = {
  lofts: [12, 12, 'Waterfront Lofts'],
  gym: [12, 32, 'Riverside Gym'],
  plaza: [44, 12, 'Midtown Plaza'],
  cafe: [64, 12, 'Corner Cafe'],
  arcade: [54, 32, 'Neon Arcade'],
};
for (const [cx, cy, label] of Object.values(H)) hex(cx, cy, label);

// Same-side sidewalks (plain walkable, no area)
for (let r = 18; r <= 26; r++) {
  paint(11, r, PLAZA, null);
  paint(12, r, PLAZA, null);
}
for (let c = 52; c <= 56; c++) {
  paint(c, 12, PLAZA, null);
  paint(c, 13, PLAZA, null);
}
for (let r = 18; r <= 26; r++) {
  paint(54, r, PLAZA, null);
  paint(55, r, PLAZA, null);
}

// Bike-lane bridge between the work hexes (NJ Lofts ↔ NYC Plaza)
for (let c = 21; c <= 35; c++) {
  paint(c, 12, WOOD, 'Hudson Bridge');
  paint(c, 13, WOOD, 'Hudson Bridge');
}
// Ferry lane between the gym (NJ) and the arcade (NYC)
for (let c = 21; c <= 45; c++) {
  paint(c, 33, WATER, 'Hudson Ferry');
  paint(c, 34, WATER, 'Hudson Ferry');
}

// Work stations: 6 per work hex = 12 seats
for (const [cx, cy] of [H.lofts, H.plaza]) {
  for (const [dc, dr] of [
    [-7, -4],
    [-2, -4],
    [3, -4],
    [-7, 1],
    [-2, 1],
    [3, 1],
  ])
    workstation(cx + dc, cy + dr);
}
// Leisure decor
place('COFFEE', 62, 9);
place('COFFEE', 66, 9);
place('SOFA_FRONT', 61, 14);
place('SOFA_FRONT', 65, 14);
place('LARGE_PLANT', 6, 28);
place('PLANT', 16, 29);
place('PLANT', 18, 34);
place('PLANT', 50, 29);
place('LARGE_PLANT', 58, 28);
place('PLANT', 49, 34);

const layout = {
  version: 1,
  cols: COLS,
  rows: ROWS,
  layoutRevision: 9000,
  tiles,
  tileColors,
  furniture,
  pets: [],
  backdrop: { id: 'hudson', horizonRow: 5 },
  areas: [
    { label: 'Waterfront Lofts', color: '#4f7ac8', kind: 'work' },
    { label: 'Midtown Plaza', color: '#e2533d', kind: 'work' },
    { label: 'Corner Cafe', color: '#2f8f6f', kind: 'leisure' },
    { label: 'Riverside Gym', color: '#e0a23a', kind: 'leisure' },
    { label: 'Neon Arcade', color: '#ff3d9a', kind: 'leisure' },
    { label: 'Hudson Bridge', color: '#8b6a46', kind: 'bikeLane' },
    { label: 'Hudson Ferry', color: '#3c6fd1', kind: 'ferry' },
  ],
  areaTiles,
};
const out = path.join(__dirname, '../../webview-ui/public/assets/layouts/hudson-city-preview.json');
fs.mkdirSync(path.dirname(out), { recursive: true });
fs.writeFileSync(out, JSON.stringify(layout));
console.log(
  'wrote',
  path.relative(process.cwd(), out),
  `${COLS}x${ROWS}`,
  furniture.length,
  'items',
);
```

`layoutRevision: 9000` means an imported city survives the bundled-default reset gate, which is the same trick the e2e seeds use.

- [ ] **Step 2: Generate and sanity-check**

Run: `node scripts/art/city-layout.cjs && node -e "const l=require('./webview-ui/public/assets/layouts/hudson-city-preview.json');console.log(l.cols,l.rows,l.furniture.filter(f=>f.type==='CUSHIONED_BENCH').length,'seats')"`
Expected: `wrote … 76x44 …` then `76 44 12 seats`.

- [ ] **Step 3: Commit**

```bash
git add scripts/art/city-layout.cjs webview-ui/public/assets/layouts/hudson-city-preview.json
git commit -m "feat(city): importable placeholder Hudson Hex City layout"
```

---

### Task 10: End-to-end verification

- [ ] **Step 1: Full gate**

Run: `npm run check-types && npm run lint && npm run knip && npm run test:webview && npm run test:server && npm run build`
Expected: all pass. The only server failure allowed is the root-permission installer test.

- [ ] **Step 2: Standalone smoke in Chromium**

1. Start `node dist/cli.js` with an isolated HOME.
2. Write the city layout to `$HOME/.pixel-agents/layout.json` before starting, which is what Import does.
3. Load the tokened URL with Playwright and check:
   - zero CSP violations;
   - the canvas paints both water and skyline;
   - `window.officeState` (test hooks) reports the 76×44 layout, 12 seats, 3 leisure Areas and a non-empty `cityNav.leisureTiles`.
4. Take a screenshot.

- [ ] **Step 3: Simulated agents**

With the same server, POST hook events (`SessionStart` → `PreToolUse` → `Stop`) for two fake sessions in the standalone workspace, using the bearer token from `server.json` (`server/manual-hook-events.http` shows the shapes). Then check:

- two characters appear and sit at work seats;
- after `Stop`, within ~20 s, at least one walks to a leisure tile;
- a character crossing the bridge or ferry has `travelMode` set.

- [ ] **Step 4: Push the branch**

```bash
git push origin feat/hudson-hex-city
```

---

## Self-review

- **Spec coverage:** Engine changes 1–6 → Tasks 1–8. "Getting around" → Tasks 2, 3, 8, 9. Testing → Tasks 2, 3, 5, 10. Art (Phase 2), the layout swap and the theme tokens (Phase 3) are deliberately out of scope, as listed in the spec's delivery order. The a11y fixes (`:focus-visible`, reduced motion) belong to Phase 3 with the theme tokens.
- **Placeholders:** none. Every code step shows its code.
- **Type consistency:**
  - `CityNav { kinds, cols, leisureTiles }` is used identically in Tasks 3, 4 and 8.
  - `travelMode` is `'bike' | 'boat' | undefined` on `Character`.
  - `BackdropRenderState.areaKinds` comes from `officeState.cityNav.kinds`.
  - `updateAreaKind(layout, label, kind | undefined)` has the same signature in Tasks 5 and 6.
