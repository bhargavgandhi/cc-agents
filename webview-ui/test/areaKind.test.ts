import assert from 'node:assert/strict';

import { test } from 'vitest';

import { AREA_DEFAULT_COLORS } from '../src/constants.js';
import { updateAreaKind } from '../src/office/editor/editorActions.js';
import {
  deserializeLayout,
  migrateLayoutColors,
  serializeLayout,
} from '../src/office/layout/layoutSerializer.js';
import type { OfficeLayout } from '../src/office/types.js';
import { TileType } from '../src/office/types.js';

const AREA_COLOR = AREA_DEFAULT_COLORS[0];

function base(): OfficeLayout {
  return {
    version: 1,
    cols: 2,
    rows: 1,
    tiles: [TileType.FLOOR_1, TileType.FLOOR_1],
    furniture: [],
    tileColors: [null, null],
    layoutRevision: 1,
    areas: [{ label: 'Cafe', color: AREA_COLOR }],
    areaTiles: ['Cafe', null],
    backdrop: { id: 'hudson', horizonRow: 3 },
  };
}

test('updateAreaKind sets, changes and clears an Area kind, and is a no-op for unknown labels', () => {
  const a = updateAreaKind(base(), 'Cafe', 'leisure');
  assert.equal(a.areas?.[0].kind, 'leisure');
  const b = updateAreaKind(a, 'Cafe', undefined);
  assert.equal(b.areas?.[0].kind, undefined);
  assert.equal('kind' in (b.areas?.[0] ?? {}), false);
  const same = base();
  assert.equal(updateAreaKind(same, 'Nope', 'work'), same);
});

test('kind and backdrop survive serialize → deserialize → migrate', () => {
  const withKind = updateAreaKind(base(), 'Cafe', 'ferry');
  const parsed = deserializeLayout(serializeLayout(withKind));
  assert.ok(parsed);
  const round = migrateLayoutColors(parsed);
  assert.equal(round.areas?.[0].kind, 'ferry');
  assert.deepEqual(round.backdrop, { id: 'hudson', horizonRow: 3 });
});
