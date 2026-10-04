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
