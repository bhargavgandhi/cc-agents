import assert from 'node:assert/strict';

import { test } from 'vitest';

import { AREA_DEFAULT_COLORS } from '../src/constants.js';
import { areaLabelAnchors } from '../src/office/engine/areaLabels.js';
import type { AreaDefinition } from '../src/office/types.js';

const color = AREA_DEFAULT_COLORS[0];
// 4×4 grid: "Hex" fills rows 0-2 of cols 0-1; "Lane" fills row 3; "Room" fills cols 2-3 rows 0-1.
const cols = 4;
const rows = 4;
const H = 'Hex';
const L = 'Lane';
const R = 'Room';
const areaTiles = [H, H, R, R, H, H, R, R, H, H, null, null, L, L, L, L];

test('city hexes get a sign below their lowest row; office areas keep the centroid', () => {
  const areas: AreaDefinition[] = [
    { label: H, color, kind: 'work' },
    { label: L, color, kind: 'ferry' },
    { label: R, color },
  ];
  const anchors = areaLabelAnchors(areaTiles, areas, cols, rows);
  assert.deepEqual(
    anchors.find((a) => a.label === H),
    { label: H, style: 'sign', x: 1, y: 3 },
  );
  assert.deepEqual(
    anchors.find((a) => a.label === R),
    { label: R, style: 'centroid', x: 3, y: 1 },
  );
});

test('lane areas (bike lane, ferry) get no label', () => {
  const areas: AreaDefinition[] = [
    { label: H, color, kind: 'leisure' },
    { label: L, color, kind: 'bikeLane' },
    { label: R, color, kind: 'ferry' },
  ];
  assert.deepEqual(
    areaLabelAnchors(areaTiles, areas, cols, rows).map((a) => a.label),
    [H],
  );
});

test('no areas or no tiles means no labels', () => {
  assert.deepEqual(areaLabelAnchors(undefined, [], cols, rows), []);
  assert.deepEqual(areaLabelAnchors(areaTiles, [], cols, rows), []);
});
